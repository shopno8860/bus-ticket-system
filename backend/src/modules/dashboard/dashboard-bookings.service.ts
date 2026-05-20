import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingSeatStatus,
  BookingStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { TenantScopeService } from '../../common/scoping/tenant-scope.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdminBookingDto } from '../admin-bookings/dto/create-admin-booking.dto';

@Injectable()
export class DashboardBookingsService {
  private readonly logger = new Logger(DashboardBookingsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async createManualBooking(
    dto: CreateAdminBookingDto,
    user: AuthenticatedUser,
  ) {
    const now = new Date();

    try {
      return await this.prismaService.$transaction(
        async (tx) => {
          const trip = await tx.trip.findUnique({
            where: { id: dto.tripId },
            select: {
              id: true,
              busId: true,
              price: true,
              departureTime: true,
              operatorId: true,
              status: true,
              bus: { select: { id: true } },
            },
          });

          if (!trip) {
            throw new NotFoundException('Trip not found');
          }

          if (trip.status !== 'SCHEDULED') {
            throw new BadRequestException('Trip is not available for booking');
          }

          this.tenantScope.assertResourceOwnership(user, trip.operatorId);

          const requestedSeatIds = dto.seatIds;

          const seats = await tx.seat.findMany({
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

          const reservedSeat = await tx.bookingSeat.findFirst({
            where: {
              tripId: dto.tripId,
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

          const activeLockedSeat = await tx.bookingSeat.findFirst({
            where: {
              tripId: dto.tripId,
              seatId: { in: requestedSeatIds },
              status: BookingSeatStatus.LOCKED,
              lockExpiresAt: { gt: now },
            },
            select: { seatId: true },
          });

          if (activeLockedSeat) {
            throw new ConflictException(
              `Seat is currently locked by another user: ${activeLockedSeat.seatId}`,
            );
          }

          const bookingReference =
            await this.generateUniqueBookingReference(tx);

          const rawSeatTotal = new Prisma.Decimal(trip.price).mul(
            requestedSeatIds.length,
          );

          let discountType: string | null = null;
          let discountValue: Prisma.Decimal | null = null;
          let discountAmt = new Prisma.Decimal(0);

          if (
            dto.discountType &&
            dto.discountValue !== undefined &&
            dto.discountValue > 0
          ) {
            discountType = dto.discountType;
            discountValue = new Prisma.Decimal(dto.discountValue);

            if (discountType === 'PERCENTAGE') {
              if (discountValue.gt(100)) {
                throw new BadRequestException(
                  'Percentage discount cannot exceed 100%',
                );
              }
              discountAmt = rawSeatTotal.mul(discountValue).div(100);
            } else {
              discountAmt = discountValue;
            }

            if (discountAmt.gt(rawSeatTotal)) {
              throw new BadRequestException(
                'Discount amount cannot exceed the total fare',
              );
            }
          }

          const finalAmt = rawSeatTotal.sub(discountAmt);
          const bookingSource =
            user.role === UserRole.ADMIN ? 'ADMIN_BOOKING' : 'STAFF_BOOKING';

          const booking = await tx.booking.create({
            data: {
              bookingReference,
              userId: user.sub,
              tripId: dto.tripId,
              operatorId: trip.operatorId,
              passengerName: dto.passengerName,
              passengerPhone: dto.passengerPhone,
              totalAmount: rawSeatTotal,
              discountType,
              discountValue,
              discountAmount: discountAmt.gt(0) ? discountAmt : null,
              finalAmount: finalAmt,
              status: BookingStatus.CONFIRMED,
              bookingSource,
            },
          });

          for (const seatId of requestedSeatIds) {
            await tx.bookingSeat.upsert({
              where: {
                tripId_seatId: {
                  tripId: dto.tripId,
                  seatId,
                },
              },
              update: {
                status: BookingSeatStatus.RESERVED,
                bookingId: booking.id,
                price: trip.price,
                lockExpiresAt: null,
              },
              create: {
                tripId: dto.tripId,
                seatId,
                price: trip.price,
                status: BookingSeatStatus.RESERVED,
                bookingId: booking.id,
              },
            });
          }

          return tx.booking.findUnique({
            where: { id: booking.id },
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
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 15000,
        },
      );
    } catch (error: unknown) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Seat was just booked. Please try again.');
      }
      throw error;
    }
  }

  private async generateUniqueBookingReference(
    transactionClient: Prisma.TransactionClient,
  ): Promise<string> {
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const bookingReference = `DSH-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
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
