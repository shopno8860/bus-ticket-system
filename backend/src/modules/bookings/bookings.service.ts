import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Booking,
  BookingSeatStatus,
  BookingStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminBookingsFilterDto } from './dto/admin-bookings-filter.dto';
import { ConfirmBookingDto } from './dto/confirm-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

const paymentSafeSelect = {
  id: true,
  bookingId: true,
  userId: true,
  amount: true,
  method: true,
  status: true,
  refundAmount: true,
  refundStatus: true,
  transactionId: true,
  createdAt: true,
} satisfies Prisma.PaymentSelect;

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
      console.log('Confirming booking for trip:', confirmBookingDto.tripId, 'seats:', confirmBookingDto.seatIds);

      const trip = await transactionClient.trip.findUnique({
        where: { id: confirmBookingDto.tripId },
        select: { 
          id: true, 
          busId: true, 
          price: true,
          bus: { select: { busType: true } }
        },
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

      console.log('Found valid seats count:', seats.length);

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

      console.log('Active locked seats count:', activeLockedSeats.length);

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
      
      // Calculate total amount including platform fees and insurance (Per seat)
      const seatCount = requestedSeatIds.length;
      const seatTotal = new Prisma.Decimal(trip.price).mul(seatCount);
      const serviceCharge = 50 * seatCount;
      const insurance = 20 * seatCount;
      const totalAmount = seatTotal.add(serviceCharge).add(insurance);

      console.log('Attempting to create Booking with ref:', bookingReference);

      const booking = await transactionClient.booking.create({
        data: {
          bookingReference,
          userId: confirmBookingDto.userId,
          tripId: confirmBookingDto.tripId,
          passengerName: confirmBookingDto.passengerName,
          passengerPhone: confirmBookingDto.passengerPhone,
          totalAmount,
          status: BookingStatus.PENDING, // Start as PENDING
        },
      });

      console.log('Booking created successfully, ID:', booking.id);

      // Link seats to booking but keep them LOCKED (expiry still applies)
      const updatedSeatResult = await transactionClient.bookingSeat.updateMany({
        where: {
          id: { in: activeLockedSeats.map((bookingSeat) => bookingSeat.id) },
          status: BookingSeatStatus.LOCKED,
          lockExpiresAt: { gt: now },
        },
        data: {
          bookingId: booking.id,
        },
      });

      console.log('Updated bookingId for seats. Count:', updatedSeatResult.count);

      if (updatedSeatResult.count !== requestedSeatIds.length) {
        throw new ConflictException(
          'Some seats are no longer lockable for confirmation',
        );
      }

      return booking;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async findOne(id: string) {
    const booking = await this.prismaService.booking.findUnique({
      where: { id },
      include: {
        trip: {
          include: {
            route: true,
            bus: true,
          },
        },
        bookingSeats: {
          include: {
            seat: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: paymentSafeSelect,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async findMyBookings(userId: string) {
    return this.prismaService.booking.findMany({
      where: {
        userId,
      },
      include: {
        trip: {
          include: {
            route: true,
            bus: true,
          },
        },
        bookingSeats: {
          include: {
            seat: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: paymentSafeSelect,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
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

  async cancel(bookingId: string, userId: string): Promise<any> {
    const now = new Date();

    return this.prismaService.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          trip: true,
          payments: {
            where: { status: PaymentStatus.SUCCESS },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: paymentSafeSelect,
          },
        },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.userId !== userId) {
        throw new ForbiddenException(
          'You are not authorized to cancel this booking',
        );
      }

      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new ConflictException('Only confirmed bookings can be cancelled');
      }

      const departureTime = new Date(booking.trip.departureTime);
      const diffInHours =
        (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 2) {
        throw new BadRequestException(
          'Cancellations are not allowed within 2 hours of departure',
        );
      }

      let refundPercentage = 0;
      if (diffInHours >= 24) {
        refundPercentage = 0.9;
      } else if (diffInHours >= 6) {
        refundPercentage = 0.5;
      } else if (diffInHours >= 2) {
        refundPercentage = 0.25;
      }

      const totalAmount = new Prisma.Decimal(booking.totalAmount);
      const refundAmount = totalAmount.mul(refundPercentage);

      // Update Booking
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: now,
          refundAmount: refundAmount,
          cancelReason: 'Cancelled by user',
          cancelledBy: userId,
        },
        include: {
          trip: {
            include: {
              route: true,
              bus: true,
            },
          },
          bookingSeats: {
            include: {
              seat: true,
            },
          },
          payments: {
            select: paymentSafeSelect,
          },
        },
      });

      // Update Payment
      if (booking.payments.length > 0) {
        await tx.payment.update({
          where: { id: booking.payments[0].id },
          data: {
            refundAmount: refundAmount,
            refundStatus: 'PROCESSED',
            status: PaymentStatus.REFUNDED,
          },
        });
      }

      // Delete bookingSeats to free them
      await tx.bookingSeat.deleteMany({
        where: { bookingId: bookingId },
      });

      return {
        message: 'Booking cancelled successfully',
        refundAmount: refundAmount.toNumber(),
        booking: updatedBooking,
      };
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
