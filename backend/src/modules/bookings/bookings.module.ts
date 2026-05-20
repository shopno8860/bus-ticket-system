import { Module } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { SeatSyncModule } from '../seat-sync/seat-sync.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { BookingsController } from './bookings.controller';
import { SeatLockCleanupService } from './seat-lock-cleanup.service';
import { BookingPaymentExpiryService } from './booking-payment-expiry.service';
import { BookingsService } from './bookings.service';
import { TicketPdfService } from './ticket-pdf.service';

@Module({
  imports: [PrismaModule, NotificationsModule, SeatSyncModule],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    RolesGuard,
    SeatLockCleanupService,
    BookingPaymentExpiryService,
    TicketPdfService,
  ],
  exports: [BookingsService, TicketPdfService],
})
export class BookingsModule {}
