import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BookingsService } from './bookings.service';

@Injectable()
export class BookingPaymentExpiryService {
  private readonly logger = new Logger(BookingPaymentExpiryService.name);

  constructor(private readonly bookingsService: BookingsService) {}

  @Cron('*/30 * * * * *')
  async expirePendingBookings(): Promise<void> {
    try {
      const count = await this.bookingsService.expireStalePendingBookings();
      if (count > 0) {
        this.logger.log(`Marked unpaid bookings as EXPIRED: ${count}`);
      }
    } catch (error) {
      this.logger.error(`Booking payment expiry job failed: ${String(error)}`);
    }
  }
}
