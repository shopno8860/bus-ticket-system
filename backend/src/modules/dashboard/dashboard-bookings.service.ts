import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BookingSeatStatus,
  BookingStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { TenantScopeService } from '../../common/scoping/tenant-scope.service';
import { dashboardSeatLockMs } from '../bookings/booking-timeouts.util';
import { CreateBookingDto } from '../bookings/dto/create-booking.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdminBookingDto } from '../admin-bookings/dto/create-admin-booking.dto';
import { SeatSyncService } from '../seat-sync/seat-sync.service';

@Injectable()
export class DashboardBookingsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tenantScope: TenantScopeService,
    private readonly configService: ConfigService,
    private readonly seatSyncService: SeatSyncService,
  ) {}

  async lockSeatsForDashboard(
    dto: CreateBookingDto,
    user: AuthenticatedUser,
  ): Promise<{
    tripId: string;
    seatIds: string[];
    lockExpiresAt: Date;
  }> {
    const now = new Date();
    const lockExpiresAt = new Date(
      now.getTime() + dashboardSeatLockMs(this.configService),
    );

    try {
      const result = await this.prismaService.$transaction(
        async (transactionClient) => {
          const trip = await transactionClient.trip.findUnique({
            where: { id: dto.tripId },
            select: {
              id: true,
              busId: true,
              price: true,
              operatorId: true,
              status: true,
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
              tripId: dto.tripId,
              status: BookingSeatStatus.LOCKED,
              lockExpiresAt: { lt: now },
              bookingId: null,
            },
            data: {
              status: BookingSeatStatus.CANCELLED,
              bookingId: null,
              lockedByUserId: null,
            },
          });

          const unavailableSeat = await transactionClient.bookingSeat.findFirst(
            {
              where: {
                tripId: dto.tripId,
                seatId: { in: requestedSeatIds },
                OR: [
                  { status: BookingSeatStatus.RESERVED },
                  {
                    status: BookingSeatStatus.LOCKED,
                    lockExpiresAt: { gt: now },
                    OR: [
                      { lockedByUserId: null },
                      { lockedByUserId: { not: user.sub } },
                    ],
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
            const recycleResult =
              await transactionClient.bookingSeat.updateMany({
                where: {
                  tripId: dto.tripId,
                  seatId,
                  OR: [
                    { status: BookingSeatStatus.CANCELLED },
                    {
                      status: BookingSeatStatus.LOCKED,
                      lockExpiresAt: { lt: now },
                    },
                    {
                      status: BookingSeatStatus.LOCKED,
                      lockedByUserId: user.sub,
                    },
                  ],
                },
                data: {
                  status: BookingSeatStatus.LOCKED,
                  bookingId: null,
                  lockExpiresAt,
                  lockedByUserId: user.sub,
                  price: trip.price,
                },
              });

            if (recycleResult.count > 0) {
              continue;
            }

            try {
              await transactionClient.bookingSeat.create({
                data: {
                  tripId: dto.tripId,
                  seatId,
                  price: trip.price,
                  status: BookingSeatStatus.LOCKED,
                  lockExpiresAt,
                  lockedByUserId: user.sub,
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
            tripId: dto.tripId,
            seatIds: requestedSeatIds,
            lockExpiresAt,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 15000,
        },
      );
      await this.seatSyncService.broadcastTripSeats(result.tripId);
      return result;
    } catch (error: unknown) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('One or more seats are already booked');
      }
      throw error;
    }
  }

  async releaseSeatsForDashboard(
    dto: CreateBookingDto,
    user: AuthenticatedUser,
  ): Promise<{ released: number }> {
    const trip = await this.prismaService.trip.findUnique({
      where: { id: dto.tripId },
      select: { operatorId: true },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    this.tenantScope.assertResourceOwnership(user, trip.operatorId);

    const result = await this.prismaService.bookingSeat.updateMany({
      where: {
        tripId: dto.tripId,
        seatId: { in: dto.seatIds },
        status: BookingSeatStatus.LOCKED,
        lockedByUserId: user.sub,
        bookingId: null,
      },
      data: {
        status: BookingSeatStatus.CANCELLED,
        bookingId: null,
        lockedByUserId: null,
        lockExpiresAt: null,
      },
    });

    if (result.count > 0) {
      await this.seatSyncService.broadcastTripSeats(dto.tripId);
    }

    return { released: result.count };
  }

  /**
   * Sliding-window extension while staff completes passenger info / summary.
   * Keeps orphan LOCKED rows alive and out of cleanup until confirm or release.
   */
  async extendDashboardSeatLocks(
    dto: CreateBookingDto,
    user: AuthenticatedUser,
  ): Promise<{
    tripId: string;
    seatIds: string[];
    lockExpiresAt: Date;
    extendedCount: number;
  }> {
    const now = new Date();
    const lockExpiresAt = new Date(
      now.getTime() + dashboardSeatLockMs(this.configService),
    );

    const trip = await this.prismaService.trip.findUnique({
      where: { id: dto.tripId },
      select: { id: true, operatorId: true, status: true },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status !== 'SCHEDULED') {
      throw new BadRequestException('Trip is not available for booking');
    }

    this.tenantScope.assertResourceOwnership(user, trip.operatorId);

    const result = await this.prismaService.bookingSeat.updateMany({
      where: {
        tripId: dto.tripId,
        seatId: { in: dto.seatIds },
        status: BookingSeatStatus.LOCKED,
        lockedByUserId: user.sub,
        bookingId: null,
      },
      data: {
        lockExpiresAt,
      },
    });

    if (result.count !== dto.seatIds.length) {
      throw new ConflictException(
        'Seat hold missing or expired. Lock seats again.',
      );
    }

    await this.seatSyncService.broadcastTripSeats(dto.tripId);

    return {
      tripId: dto.tripId,
      seatIds: dto.seatIds,
      lockExpiresAt,
      extendedCount: result.count,
    };
  }

  async createManualBooking(
    dto: CreateAdminBookingDto,
    user: AuthenticatedUser,
  ) {
    const now = new Date();

    try {
      const booking = await this.prismaService.$transaction(
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

          const foreignLockedSeat = await tx.bookingSeat.findFirst({
            where: {
              tripId: dto.tripId,
              seatId: { in: requestedSeatIds },
              status: BookingSeatStatus.LOCKED,
              lockExpiresAt: { gt: now },
              OR: [
                { lockedByUserId: null },
                { lockedByUserId: { not: user.sub } },
              ],
            },
            select: { seatId: true },
          });

          if (foreignLockedSeat) {
            throw new ConflictException(
              `Seat is currently locked by another user: ${foreignLockedSeat.seatId}`,
            );
          }

          const ownLockCount = await tx.bookingSeat.count({
            where: {
              tripId: dto.tripId,
              seatId: { in: requestedSeatIds },
              status: BookingSeatStatus.LOCKED,
              lockExpiresAt: { gt: now },
              lockedByUserId: user.sub,
              bookingId: null,
            },
          });

          if (ownLockCount !== requestedSeatIds.length) {
            throw new ConflictException(
              'Seat hold missing or expired. Lock seats again.',
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
                lockedByUserId: null,
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
      await this.seatSyncService.broadcastTripSeats(dto.tripId);
      return booking;
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
