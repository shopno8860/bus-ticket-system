import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingSeatStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SeatLockCleanupService {
  private readonly logger = new Logger(SeatLockCleanupService.name);

  constructor(private readonly prismaService: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredLocks(): Promise<void> {
    const now = new Date();
    try {
      const result = await this.prismaService.bookingSeat.deleteMany({
        where: {
          status: BookingSeatStatus.LOCKED,
          lockExpiresAt: { lt: now },
        },
      });
      if (result.count > 0) {
        this.logger.log(`Expired seat locks cleaned: ${result.count}`);
      }
    } catch (error) {
      this.logger.error(`Seat lock cleanup failed: ${String(error)}`);
    }
  }
}
