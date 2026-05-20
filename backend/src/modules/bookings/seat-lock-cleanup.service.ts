import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BookingSeatStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SeatSyncService } from '../seat-sync/seat-sync.service';

@Injectable()
export class SeatLockCleanupService {
  private readonly logger = new Logger(SeatLockCleanupService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly seatSyncService: SeatSyncService,
  ) {}

  @Cron('15,45 * * * * *')
  async cleanupExpiredLocks(): Promise<void> {
    const now = new Date();
    try {
      // Only orphan pre-booking locks. PENDING booking seats are released by
      // booking payment expiry or payment failure handlers.
      const expiring = await this.prismaService.bookingSeat.findMany({
        where: {
          status: BookingSeatStatus.LOCKED,
          lockExpiresAt: { lt: now },
          bookingId: null,
        },
        select: { tripId: true },
        distinct: ['tripId'],
      });

      const result = await this.prismaService.bookingSeat.updateMany({
        where: {
          status: BookingSeatStatus.LOCKED,
          lockExpiresAt: { lt: now },
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
        this.logger.log(`Expired seat locks released: ${result.count}`);
        await this.seatSyncService.broadcastTripSeatsMany(
          expiring.map((row) => row.tripId),
        );
      }
    } catch (error) {
      this.logger.error(`Seat lock cleanup failed: ${String(error)}`);
    }
  }
}
