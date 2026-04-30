import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async notifyBookingUpdate(params: {
    userId: string;
    bookingId: string;
    status: string;
    message: string;
  }): Promise<void> {
    this.logger.log(
      `[BookingNotification] user=${params.userId} booking=${params.bookingId} status=${params.status} message=${params.message}`,
    );
  }

  async notifyRefundUpdate(params: {
    userId: string;
    refundId: string;
    status: string;
    message: string;
  }): Promise<void> {
    this.logger.log(
      `[RefundNotification] user=${params.userId} refund=${params.refundId} status=${params.status} message=${params.message}`,
    );
  }
}
