import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BookingsService } from './bookings.service';

@Injectable()
export class BookingPaymentExpiryService {
  private readonly logger = new Logger(BookingPaymentExpiryService.name);

  constructor(private readonly bookingsService: BookingsService) {}

  @Cron('0,30 * * * * *')
  /**
   * Background job: expires stale PENDING bookings whose payment window has passed.
   * প্রতি ৩০ সেকেন্ডে pending unpaid booking গুলো expire করে seats release করে দেয়।
   */
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
