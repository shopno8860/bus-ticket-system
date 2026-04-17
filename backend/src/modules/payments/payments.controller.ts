import { Body, Controller, Post } from '@nestjs/common';
import { Payment } from '@prisma/client';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async create(@Body() createPaymentDto: CreatePaymentDto): Promise<Payment> {
    return this.paymentsService.create(createPaymentDto);
  }
}
