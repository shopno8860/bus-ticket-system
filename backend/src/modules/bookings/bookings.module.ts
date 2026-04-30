import { Module } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { BookingsController } from './bookings.controller';
import { SeatLockCleanupService } from './seat-lock-cleanup.service';
import { BookingsService } from './bookings.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [BookingsController],
  providers: [BookingsService, RolesGuard, SeatLockCleanupService],
  exports: [BookingsService],
})
export class BookingsModule {}
