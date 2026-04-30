import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingSeatStatus,
  BookingStatus,
  PaymentStatus,
  Prisma,
  RefundStatus,
  Trip,
  TripStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { SearchTripsDto } from './dto/search-trips.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@Injectable()
export class TripsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createTripDto: CreateTripDto): Promise<Trip> {
    const departureDate = new Date(createTripDto.departureTime);
    const arrivalDate = new Date(createTripDto.arrivalTime);

    if (arrivalDate <= departureDate) {
      throw new BadRequestException(
        'Arrival time must be later than departure time',
      );
    }

    try {
      return await this.prismaService.trip.create({
        data: {
          busId: createTripDto.busId,
          routeId: createTripDto.routeId,
          departureTime: departureDate,
          arrivalTime: arrivalDate,
          price: new Prisma.Decimal(createTripDto.price),
        },
      });
    } catch (error: unknown) {
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

    if (searchTripsDto.date) {
      const startOfDay = new Date(searchTripsDto.date);
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
      return await this.prismaService.trip.update({
        where: { id },
        data: {
          ...(updateTripDto.busId !== undefined && { busId: updateTripDto.busId }),
          ...(updateTripDto.routeId !== undefined && { routeId: updateTripDto.routeId }),
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
          status: { not: BookingStatus.CANCELLED },
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
