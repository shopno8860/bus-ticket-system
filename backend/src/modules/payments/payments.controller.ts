import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '@prisma/client';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@Controller(['payments', 'payment'])
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  private frontendBaseUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL')?.replace(/\/$/, '') ||
      this.configService.get<string>('VITE_FRONTEND_URL')?.replace(/\/$/, '') ||
      'http://localhost:5173'
    );
  }

  private frontendSuccessUrl(bookingId: string): string {
    return `${this.frontendBaseUrl()}/payment/success?bookingId=${bookingId}`;
  }

  private frontendFailedUrl(): string {
    return `${this.frontendBaseUrl()}/payment/failed`;
  }

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
    const { tran_id } = body ?? {};
    if (!tran_id) {
      return res.redirect(this.frontendFailedUrl());
    }

    try {
      const payment = await this.paymentsService.handlePaymentSuccess(tran_id);
      return res.redirect(this.frontendSuccessUrl(payment.bookingId));
    } catch {
      return res.redirect(this.frontendFailedUrl());
    }
  }

  @Get('success')
  async successGet(
    @Query('tran_id') tranId: string | undefined,
    @Res() res: Response,
  ) {
    if (!tranId) {
      return res.redirect(this.frontendFailedUrl());
    }

    try {
      const payment = await this.paymentsService.handlePaymentSuccess(tranId);
      return res.redirect(this.frontendSuccessUrl(payment.bookingId));
    } catch {
      return res.redirect(this.frontendFailedUrl());
    }
  }

  @Post('fail')
  async fail(@Body() body: any, @Res() res: Response) {
    const { tran_id } = body ?? {};
    if (!tran_id) {
      return res.redirect(this.frontendFailedUrl());
    }

    try {
      await this.paymentsService.handlePaymentFailure(
        tran_id,
        PaymentStatus.FAILED,
      );
    } catch {
      return res.redirect(this.frontendFailedUrl());
    }
    return res.redirect(this.frontendFailedUrl());
  }

  @Get('fail')
  async failGet(@Query('tran_id') tranId: string | undefined, @Res() res: Response) {
    if (!tranId) {
      return res.redirect(this.frontendFailedUrl());
    }

    try {
      await this.paymentsService.handlePaymentFailure(tranId, PaymentStatus.FAILED);
    } catch {
      return res.redirect(this.frontendFailedUrl());
    }
    return res.redirect(this.frontendFailedUrl());
  }

  @Post('cancel')
  async cancel(@Body() body: any, @Res() res: Response) {
    const { tran_id } = body ?? {};
    if (!tran_id) {
      return res.redirect(this.frontendFailedUrl());
    }

    try {
      await this.paymentsService.handlePaymentFailure(
        tran_id,
        PaymentStatus.FAILED,
      ); // Treating cancel as fail for simplicity
    } catch {
      return res.redirect(this.frontendFailedUrl());
    }
    return res.redirect(this.frontendFailedUrl());
  }

  @Get('cancel')
  async cancelGet(
    @Query('tran_id') tranId: string | undefined,
    @Res() res: Response,
  ) {
    if (!tranId) {
      return res.redirect(this.frontendFailedUrl());
    }

    try {
      await this.paymentsService.handlePaymentFailure(tranId, PaymentStatus.FAILED);
    } catch {
      return res.redirect(this.frontendFailedUrl());
    }
    return res.redirect(this.frontendFailedUrl());
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
