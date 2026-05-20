import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { RefundsService } from './refunds.service';

/** Single-refund status lookup against SSLCommerz (owner-only). */
@ApiTags('Refund status')
@ApiBearerAuth('JWT')
@Controller('refund')
export class RefundController {
  constructor(private readonly refundsService: RefundsService) {}

  @Get('status/:refundRefId')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Refund gateway status by refund reference id' })
  getRefundStatus(
    @Param('refundRefId') refundRefId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.refundsService.getSslRefundStatusForUser(refundRefId, user.sub);
  }
}
