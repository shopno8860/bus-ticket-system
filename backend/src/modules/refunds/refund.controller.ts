import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { RefundsService } from './refunds.service';

@Controller('refund')
export class RefundController {
  constructor(private readonly refundsService: RefundsService) {}

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
}
