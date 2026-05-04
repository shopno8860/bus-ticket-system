import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BusClass, BusType, Prisma, TripStatus } from '@prisma/client';
import { BusSeederService } from '../buses/bus-seeder.service';
import { RouteSeederService } from '../routes/route-seeder.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TripGeneratorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TripGeneratorService.name);
  /** Fixed daily departures: hour (local) → bus category for that slot. */
  private readonly scheduleSlots: ReadonlyArray<{
    hour: number;
    minute: number;
    matches: (bus: { busType: BusType; busClass: BusClass }) => boolean;
  }> = [
    {
      hour: 7,
      minute: 0,
      matches: (b) => b.busType === BusType.NON_AC,
    },
    {
      hour: 10,
      minute: 0,
      matches: (b) =>
        b.busType === BusType.AC && b.busClass === BusClass.ECONOMY,
    },
    {
      hour: 15,
      minute: 0,
      matches: (b) =>
        b.busType === BusType.AC && b.busClass === BusClass.BUSINESS,
    },
    {
      hour: 19,
      minute: 0,
      matches: (b) => b.busType === BusType.NON_AC,
    },
    {
      hour: 23,
      minute: 0,
      matches: (b) => b.busType === BusType.SLEEPER,
    },
  ];
  private readonly tripDurationHours = 6;
  private readonly defaultGenerationDays = 4;
  private readonly fallbackRoutes: Prisma.RouteCreateManyInput[] = [
    { origin: 'Dhaka', destination: 'Gaibandha' },
    { origin: 'Gaibandha', destination: 'Dhaka' },
  ];
  private readonly fallbackBuses: Prisma.BusCreateManyInput[] = [
    {
      name: 'Alhamra AC Coach 1',
      operatorName: 'Alhamra',
      registrationNumber: 'AL-AC-001',
      seatCapacity: 28,
      busType: BusType.AC,
      busClass: BusClass.BUSINESS,
    },
    {
      name: 'Hanif Non-AC Coach 1',
      operatorName: 'Hanif',
      registrationNumber: 'HN-NA-001',
      seatCapacity: 40,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Orin Sleeper AC 1',
      operatorName: 'Orin',
      registrationNumber: 'OR-SL-001',
      seatCapacity: 36,
      busType: BusType.SLEEPER,
      busClass: BusClass.BUSINESS,
    },
  ];
  private readonly supportedRouteCities = new Set([
    'gaibandha',
    'rangpur',
    'bogra',
    'chittagong',
    'sylhet',
    "cox's bazar",
  ]);
  private readonly supportedOperators = new Set([
    'alhamra',
    'orin',
    'hanif',
  ]);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly routeSeederService: RouteSeederService,
    private readonly busSeederService: BusSeederService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const createdTrips = await this.createTripsForUpcomingDays(
        this.defaultGenerationDays,
      );
      this.logger.log(
        `Startup trip sync completed for next ${this.defaultGenerationDays} days. Created trips: ${createdTrips}`,
      );
    } catch (error) {
      this.logger.error(
        `Startup trip sync failed`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Removes every trip. Cascades delete bookings, booking seats, payments, and refunds.
   */
  async deleteAllTrips(): Promise<number> {
    const result = await this.prismaService.trip.deleteMany({});
    if (result.count > 0) {
      this.logger.warn(
        `Deleted ${result.count} trips (related bookings and payments removed by cascade).`,
      );
    }
    return result.count;
  }

  async seedRoutesAndBuses(): Promise<{
    routesCreated: number;
    busesCreated: number;
  }> {
    const routesCreated = await this.routeSeederService.seedRoutes();
    const busesCreated = await this.busSeederService.seedBuses();
    return { routesCreated, busesCreated };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyTrips(): Promise<{ date: string; createdTrips: number }> {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    const localDate = this.formatLocalDate(date);

    const createdTrips = await this.createTripsForDate(date);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDayTrips = await this.createTripsForDate(nextDate);
    const totalCreatedTrips = createdTrips + nextDayTrips;
    this.logger.log(
      `Daily trip generation completed for ${localDate}. Created trips: ${totalCreatedTrips}`,
    );

    return {
      date: localDate,
      createdTrips: totalCreatedTrips,
    };
  }

  async createTripsForUpcomingDays(
    numberOfDays: number,
    options?: { forceCreate?: boolean },
  ): Promise<number> {
    const safeDays = Math.max(1, Math.floor(numberOfDays));
    let totalCreated = 0;

    for (let dayOffset = 0; dayOffset < safeDays; dayOffset += 1) {
      const targetDate = new Date();
      targetDate.setHours(0, 0, 0, 0);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      totalCreated += await this.createTripsForDate(targetDate, options);
    }

    return totalCreated;
  }

  async createTripsForDate(
    date: Date,
    options?: { forceCreate?: boolean },
  ): Promise<number> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const forceCreate = options?.forceCreate ?? false;

    await this.seedRoutesAndBuses();
    await this.ensureRequiredDataExists();

    const [allRoutes, allBuses] = await Promise.all([
      this.prismaService.route.findMany({
        select: { id: true, origin: true, destination: true },
      }),
      this.prismaService.bus.findMany({
        select: { id: true, operatorName: true, busType: true, busClass: true },
      }),
    ]);
    const routes = allRoutes.filter((route) =>
      this.isSupportedRoute(route.origin, route.destination),
    );
    const buses = allBuses.filter((bus) =>
      this.supportedOperators.has(bus.operatorName.trim().toLowerCase()),
    );

    this.logger.debug(`Routes: ${routes.length}`);
    this.logger.debug(`Buses: ${buses.length}`);
    this.logger.debug(`Schedule slots: ${this.scheduleSlots.length}`);

    if (routes.length === 0 || buses.length === 0) {
      this.logger.warn(
        'Trip generation aborted because routes or buses are unavailable.',
      );
      return 0;
    }

    const dayStart = new Date(targetDate);
    const dayEnd = new Date(targetDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const tripsToCreate: any[] = [];
    this.logger.debug(
      `Trip generation loop starts for ${this.formatLocalDate(targetDate)}`,
    );

    for (const slot of this.scheduleSlots) {
      for (const route of routes) {
        const slotBuses = buses.filter(slot.matches);
        for (const bus of slotBuses) {
          const departureTime = this.buildDepartureTime(
            dayStart,
            slot.hour,
            slot.minute,
          );

          if (!forceCreate) {
            const existingTrip = await this.prismaService.trip.findFirst({
              where: {
                routeId: route.id,
                busId: bus.id,
                departureTime,
              },
              select: { id: true },
            });

            if (existingTrip) {
              continue;
            }
          }

          const arrivalTime = new Date(departureTime);
          arrivalTime.setHours(arrivalTime.getHours() + this.tripDurationHours);

          tripsToCreate.push({
            routeId: route.id,
            busId: bus.id,
            boardingPoint: route.origin,
            droppingPoint: route.destination,
            departureTime,
            arrivalTime,
            price: new Prisma.Decimal(this.getTicketPrice(bus.busType, bus.busClass)).toFixed(2),
            status: TripStatus.SCHEDULED,
          });
        }
      }
    }

    if (tripsToCreate.length === 0) {
      this.logger.log(
        `No missing trips for ${this.formatLocalDate(targetDate)}. Schedule already complete within ${dayStart.toISOString()} - ${dayEnd.toISOString()}.`,
      );
      return 0;
    }

    if (forceCreate) {
      this.logger.warn(
        `Force-create mode enabled for ${this.formatLocalDate(targetDate)}. Duplicate pre-check is skipped for test mode.`,
      );
    }

    const result = await this.prismaService.trip.createMany({
      data: tripsToCreate,
      skipDuplicates: true,
    });

    this.logger.log(
      `Created ${result.count} trips for ${this.formatLocalDate(targetDate)} across ${routes.length} routes and ${buses.length} buses`,
    );

    return result.count;
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getTicketPrice(busType: BusType, busClass: BusClass): number {
    if (busType === BusType.SLEEPER) {
      return 1400;
    }

    if (busType === BusType.NON_AC) {
      return 700;
    }

    if (busType === BusType.AC && busClass === BusClass.BUSINESS) {
      return 1000;
    }

    if (busType === BusType.AC && busClass === BusClass.ECONOMY) {
      return 800;
    }

    return 800;
  }

  private buildDepartureTime(
    dayStart: Date,
    hour: number,
    minute = 0,
  ): Date {
    const year = dayStart.getFullYear();
    const month = dayStart.getMonth();
    const day = dayStart.getDate();
    return new Date(year, month, day, hour, minute, 0, 0);
  }

  private async ensureRequiredDataExists(): Promise<void> {
    const [routeCount, busCount] = await Promise.all([
      this.prismaService.route.count(),
      this.prismaService.bus.count(),
    ]);

    if (routeCount === 0) {
      const result = await this.prismaService.route.createMany({
        data: this.fallbackRoutes,
        skipDuplicates: true,
      });
      this.logger.warn(
        `No routes found. Seeded fallback routes. Created routes: ${result.count}`,
      );
    }

    if (busCount === 0) {
      const result = await this.prismaService.bus.createMany({
        data: this.fallbackBuses,
        skipDuplicates: true,
      });
      this.logger.warn(
        `No buses found. Seeded fallback buses. Created buses: ${result.count}`,
      );
    }
  }

  private isSupportedRoute(origin: string, destination: string): boolean {
    const normalizedOrigin = origin.trim().toLowerCase();
    const normalizedDestination = destination.trim().toLowerCase();

    const isDhakaToSupported =
      normalizedOrigin === 'dhaka' &&
      this.supportedRouteCities.has(normalizedDestination);
    const isSupportedToDhaka =
      normalizedDestination === 'dhaka' &&
      this.supportedRouteCities.has(normalizedOrigin);

    return isDhakaToSupported || isSupportedToDhaka;
  }
}
