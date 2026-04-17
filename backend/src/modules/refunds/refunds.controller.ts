import { Body, Controller, Post } from '@nestjs/common';
import { Refund } from '@prisma/client';
import { RequestRefundDto } from './dto/request-refund.dto';
import { RefundsService } from './refunds.service';

@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  async requestRefund(
    @Body() requestRefundDto: RequestRefundDto,
  ): Promise<Refund> {
    return this.refundsService.requestRefund(requestRefundDto);
  }
}
