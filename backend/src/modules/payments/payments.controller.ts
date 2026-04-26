import { Body, Controller, Post, Res } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import type { Response } from 'express';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async create(@Body() createPaymentDto: CreatePaymentDto): Promise<any> {
    return this.paymentsService.create(createPaymentDto);
  }

  @Post('success')
  async success(@Body() body: any, @Res() res: Response) {
    const { tran_id } = body;
    const payment = await this.paymentsService.handlePaymentSuccess(tran_id);
    // Redirect to frontend success page with bookingId
    return res.redirect(`http://localhost:5173/payment/success?bookingId=${payment.bookingId}`);
  }

  @Post('fail')
  async fail(@Body() body: any, @Res() res: Response) {
    const { tran_id } = body;
    await this.paymentsService.handlePaymentFailure(tran_id, PaymentStatus.FAILED);
    return res.redirect('http://localhost:5173/payment/failed');
  }

  @Post('cancel')
  async cancel(@Body() body: any, @Res() res: Response) {
    const { tran_id } = body;
    await this.paymentsService.handlePaymentFailure(tran_id, PaymentStatus.FAILED); // Treating cancel as fail for simplicity
    return res.redirect('http://localhost:5173/payment/failed');
  }
}
