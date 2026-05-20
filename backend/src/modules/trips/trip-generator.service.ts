import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  BusClass,
  BusType,
  OperatorStatus,
  Prisma,
  TripStatus,
} from '@prisma/client';
import { BusSeederService } from '../buses/bus-seeder.service';
import { RouteSeederService } from '../routes/route-seeder.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TripGeneratorService {
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
  private readonly fallbackRouteDefs = [
    { origin: 'Dhaka', destination: 'Gaibandha', operatorSlug: 'alhamra' },
    { origin: 'Gaibandha', destination: 'Dhaka', operatorSlug: 'alhamra' },
  ];
  private readonly fallbackBusDefs: Array<{
    name: string;
    operatorSlug: string;
    registrationNumber: string;
    seatCapacity: number;
    busType: BusType;
    busClass: BusClass;
  }> = [
    {
      name: 'Alhamra AC Coach 1',
      operatorSlug: 'alhamra',
      registrationNumber: 'AL-AC-001',
      seatCapacity: 28,
      busType: BusType.AC,
      busClass: BusClass.BUSINESS,
    },
    {
      name: 'Hanif Non-AC Coach 1',
      operatorSlug: 'hanif',
      registrationNumber: 'HN-NA-001',
      seatCapacity: 40,
      busType: BusType.NON_AC,
      busClass: BusClass.ECONOMY,
    },
    {
      name: 'Orin Sleeper AC 1',
      operatorSlug: 'orin',
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
  private readonly supportedOperatorSlugs = new Set([
    'alhamra',
    'orin',
    'hanif',
  ]);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly routeSeederService: RouteSeederService,
    private readonly busSeederService: BusSeederService,
  ) {}

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
    await this.ensureFallbackOperators();
    const firstOperator = await this.prismaService.operator.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    const operatorId = firstOperator?.id;
    const routesCreated = await this.routeSeederService.seedRoutes(operatorId);
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

    const [allRoutes, allBuses, operators] = await Promise.all([
      this.prismaService.route.findMany({
        select: { id: true, origin: true, destination: true },
      }),
      this.prismaService.bus.findMany({
        select: { id: true, operatorId: true, busType: true, busClass: true },
      }),
      this.prismaService.operator.findMany({
        where: { slug: { in: Array.from(this.supportedOperatorSlugs) } },
        select: { id: true, slug: true },
      }),
    ]);
    const supportedOperatorIds = new Set(operators.map((o) => o.id));
    const routes = allRoutes.filter((route) =>
      this.isSupportedRoute(route.origin, route.destination),
    );
    const buses = allBuses.filter((bus) =>
      supportedOperatorIds.has(bus.operatorId),
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
            operatorId: bus.operatorId,
            boardingPoint: route.origin,
            droppingPoint: route.destination,
            departureTime,
            arrivalTime,
            price: new Prisma.Decimal(
              this.getTicketPrice(bus.busType, bus.busClass),
            ).toFixed(2),
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

  private buildDepartureTime(dayStart: Date, hour: number, minute = 0): Date {
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

    await this.ensureFallbackOperators();

    const operatorMap = new Map<string, string>();
    const operators = await this.prismaService.operator.findMany({
      where: { slug: { in: Array.from(this.supportedOperatorSlugs) } },
      select: { id: true, slug: true },
    });
    for (const op of operators) {
      operatorMap.set(op.slug, op.id);
    }

    if (routeCount === 0) {
      const fallbackRoutes = this.fallbackRouteDefs
        .filter((r) => operatorMap.has(r.operatorSlug))
        .map((r) => ({
          origin: r.origin,
          destination: r.destination,
          operatorId: operatorMap.get(r.operatorSlug)!,
        }));
      if (fallbackRoutes.length > 0) {
        const result = await this.prismaService.route.createMany({
          data: fallbackRoutes,
          skipDuplicates: true,
        });
        this.logger.warn(
          `No routes found. Seeded fallback routes. Created routes: ${result.count}`,
        );
      }
    }

    if (busCount === 0) {
      const fallbackBuses = this.fallbackBusDefs
        .filter((b) => operatorMap.has(b.operatorSlug))
        .map((b) => ({
          name: b.name,
          registrationNumber: b.registrationNumber,
          seatCapacity: b.seatCapacity,
          busType: b.busType,
          busClass: b.busClass,
          operatorId: operatorMap.get(b.operatorSlug)!,
        }));
      if (fallbackBuses.length > 0) {
        const result = await this.prismaService.bus.createMany({
          data: fallbackBuses,
          skipDuplicates: true,
        });
        this.logger.warn(
          `No buses found. Seeded fallback buses. Created buses: ${result.count}`,
        );
      }
    }
  }

  private async ensureFallbackOperators(): Promise<void> {
    for (const slug of this.supportedOperatorSlugs) {
      const existing = await this.prismaService.operator.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (existing) continue;
      await this.prismaService.operator.create({
        data: {
          companyName: slug.charAt(0).toUpperCase() + slug.slice(1),
          slug,
          status: OperatorStatus.ACTIVE,
        },
      });
      this.logger.warn(`Created fallback operator: ${slug}`);
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
