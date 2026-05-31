import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingSeatStatus, BookingStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdminBookingDto } from './dto/create-admin-booking.dto';

@Injectable()
export class AdminBookingsService {
  private readonly logger = new Logger(AdminBookingsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async createAdminBooking(dto: CreateAdminBookingDto, adminUserId: string) {
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
              routeId: true,
              bus: { select: { id: true } },
            },
          });

          if (!trip) {
            throw new NotFoundException('Trip not found');
          }

          const [boardingPoint, droppingPoint] = await Promise.all([
            tx.boardingPoint.findFirst({
              where: {
                id: dto.boardingPointId,
                operatorId: trip.operatorId,
                routeId: trip.routeId,
                isActive: true,
              },
              select: { id: true },
            }),
            tx.droppingPoint.findFirst({
              where: {
                id: dto.droppingPointId,
                operatorId: trip.operatorId,
                routeId: trip.routeId,
                isActive: true,
              },
              select: { id: true },
            }),
          ]);
          if (!boardingPoint) {
            throw new BadRequestException(
              'Invalid boarding point for the selected route',
            );
          }
          if (!droppingPoint) {
            throw new BadRequestException(
              'Invalid dropping point for the selected route',
            );
          }

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

          // Calculate discount
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
              // FIXED
              discountAmt = discountValue;
            }

            if (discountAmt.gt(rawSeatTotal)) {
              throw new BadRequestException(
                'Discount amount cannot exceed the total fare',
              );
            }
          }

          const finalAmt = rawSeatTotal.sub(discountAmt);

          const booking = await tx.booking.create({
            data: {
              bookingReference,
              userId: adminUserId,
              tripId: dto.tripId,
              operatorId: trip.operatorId,
              boardingPointId: dto.boardingPointId,
              droppingPointId: dto.droppingPointId,
              passengerName: dto.passengerName,
              passengerPhone: dto.passengerPhone,
              totalAmount: rawSeatTotal,
              discountType,
              discountValue,
              discountAmount: discountAmt.gt(0) ? discountAmt : null,
              finalAmount: finalAmt,
              status: BookingStatus.CONFIRMED,
              bookingSource: 'ADMIN_BOOKING',
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
      const bookingReference = `ADM-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
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
