import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Booking,
  BookingSeatStatus,
  BookingStatus,
  Prisma,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminBookingsFilterDto } from './dto/admin-bookings-filter.dto';
import { ConfirmBookingDto } from './dto/confirm-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createBookingDto: CreateBookingDto): Promise<{
    tripId: string;
    seatIds: string[];
    lockExpiresAt: Date;
  }> {
    const now = new Date();
    const lockExpiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    try {
      return await this.prismaService.$transaction(
        async (transactionClient) => {
          const trip = await transactionClient.trip.findUnique({
            where: { id: createBookingDto.tripId },
            select: { id: true, busId: true, price: true },
          });

          if (!trip) {
            throw new NotFoundException('Trip not found');
          }

          const requestedSeatIds = createBookingDto.seatIds;

          const seats = await transactionClient.seat.findMany({
            where: {
              id: { in: requestedSeatIds },
              busId: trip.busId,
            },
            select: { id: true },
          });

          if (seats.length !== requestedSeatIds.length) {
            throw new NotFoundException(
              'One or more seats were not found for the selected trip bus',
            );
          }

          await transactionClient.bookingSeat.deleteMany({
            where: {
              tripId: createBookingDto.tripId,
              status: BookingSeatStatus.LOCKED,
              lockExpiresAt: { lt: now },
            },
          });

          const unavailableSeat = await transactionClient.bookingSeat.findFirst(
            {
              where: {
                tripId: createBookingDto.tripId,
                seatId: { in: requestedSeatIds },
                OR: [
                  { status: BookingSeatStatus.RESERVED },
                  {
                    status: BookingSeatStatus.LOCKED,
                    lockExpiresAt: { gt: now },
                  },
                ],
              },
              select: { seatId: true },
            },
          );

          if (unavailableSeat) {
            throw new ConflictException(
              `Seat is unavailable for this trip: ${unavailableSeat.seatId}`,
            );
          }

          await transactionClient.bookingSeat.createMany({
            data: requestedSeatIds.map((seatId) => ({
              tripId: createBookingDto.tripId,
              seatId,
              price: trip.price,
              status: BookingSeatStatus.LOCKED,
              lockExpiresAt,
            })),
          });

          return {
            tripId: createBookingDto.tripId,
            seatIds: requestedSeatIds,
            lockExpiresAt,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('One or more seats are already booked');
      }
      throw error;
    }
  }

  async confirmBooking(confirmBookingDto: ConfirmBookingDto): Promise<Booking> {
    const now = new Date();

    return this.prismaService.$transaction(async (transactionClient) => {
      const trip = await transactionClient.trip.findUnique({
        where: { id: confirmBookingDto.tripId },
        select: { id: true, busId: true, price: true },
      });

      if (!trip) {
        throw new NotFoundException('Trip not found');
      }

      const requestedSeatIds = confirmBookingDto.seatIds;

      const seats = await transactionClient.seat.findMany({
        where: {
          id: { in: requestedSeatIds },
          busId: trip.busId,
        },
        select: { id: true },
      });

      if (seats.length !== requestedSeatIds.length) {
        throw new NotFoundException(
          'One or more seats were not found for the selected trip bus',
        );
      }

      await transactionClient.bookingSeat.deleteMany({
        where: {
          tripId: confirmBookingDto.tripId,
          status: BookingSeatStatus.LOCKED,
          lockExpiresAt: { lt: now },
        },
      });

      const activeLockedSeats = await transactionClient.bookingSeat.findMany({
        where: {
          tripId: confirmBookingDto.tripId,
          seatId: { in: requestedSeatIds },
          status: BookingSeatStatus.LOCKED,
          lockExpiresAt: { gt: now },
        },
        select: { id: true, seatId: true },
      });

      if (activeLockedSeats.length !== requestedSeatIds.length) {
        throw new ConflictException(
          'One or more seat locks expired or are unavailable',
        );
      }

      const reservedSeat = await transactionClient.bookingSeat.findFirst({
        where: {
          tripId: confirmBookingDto.tripId,
          seatId: { in: requestedSeatIds },
          status: BookingSeatStatus.RESERVED,
        },
        select: { seatId: true },
      });

      if (reservedSeat) {
        throw new ConflictException(
          `Seat is already reserved for this trip: ${reservedSeat.seatId}`,
        );
      }

      const bookingReference =
        await this.generateUniqueBookingReference(transactionClient);
      const totalAmount = new Prisma.Decimal(trip.price).mul(
        requestedSeatIds.length,
      );

      const booking = await transactionClient.booking.create({
        data: {
          bookingReference,
          userId: confirmBookingDto.userId,
          tripId: confirmBookingDto.tripId,
          passengerName: confirmBookingDto.passengerName,
          passengerPhone: confirmBookingDto.passengerPhone,
          totalAmount,
          status: BookingStatus.CONFIRMED,
        },
      });

      const updatedSeatResult = await transactionClient.bookingSeat.updateMany({
        where: {
          id: { in: activeLockedSeats.map((bookingSeat) => bookingSeat.id) },
          status: BookingSeatStatus.LOCKED,
          lockExpiresAt: { gt: now },
        },
        data: {
          bookingId: booking.id,
          status: BookingSeatStatus.RESERVED,
          lockExpiresAt: null,
        },
      });

      if (updatedSeatResult.count !== requestedSeatIds.length) {
        throw new ConflictException(
          'Some seats are no longer lockable for confirmation',
        );
      }

      return booking;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async findAllAdmin(filters: AdminBookingsFilterDto) {
    const where: Prisma.BookingWhereInput = {};

    if (filters.user) {
      where.userId = filters.user;
    }

    if (filters.route) {
      where.trip = {
        routeId: filters.route,
      };
    }

    if (filters.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      where.createdAt = {
        gte: startOfDay,
        lt: endOfDay,
      };
    }

    return this.prismaService.booking.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            phoneNumber: true,
          },
        },
        trip: {
          include: {
            route: true,
            bus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelByAdmin(
    bookingId: string,
    reason: string,
    adminUserId: string,
  ): Promise<Booking> {
    return this.prismaService.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.status === BookingStatus.CANCELLED) {
        throw new ConflictException('Booking is already cancelled');
      }

      await tx.bookingSeat.deleteMany({
        where: {
          bookingId,
        },
      });

      return tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason,
          cancelledBy: adminUserId,
        },
      });
    });
  }

  private async generateUniqueBookingReference(
    transactionClient: Prisma.TransactionClient,
  ): Promise<string> {
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const bookingReference = `BKG-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;

      const existingBooking = await transactionClient.booking.findUnique({
        where: { bookingReference },
        select: { id: true },
      });

      if (!existingBooking) {
        return bookingReference;
      }
    }

    throw new ConflictException(
      'Could not generate a unique booking reference. Please retry',
    );
  }
}
