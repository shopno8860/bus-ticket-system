import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BookingSeatStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SeatLockCleanupService {
  private readonly logger = new Logger(SeatLockCleanupService.name);

  constructor(private readonly prismaService: PrismaService) {}

  @Cron('15,45 * * * * *')
  async cleanupExpiredLocks(): Promise<void> {
    const now = new Date();
    try {
      // Only orphan pre-booking locks. PENDING booking seats are released by
      // booking payment expiry or payment failure handlers.
      const result = await this.prismaService.bookingSeat.updateMany({
        where: {
          status: BookingSeatStatus.LOCKED,
          lockExpiresAt: { lt: now },
          bookingId: null,
        },
        data: {
          status: BookingSeatStatus.CANCELLED,
          bookingId: null,
        },
      });
      if (result.count > 0) {
        this.logger.log(`Expired seat locks released: ${result.count}`);
      }
    } catch (error) {
      this.logger.error(`Seat lock cleanup failed: ${String(error)}`);
    }
  }
}
