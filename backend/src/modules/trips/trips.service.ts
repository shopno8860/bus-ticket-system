import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingSeatStatus,
  BusClass,
  BusType,
  BookingStatus,
  PaymentStatus,
  Prisma,
  RefundStatus,
  Trip,
  TripStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminTripsFilterDto } from './dto/admin-trips-filter.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { SearchTripsDto } from './dto/search-trips.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@Injectable()
export class TripsService {
  constructor(private readonly prismaService: PrismaService) {}

  private parsePageNumber(value: string, fallback: number): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return fallback;
    }
    return parsed;
  }

  private parseEnumList<T extends string>(
    rawValue: string | undefined,
    allowedValues: readonly T[],
  ): T[] {
    if (!rawValue) {
      return [];
    }

    const allowedSet = new Set<string>(allowedValues as readonly string[]);
    return rawValue
      .split(',')
      .map((item) => item.trim())
      .filter((item): item is T => allowedSet.has(item));
  }

  private parseLocalDate(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  async create(createTripDto: CreateTripDto): Promise<Trip> {
    const departureDate = new Date(createTripDto.departureTime);
    const arrivalDate = new Date(createTripDto.arrivalTime);

    if (arrivalDate <= departureDate) {
      throw new BadRequestException(
        'Arrival time must be later than departure time',
      );
    }

    try {
      const route = await this.prismaService.route.findUnique({
        where: { id: createTripDto.routeId },
        select: { origin: true, destination: true },
      });

      if (!route) {
        throw new NotFoundException('Invalid routeId');
      }

      return await this.prismaService.trip.create({
        data: {
          busId: createTripDto.busId,
          routeId: createTripDto.routeId,
          boardingPoint: route.origin,
          droppingPoint: route.destination,
          departureTime: departureDate,
          arrivalTime: arrivalDate,
          price: new Prisma.Decimal(createTripDto.price),
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Trip already exists for this route, bus, and departure time',
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new NotFoundException('Invalid busId or routeId');
      }
      throw error;
    }
  }

  async findAll(
    searchTripsDto: SearchTripsDto,
  ): Promise<Array<Trip & { availableSeats: number }>> {
    const where: Prisma.TripWhereInput = {};
    const routeFilters: Prisma.RouteWhereInput = {};
    const now = new Date();

    if (searchTripsDto.origin) {
      routeFilters.origin = {
        contains: searchTripsDto.origin,
        mode: 'insensitive',
      };
    }

    if (searchTripsDto.destination) {
      routeFilters.destination = {
        contains: searchTripsDto.destination,
        mode: 'insensitive',
      };
    }

    if (Object.keys(routeFilters).length > 0) {
      where.route = { is: routeFilters };
    }

    const busTypes = this.parseEnumList(searchTripsDto.busType, [
      BusType.AC,
      BusType.NON_AC,
      BusType.SLEEPER,
    ]);
    const busClasses = this.parseEnumList(searchTripsDto.busClass, [
      BusClass.BUSINESS,
      BusClass.ECONOMY,
    ]);

    if (busTypes.length > 0 || busClasses.length > 0) {
      where.bus = {
        is: {
          ...(busTypes.length > 0 && { busType: { in: busTypes } }),
          ...(busClasses.length > 0 && { busClass: { in: busClasses } }),
        },
      };
    }

    if (searchTripsDto.boardingPoint) {
      where.boardingPoint = {
        contains: searchTripsDto.boardingPoint,
        mode: 'insensitive',
      };
    }

    if (searchTripsDto.droppingPoint) {
      where.droppingPoint = {
        contains: searchTripsDto.droppingPoint,
        mode: 'insensitive',
      };
    }

    const minPrice = Number(searchTripsDto.minPrice);
    const maxPrice = Number(searchTripsDto.maxPrice);
    const hasMinPrice = Number.isFinite(minPrice);
    const hasMaxPrice = Number.isFinite(maxPrice);
    if (hasMinPrice || hasMaxPrice) {
      where.price = {
        ...(hasMinPrice && { gte: minPrice }),
        ...(hasMaxPrice && { lte: maxPrice }),
      };
    }

    if (searchTripsDto.date) {
      const startOfDay = this.parseLocalDate(searchTripsDto.date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      if (startOfDay < todayStart) {
        return [];
      }

      if (startOfDay.getTime() === todayStart.getTime()) {
        where.departureTime = {
          gte: now,
          lt: endOfDay,
        };
      } else {
        where.departureTime = {
          gte: startOfDay,
          lt: endOfDay,
        };
      }
    } else {
      where.departureTime = {
        gte: now,
      };
    }

    const trips = await this.prismaService.trip.findMany({
      where,
      include: {
        bus: true,
        route: true,
      },
      orderBy: { departureTime: 'asc' },
    });

    // Dynamic availability:
    // - count seats that are already RESERVED
    // - count seats that are LOCKED and not expired yet (prevents double booking)
    const tripIds = trips.map((t) => t.id);

    const bookedSeatCounts = await this.prismaService.bookingSeat.groupBy({
      by: ['tripId'],
      where: {
        tripId: { in: tripIds },
        OR: [
          { status: BookingSeatStatus.RESERVED },
          {
            status: BookingSeatStatus.LOCKED,
            lockExpiresAt: { gt: now },
          },
        ],
      },
      _count: { _all: true },
    });

    const countByTripId = new Map<string, number>(
      bookedSeatCounts.map((row) => [row.tripId, row._count._all]),
    );

    return trips.map((trip) => {
      const reservedOrLocked = countByTripId.get(trip.id) ?? 0;
      const totalCapacity = trip.bus.seatCapacity;
      const availableSeats = Math.max(0, totalCapacity - reservedOrLocked);
      return { ...trip, availableSeats };
    });
  }

  async findAllAdmin(
    filters: AdminTripsFilterDto,
  ): Promise<{
    items: Array<Trip & { availableSeats: number }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const now = new Date();
    const page = this.parsePageNumber(filters.page ?? '1', 1);
    const limit = Math.min(this.parsePageNumber(filters.limit ?? '10', 10), 100);
    const skip = (page - 1) * limit;
    const where: Prisma.TripWhereInput = {};

    if (filters.route?.trim()) {
      const routeText = filters.route.trim();
      where.route = {
        is: {
          OR: [
            { origin: { contains: routeText, mode: 'insensitive' } },
            { destination: { contains: routeText, mode: 'insensitive' } },
          ],
        },
      };
    }

    if (filters.departureDate) {
      const startOfDay = this.parseLocalDate(filters.departureDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      where.departureTime = {
        gte: startOfDay,
        lt: endOfDay,
      };
    }

    if (filters.busOperator?.trim()) {
      where.bus = {
        is: {
          operatorName: {
            contains: filters.busOperator.trim(),
            mode: 'insensitive',
          },
        },
      };
    }

    if (filters.status) {
      const status = filters.status as TripStatus;
      if (Object.values(TripStatus).includes(status)) {
        where.status = status;
      }
    }

    const [total, trips] = await this.prismaService.$transaction([
      this.prismaService.trip.count({ where }),
      this.prismaService.trip.findMany({
        where,
        include: {
          bus: true,
          route: true,
        },
        orderBy: { departureTime: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    const tripIds = trips.map((trip) => trip.id);
    const seatCounts =
      tripIds.length > 0
        ? await this.prismaService.bookingSeat.groupBy({
            by: ['tripId'],
            where: {
              tripId: { in: tripIds },
              OR: [
                { status: BookingSeatStatus.RESERVED },
                { status: BookingSeatStatus.LOCKED, lockExpiresAt: { gt: now } },
              ],
            },
            _count: { _all: true },
          })
        : [];

    const countByTripId = new Map<string, number>(
      seatCounts.map((row) => [row.tripId, row._count._all]),
    );
    const items = trips.map((trip) => {
      const reservedOrLocked = countByTripId.get(trip.id) ?? 0;
      return {
        ...trip,
        availableSeats: Math.max(0, trip.bus.seatCapacity - reservedOrLocked),
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneById(id: string): Promise<Trip> {
    const trip = await this.prismaService.trip.findUnique({
      where: { id },
    });

    if (!trip) {
      throw new NotFoundException(`Trip not found for id: ${id}`);
    }

    return trip;
  }

  async findOneWithSeats(
    id: string,
  ): Promise<Trip & { availableSeats: number }> {
    const now = new Date();
    const trip = await this.prismaService.trip.findUnique({
      where: { id },
      include: {
        bus: {
          include: {
            seats: {
              orderBy: [{ rowNumber: 'asc' }, { columnNumber: 'asc' }],
            },
          },
        },
        route: true,
        bookingSeats: {
          where: {
            OR: [
              { status: BookingSeatStatus.RESERVED },
              {
                status: BookingSeatStatus.LOCKED,
                lockExpiresAt: { gt: now },
              },
            ],
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException(`Trip not found for id: ${id}`);
    }

    const reservedOrLocked = trip.bookingSeats.length;
    const totalCapacity = trip.bus.seatCapacity;
    const availableSeats = Math.max(0, totalCapacity - reservedOrLocked);

    return {
      ...trip,
      availableSeats,
    };
  }

  async update(id: string, updateTripDto: UpdateTripDto): Promise<Trip> {
    const existingTrip = await this.findOneById(id);
    if (existingTrip.status === TripStatus.CANCELLED) {
      throw new ConflictException('Cancelled trips cannot be updated');
    }

    const departureDate = updateTripDto.departureTime
      ? new Date(updateTripDto.departureTime)
      : existingTrip.departureTime;
    const arrivalDate = updateTripDto.arrivalTime
      ? new Date(updateTripDto.arrivalTime)
      : existingTrip.arrivalTime;

    if (arrivalDate <= departureDate) {
      throw new BadRequestException(
        'Arrival time must be later than departure time',
      );
    }

    try {
      let nextBoardingPoint = existingTrip.boardingPoint;
      let nextDroppingPoint = existingTrip.droppingPoint;

      if (updateTripDto.routeId !== undefined) {
        const route = await this.prismaService.route.findUnique({
          where: { id: updateTripDto.routeId },
          select: { origin: true, destination: true },
        });

        if (!route) {
          throw new NotFoundException('Invalid routeId');
        }

        nextBoardingPoint = route.origin;
        nextDroppingPoint = route.destination;
      }

      return await this.prismaService.trip.update({
        where: { id },
        data: {
          ...(updateTripDto.busId !== undefined && {
            busId: updateTripDto.busId,
          }),
          ...(updateTripDto.routeId !== undefined && {
            routeId: updateTripDto.routeId,
          }),
          boardingPoint: nextBoardingPoint,
          droppingPoint: nextDroppingPoint,
          departureTime: departureDate,
          arrivalTime: arrivalDate,
          ...(updateTripDto.price !== undefined && {
            price: new Prisma.Decimal(updateTripDto.price),
          }),
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Trip already exists for this route, bus, and departure time',
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new NotFoundException('Invalid busId or routeId');
      }
      throw error;
    }
  }

  async cancel(id: string, reason: string, adminUserId: string): Promise<Trip> {
    const trip = await this.findOneById(id);
    if (trip.status === TripStatus.CANCELLED) {
      throw new ConflictException('Trip is already cancelled');
    }

    return this.prismaService.$transaction(async (tx) => {
      const cancelledTrip = await tx.trip.update({
        where: { id },
        data: {
          status: TripStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason,
          cancelledBy: adminUserId,
        },
      });

      const bookings = await tx.booking.findMany({
        where: {
          tripId: id,
          status: {
            in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
          },
        },
        include: {
          payments: {
            where: { status: PaymentStatus.SUCCESS },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
            },
          },
        },
      });

      if (bookings.length > 0) {
        const bookingIds = bookings.map((booking) => booking.id);
        await tx.booking.updateMany({
          where: { id: { in: bookingIds } },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelReason: `Trip cancelled: ${reason}`,
            cancelledBy: adminUserId,
          },
        });

        await tx.bookingSeat.deleteMany({
          where: {
            bookingId: { in: bookingIds },
          },
        });
      }

      const refundsData = bookings
        .filter((booking) => booking.payments.length > 0)
        .map((booking) => {
          const payment = booking.payments[0];
          return {
            bookingId: booking.id,
            paymentId: payment.id,
            userId: booking.userId,
            reason: `Auto refund request due to trip cancellation`,
            amount: booking.totalAmount,
            status: RefundStatus.PENDING,
          };
        });

      if (refundsData.length > 0) {
        await tx.refund.createMany({
          data: refundsData,
        });
      }

      return cancelledTrip;
    });
  }
}
