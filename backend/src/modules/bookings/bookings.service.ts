import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Booking,
  BookingSeatStatus,
  BookingStatus,
  BusType,
  PaymentStatus,
  Prisma,
  RefundStatus,
  UserRole,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import {
  canCancelBooking,
  getHoursBeforeDeparture,
  getRefundPercentage,
} from '../../common/policies/cancellation-policy';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { paymentWindowMs, seatLockMs } from './booking-timeouts.util';
import { AdminBookingsFilterDto } from './dto/admin-bookings-filter.dto';
import { ConfirmBookingDto } from './dto/confirm-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

/**
 * Booking domain service: temporary seat locks, PENDING→CONFIRMED flow, payment windows,
 * passenger cancellation (pending refund), admin cancellation, and expiry of unpaid holds.
 */

/** Max seats one user may commit (PENDING or CONFIRMED) per purchase calendar day (Asia/Dhaka), by `booking.createdAt`. */
const MAX_TICKET_SEATS_PER_USER_PER_PURCHASE_DAY = 4;

const DAILY_TICKET_LIMIT_MESSAGE =
  'You already booked 4 ticket please come back next day to purchase ticket';

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
  valId: true,
  bankTranId: true,
  createdAt: true,
} satisfies Prisma.PaymentSelect;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  /** `start` inclusive and `end` exclusive for the calendar day in Asia/Dhaka (UTC instants). */
  private getDhakaCalendarDayUtcBounds(reference: Date): {
    start: Date;
    end: Date;
  } {
    const ymd = reference.toLocaleDateString('en-CA', {
      timeZone: 'Asia/Dhaka',
    });
    const start = new Date(`${ymd}T00:00:00+06:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  /** Lock seats for a trip; creates a PENDING booking and returns lock expiry. */
  async create(createBookingDto: CreateBookingDto): Promise<{
    tripId: string;
    seatIds: string[];
    lockExpiresAt: Date;
  }> {
    const now = new Date();
    const lockExpiresAt = new Date(now.getTime() + seatLockMs(this.configService));

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

          await transactionClient.bookingSeat.updateMany({
            where: {
              tripId: createBookingDto.tripId,
              status: BookingSeatStatus.LOCKED,
              lockExpiresAt: { lt: now },
            },
            data: {
              status: BookingSeatStatus.CANCELLED,
              bookingId: null,
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

          for (const seatId of requestedSeatIds) {
            const recycleResult = await transactionClient.bookingSeat.updateMany({
              where: {
                tripId: createBookingDto.tripId,
                seatId,
                OR: [
                  { status: BookingSeatStatus.CANCELLED },
                  {
                    status: BookingSeatStatus.LOCKED,
                    lockExpiresAt: { lt: now },
                  },
                ],
              },
              data: {
                status: BookingSeatStatus.LOCKED,
                bookingId: null,
                lockExpiresAt,
                price: trip.price,
              },
            });

            if (recycleResult.count > 0) {
              continue;
            }

            try {
              await transactionClient.bookingSeat.create({
                data: {
                  tripId: createBookingDto.tripId,
                  seatId,
                  price: trip.price,
                  status: BookingSeatStatus.LOCKED,
                  lockExpiresAt,
                },
              });
            } catch (createError: unknown) {
              if (
                createError instanceof Prisma.PrismaClientKnownRequestError &&
                createError.code === 'P2002'
              ) {
                throw new ConflictException(
                  `Seat is unavailable for this trip: ${seatId}`,
                );
              }
              throw createError;
            }
          }

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

  /** Attach authenticated user to a lock, enforce limits, set payment deadline. */
  async confirmBooking(
    confirmBookingDto: ConfirmBookingDto,
    userId: string,
  ): Promise<Booking> {
    const now = new Date();
    try {
      return await this.prismaService.$transaction(
        async (transactionClient) => {
          console.log(
            'Confirming booking for trip:',
            confirmBookingDto.tripId,
            'seats:',
            confirmBookingDto.seatIds,
          );

          const trip = await transactionClient.trip.findUnique({
            where: { id: confirmBookingDto.tripId },
            select: {
              id: true,
              busId: true,
              price: true,
              departureTime: true,
              bus: { select: { busType: true } },
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

          await transactionClient.bookingSeat.updateMany({
            where: {
              tripId: confirmBookingDto.tripId,
              status: BookingSeatStatus.LOCKED,
              lockExpiresAt: { lt: now },
            },
            data: {
              status: BookingSeatStatus.CANCELLED,
              bookingId: null,
            },
          });

          const activeLockedSeats =
            await transactionClient.bookingSeat.findMany({
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

          const { start: purchaseDayStart, end: purchaseDayEnd } =
            this.getDhakaCalendarDayUtcBounds(now);
          const seatsAlreadyBookedToday = await transactionClient.bookingSeat.count({
            where: {
              bookingId: { not: null },
              booking: {
                userId,
                status: {
                  in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
                },
                createdAt: { gte: purchaseDayStart, lt: purchaseDayEnd },
              },
            },
          });

          if (
            seatsAlreadyBookedToday + requestedSeatIds.length >
            MAX_TICKET_SEATS_PER_USER_PER_PURCHASE_DAY
          ) {
            throw new BadRequestException(DAILY_TICKET_LIMIT_MESSAGE);
          }

          const bookingReference =
            await this.generateUniqueBookingReference(transactionClient);

          const paymentDeadline = new Date(
            now.getTime() + paymentWindowMs(this.configService),
          );

          // Calculate total amount including platform fees and insurance (Per seat)
          const seatCount = requestedSeatIds.length;
          const seatTotal = new Prisma.Decimal(trip.price).mul(seatCount);
          const platformFeePerSeat =
            trip.bus.busType === BusType.AC ? 70 : 40;
          const serviceCharge = platformFeePerSeat * seatCount;
          const insurance = 10 * seatCount;
          const totalAmount = seatTotal.add(serviceCharge).add(insurance);

          console.log(
            'Attempting to create Booking with ref:',
            bookingReference,
          );

          const booking = await transactionClient.booking.create({
            data: {
              bookingReference,
              userId,
              tripId: confirmBookingDto.tripId,
              passengerName: confirmBookingDto.passengerName,
              passengerPhone: confirmBookingDto.passengerPhone,
              totalAmount,
              status: BookingStatus.PENDING, // Start as PENDING
              paymentExpiresAt: paymentDeadline,
            },
          });

          console.log('Booking created successfully, ID:', booking.id);

          // Link seats to booking but keep them LOCKED (expiry still applies)
          const updatedSeatResult =
            await transactionClient.bookingSeat.updateMany({
              where: {
                id: {
                  in: activeLockedSeats.map((bookingSeat) => bookingSeat.id),
                },
                status: BookingSeatStatus.LOCKED,
                lockExpiresAt: { gt: now },
              },
              data: {
                bookingId: booking.id,
                lockExpiresAt: paymentDeadline,
              },
            });

          console.log(
            'Updated bookingId for seats. Count:',
            updatedSeatResult.count,
          );

          if (updatedSeatResult.count !== requestedSeatIds.length) {
            throw new ConflictException(
              'Some seats are no longer lockable for confirmation',
            );
          }

          return booking;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Seat was just booked by another user. Please refresh and try again.',
        );
      }
      throw error;
    }
  }

  /** Booking detail with trip, seats, latest payment; owner or ADMIN. */
  async findOne(id: string, requesterUserId: string, requesterRole: UserRole) {
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
    if (
      requesterRole !== UserRole.ADMIN &&
      booking.userId !== requesterUserId
    ) {
      throw new ForbiddenException(
        'You are not authorized to view this booking',
      );
    }

    return booking;
  }

  /** All bookings for the signed-in user, newest first. */
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
        refunds: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            amount: true,
            createdAt: true,
            processedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /** Admin booking table with optional filters (user, route, status, dates). */
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
        refunds: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            amount: true,
            reason: true,
            createdAt: true,
            processedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Passenger cancellation: creates PENDING refund; ticket stays confirmed until admin approves. */
  async cancel(bookingId: string, userId: string): Promise<any> {
    const now = new Date();

    return this.prismaService
      .$transaction(async (tx) => {
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
          throw new ConflictException(
            'Only confirmed bookings can be cancelled',
          );
        }

        const existingRefundRequest = await tx.refund.findFirst({
          where: {
            bookingId,
            status: { in: [RefundStatus.PENDING, RefundStatus.APPROVED] },
          },
          select: { id: true, status: true },
        });

        if (existingRefundRequest) {
          throw new ConflictException(
            'A refund request already exists for this booking',
          );
        }

        const departureTime = new Date(booking.trip.departureTime);
        const diffInHours = getHoursBeforeDeparture(now, departureTime);

        if (!canCancelBooking(diffInHours)) {
          throw new BadRequestException(
            'Cancellations are not allowed within 2 hours of departure',
          );
        }

        const refundPercentage = getRefundPercentage(diffInHours);

        const totalAmount = new Prisma.Decimal(booking.totalAmount);
        const refundAmount = totalAmount.mul(refundPercentage);
        const latestSuccessfulPayment = booking.payments[0];

        if (!latestSuccessfulPayment) {
          throw new ConflictException(
            'No successful payment found for this booking refund',
          );
        }

        const createdRefundRequest = await tx.refund.create({
          data: {
            bookingId: booking.id,
            paymentId: latestSuccessfulPayment.id,
            userId: booking.userId,
            reason: 'Cancellation requested by user (pending admin approval)',
            amount: refundAmount,
            status: RefundStatus.PENDING,
          },
        });

        const bookingAfter = await tx.booking.findUnique({
          where: { id: bookingId },
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

        if (!bookingAfter) {
          throw new NotFoundException('Booking not found');
        }

        return {
          message:
            'Cancellation request sent to admin. Your ticket stays active until the request is approved.',
          refundAmount: refundAmount.toNumber(),
          refundRequest: {
            id: createdRefundRequest.id,
            status: createdRefundRequest.status,
          },
          booking: bookingAfter,
        };
      })
      .then(async (result) => {
        await this.notificationsService.notifyBookingUpdate({
          userId,
          bookingId,
          status: BookingStatus.CONFIRMED,
          message:
            'Your cancellation request was submitted. An admin will review it.',
        });
        await this.notificationsService.notifyRefundUpdate({
          userId,
          refundId: result.refundRequest.id,
          status: RefundStatus.PENDING,
          message:
            'A cancellation / refund request is pending admin approval.',
        });
        return result;
      });
  }

  /** Immediate cancel by admin; clears seats and notifies passenger. */
  async cancelByAdmin(
    bookingId: string,
    reason: string,
    adminUserId: string,
  ): Promise<Booking> {
    return this.prismaService
      .$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
        });

        if (!booking) {
          throw new NotFoundException('Booking not found');
        }

        if (
          booking.status === BookingStatus.CANCELLED ||
          booking.status === BookingStatus.EXPIRED
        ) {
          throw new ConflictException('Booking is already cancelled or expired');
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
      })
      .then(async (cancelledBooking) => {
        await this.notificationsService.notifyBookingUpdate({
          userId: cancelledBooking.userId,
          bookingId: cancelledBooking.id,
          status: BookingStatus.CANCELLED,
          message: 'Your booking was cancelled by admin.',
        });
        return cancelledBooking;
      });
  }

  /**
   * Marks PENDING bookings as EXPIRED when paymentExpiresAt has passed, fails
   * open payments, and releases seat rows.
   */
  async expireStalePendingBookings(): Promise<number> {
    const now = new Date();

    const expiredRows = await this.prismaService.$transaction(async (tx) => {
      const stale = await tx.booking.findMany({
        where: {
          status: BookingStatus.PENDING,
          paymentExpiresAt: { not: null, lt: now },
        },
        select: { id: true, userId: true },
      });

      if (stale.length === 0) {
        return [];
      }

      const ids = stale.map((b) => b.id);

      await tx.bookingSeat.updateMany({
        where: { bookingId: { in: ids } },
        data: {
          status: BookingSeatStatus.CANCELLED,
          bookingId: null,
          lockExpiresAt: null,
        },
      });

      await tx.payment.updateMany({
        where: {
          bookingId: { in: ids },
          status: PaymentStatus.PENDING,
        },
        data: { status: PaymentStatus.FAILED },
      });

      await tx.booking.updateMany({
        where: { id: { in: ids } },
        data: {
          status: BookingStatus.EXPIRED,
          cancelReason: 'Payment not completed before the time limit',
          paymentExpiresAt: null,
        },
      });

      return stale;
    });

    for (const row of expiredRows) {
      await this.notificationsService.notifyBookingUpdate({
        userId: row.userId,
        bookingId: row.id,
        status: BookingStatus.EXPIRED,
        message:
          'Your unpaid booking expired and the seats were released. Please select seats again.',
      });
    }

    return expiredRows.length;
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
