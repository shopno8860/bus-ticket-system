import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Refund } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { RequestRefundDto } from './dto/request-refund.dto';
import { RefundsService } from './refunds.service';

/** Authenticated passenger refund request. */
@ApiTags('Refunds')
@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Submit refund request for a booking/payment' })
  async requestRefund(
    @Body() requestRefundDto: RequestRefundDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Refund> {
    return this.refundsService.requestRefund(requestRefundDto, user.sub);
  }
}
