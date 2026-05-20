import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '@prisma/client';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

/** SSLCommerz session creation, gateway callbacks (redirect), and ticket email upload. */
@ApiTags('Payments')
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
    return `${this.frontendBaseUrl()}/payment/success?bookingId=${encodeURIComponent(bookingId)}`;
  }

  /** SSL fail/cancel/success-error: land on seat selection (or trip search) with query hints for toasts. */
  private frontendSeatSelectionUrl(
    tripId?: string | null,
    search?: Record<string, string | undefined>,
  ): string {
    const origin = this.frontendBaseUrl();
    const path = tripId ? `/seats/${tripId}` : '/trips';
    const url = new URL(path, `${origin}/`);
    if (search) {
      for (const [k, v] of Object.entries(search)) {
        if (v != null && String(v).trim() !== '') {
          url.searchParams.set(k, String(v));
        }
      }
    }
    return url.toString();
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Start SSLCommerz payment',
    description:
      'Returns gateway redirect URL and session data for the booking.',
  })
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<any> {
    return this.paymentsService.create(createPaymentDto, user.sub);
  }

  @Post('success')
  @ApiOperation({
    summary: 'SSLCommerz success callback (POST)',
    description:
      'Server-side redirect to frontend success or seat selection with error query.',
  })
  async success(@Body() body: any, @Res() res: Response) {
    const { tran_id } = body ?? {};
    if (!tran_id) {
      return res.redirect(
        this.frontendSeatSelectionUrl(null, { payment: 'no_session' }),
      );
    }

    try {
      const payment = await this.paymentsService.handlePaymentSuccess(
        tran_id,
        body && typeof body === 'object'
          ? (body as Record<string, unknown>)
          : undefined,
      );
      return res.redirect(this.frontendSuccessUrl(payment.bookingId));
    } catch (err) {
      const tripId = await this.paymentsService.getTripIdByTranId(tran_id);
      const msg = err instanceof BadRequestException ? String(err.message) : '';
      const payment =
        err instanceof BadRequestException &&
        /expired|payment window/i.test(msg)
          ? 'time_expired'
          : 'failed';
      return res.redirect(this.frontendSeatSelectionUrl(tripId, { payment }));
    }
  }

  @Get('success')
  @ApiOperation({
    summary: 'SSLCommerz success callback (GET)',
    description:
      'Same as POST success; some gateways use GET with query params.',
  })
  async successGet(
    @Query('tran_id') tranId: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!tranId) {
      return res.redirect(
        this.frontendSeatSelectionUrl(null, { payment: 'no_session' }),
      );
    }

    try {
      const sslPayload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(req.query)) {
        sslPayload[k] = Array.isArray(v) ? v[0] : v;
      }
      const payment = await this.paymentsService.handlePaymentSuccess(
        tranId,
        sslPayload,
      );
      return res.redirect(this.frontendSuccessUrl(payment.bookingId));
    } catch (err) {
      const tripId = await this.paymentsService.getTripIdByTranId(tranId);
      const msg = err instanceof BadRequestException ? String(err.message) : '';
      const payment =
        err instanceof BadRequestException &&
        /expired|payment window/i.test(msg)
          ? 'time_expired'
          : 'failed';
      return res.redirect(this.frontendSeatSelectionUrl(tripId, { payment }));
    }
  }

  @Post('fail')
  @ApiOperation({
    summary: 'SSLCommerz fail callback (POST)',
    description: 'Redirects to frontend with payment=failed.',
  })
  async fail(@Body() body: any, @Res() res: Response) {
    const { tran_id } = body ?? {};
    if (!tran_id) {
      return res.redirect(
        this.frontendSeatSelectionUrl(null, { payment: 'no_session' }),
      );
    }

    try {
      await this.paymentsService.handlePaymentFailure(
        tran_id,
        PaymentStatus.FAILED,
      );
    } catch {
      // still send user back to seat selection
    }
    const tripId = await this.paymentsService.getTripIdByTranId(tran_id);
    return res.redirect(
      this.frontendSeatSelectionUrl(tripId, { payment: 'failed' }),
    );
  }

  @Get('fail')
  @ApiOperation({ summary: 'SSLCommerz fail callback (GET)' })
  async failGet(
    @Query('tran_id') tranId: string | undefined,
    @Res() res: Response,
  ) {
    if (!tranId) {
      return res.redirect(
        this.frontendSeatSelectionUrl(null, { payment: 'no_session' }),
      );
    }

    try {
      await this.paymentsService.handlePaymentFailure(
        tranId,
        PaymentStatus.FAILED,
      );
    } catch {
      // still send user back to seat selection
    }
    const tripId = await this.paymentsService.getTripIdByTranId(tranId);
    return res.redirect(
      this.frontendSeatSelectionUrl(tripId, { payment: 'failed' }),
    );
  }

  @Post('cancel')
  @ApiOperation({
    summary: 'SSLCommerz cancel callback (POST)',
    description: 'User aborted payment at gateway.',
  })
  async cancel(@Body() body: any, @Res() res: Response) {
    const { tran_id } = body ?? {};
    if (!tran_id) {
      return res.redirect(
        this.frontendSeatSelectionUrl(null, { payment: 'no_session' }),
      );
    }

    try {
      await this.paymentsService.handlePaymentFailure(
        tran_id,
        PaymentStatus.FAILED,
      ); // Treating cancel as fail for simplicity
    } catch {
      // still send user back to seat selection
    }
    const tripId = await this.paymentsService.getTripIdByTranId(tran_id);
    return res.redirect(
      this.frontendSeatSelectionUrl(tripId, { payment: 'cancelled' }),
    );
  }

  @Get('cancel')
  @ApiOperation({ summary: 'SSLCommerz cancel callback (GET)' })
  async cancelGet(
    @Query('tran_id') tranId: string | undefined,
    @Res() res: Response,
  ) {
    if (!tranId) {
      return res.redirect(
        this.frontendSeatSelectionUrl(null, { payment: 'no_session' }),
      );
    }

    try {
      await this.paymentsService.handlePaymentFailure(
        tranId,
        PaymentStatus.FAILED,
      );
    } catch {
      // still send user back to seat selection
    }
    const tripId = await this.paymentsService.getTripIdByTranId(tranId);
    return res.redirect(
      this.frontendSeatSelectionUrl(tripId, { payment: 'cancelled' }),
    );
  }

  @Post(':bookingId/send-confirmation-email')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(FileInterceptor('ticketPdf'))
  @ApiBearerAuth('JWT')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Email booking confirmation with uploaded ticket PDF',
    description: 'Multipart field name: ticketPdf (binary PDF).',
  })
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
