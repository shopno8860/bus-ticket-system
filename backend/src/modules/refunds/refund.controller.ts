import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { InitiateBookingRefundDto } from './dto/initiate-booking-refund.dto';
import { RefundsService } from './refunds.service';

@Controller('refund')
export class RefundController {
  constructor(private readonly refundsService: RefundsService) {}

  /** Static segment must be registered before `:bookingId` so `status` is not captured as an id. */
  @Get('status/:refundRefId')
  @UseGuards(AccessTokenGuard)
  getRefundStatus(
    @Param('refundRefId') refundRefId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.refundsService.getSslRefundStatusForUser(
      refundRefId,
      user.sub,
    );
  }

  @Post(':bookingId')
  @UseGuards(AccessTokenGuard)
  initiateForBooking(
    @Param('bookingId') bookingId: string,
    @Body() dto: InitiateBookingRefundDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.refundsService.initiateSslRefundForBooking(
      bookingId,
      user.sub,
      dto.reason,
    );
  }
}
