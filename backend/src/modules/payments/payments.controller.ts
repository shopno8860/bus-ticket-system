import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<any> {
    return this.paymentsService.create(createPaymentDto, user.sub);
  }

  @Post('success')
  async success(@Body() body: any, @Res() res: Response) {
    const { tran_id } = body;
    const payment = await this.paymentsService.handlePaymentSuccess(tran_id);
    // Redirect to frontend success page with bookingId
    return res.redirect(
      `http://localhost:5173/payment/success?bookingId=${payment.bookingId}`,
    );
  }

  @Post('fail')
  async fail(@Body() body: any, @Res() res: Response) {
    const { tran_id } = body;
    await this.paymentsService.handlePaymentFailure(
      tran_id,
      PaymentStatus.FAILED,
    );
    return res.redirect('http://localhost:5173/payment/failed');
  }

  @Post('cancel')
  async cancel(@Body() body: any, @Res() res: Response) {
    const { tran_id } = body;
    await this.paymentsService.handlePaymentFailure(
      tran_id,
      PaymentStatus.FAILED,
    ); // Treating cancel as fail for simplicity
    return res.redirect('http://localhost:5173/payment/failed');
  }

  @Post(':bookingId/send-confirmation-email')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(FileInterceptor('ticketPdf'))
  async sendConfirmationEmail(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() ticketPdf?: { buffer?: Buffer; path?: string },
  ): Promise<{ message: string }> {
    if (!ticketPdf?.buffer?.length && !ticketPdf?.path) {
      throw new BadRequestException('ticketPdf file is required');
    }

    await this.paymentsService.sendConfirmationEmailWithExistingTicket({
      bookingId,
      requesterUserId: user.sub,
      ticketPdfBuffer: ticketPdf?.buffer,
      ticketPdfPath: ticketPdf?.path,
    });

    return { message: 'Booking confirmation email sent.' };
  }
}
