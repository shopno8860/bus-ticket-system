import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BookingSeatStatus,
  BookingStatus,
  Prisma,
  PaymentStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminPaymentsFilterDto } from './dto/admin-payments-filter.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

const paymentSafeSelect = {
  id: true,
  bookingId: true,
  userId: true,
  amount: true,
  method: true,
  status: true,
  refundAmount: true,
  refundStatus: true,
  transactionId: true,
  createdAt: true,
} satisfies Prisma.PaymentSelect;

type SafePayment = Prisma.PaymentGetPayload<{
  select: typeof paymentSafeSelect;
}>;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Creates a payment for a booking.
   *
   * **Idempotent**: if a payment already exists for `bookingId` (e.g. because
   * the client called this endpoint twice due to React Strict Mode or a retry),
   * the existing payment record is returned immediately — no duplicate is created
   * and no error is thrown.
   */
  async create(
    createPaymentDto: CreatePaymentDto,
    requesterUserId: string,
  ): Promise<SafePayment & { paymentUrl: string }> {
    return this.prismaService
      .$transaction(
        async (tx) => {
          // ── 1. Validate the booking ───────────────────────────────────────────
          const booking = await tx.booking.findUnique({
            where: { id: createPaymentDto.bookingId },
            select: { id: true, userId: true, totalAmount: true, status: true },
          });

          if (!booking) {
            throw new NotFoundException('Booking not found');
          }
          if (booking.userId !== requesterUserId) {
            throw new ForbiddenException(
              'You are not authorized to pay for this booking',
            );
          }

          // ── 2. Idempotency check ──────────────────────────────────────────────
          // If a payment already exists for this booking, return it as-is.
          // This makes the endpoint safe to call multiple times (e.g. React
          // Strict Mode double-invoke, network retries).
          const existingPayment = await tx.payment.findFirst({
            where: { bookingId: booking.id },
            orderBy: { createdAt: 'desc' },
            select: paymentSafeSelect,
          });

          if (existingPayment) {
            console.log(
              'Existing payment found, initiating SSLCommerz session for transaction:',
              existingPayment.transactionId,
            );
            const paymentUrl = await this.initiateSSLCommerzPayment({
              ...existingPayment,
              booking: await tx.booking.findUnique({
                where: { id: existingPayment.bookingId },
                include: { user: true },
              }),
            });
            return {
              ...existingPayment,
              paymentUrl,
            };
          }

          // ── 3. Create the payment record ──────────────────────────────────────
          const transactionId = this.generateTransactionId();
          console.log(
            'Creating new payment record with transactionId:',
            transactionId,
          );
          const payment = await tx.payment.create({
            data: {
              bookingId: booking.id,
              userId: booking.userId,
              amount: booking.totalAmount,
              method: createPaymentDto.method,
              status: PaymentStatus.PENDING,
              transactionId,
            },
            select: paymentSafeSelect,
          });

          // ── 4. Initiate SSLCommerz Session ────────────────────────────────────
          const paymentUrl = await this.initiateSSLCommerzPayment(payment);

          // ── 4. Confirm the booking (REMOVED: should be done in success callback) ──

          return {
            ...payment,
            paymentUrl,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .then(async (result) => {
        await this.notificationsService.notifyBookingUpdate({
          userId: requesterUserId,
          bookingId: result.bookingId,
          status: result.status,
          message: 'Payment initiation created for your booking.',
        });
        return result;
      });
  }

  /**
   * Handles successful payment callback from SSLCommerz.
   * Marks payment as SUCCESS and booking as CONFIRMED.
   */
  async handlePaymentSuccess(tranId: string) {
    return this.prismaService
      .$transaction(
        async (tx) => {
          const payment = await tx.payment.findUnique({
            where: { transactionId: tranId },
            select: {
              ...paymentSafeSelect,
              booking: true,
            },
          });

          if (!payment) throw new NotFoundException('Payment record not found');
          if (payment.status === PaymentStatus.SUCCESS) {
            return {
              payment: {
                id: payment.id,
                bookingId: payment.bookingId,
                userId: payment.userId,
                amount: payment.amount,
                method: payment.method,
                status: payment.status,
                refundAmount: payment.refundAmount,
                refundStatus: payment.refundStatus,
                transactionId: payment.transactionId,
                createdAt: payment.createdAt,
              },
              shouldSendEmail: false,
            };
          }

          // 1. Update Payment
          const updatedPayment = await tx.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.SUCCESS },
            select: paymentSafeSelect,
          });

          // 2. Update Booking
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: { status: BookingStatus.CONFIRMED },
          });

          // 3. Promote Seats to RESERVED
          await tx.bookingSeat.updateMany({
            where: {
              bookingId: payment.bookingId,
              status: BookingSeatStatus.LOCKED,
            },
            data: {
              status: BookingSeatStatus.RESERVED,
              bookingId: payment.bookingId,
              lockExpiresAt: null,
            },
          });

          return {
            payment: updatedPayment,
            shouldSendEmail: true,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .then(async ({ payment, shouldSendEmail }) => {
        if (!shouldSendEmail) {
          return payment;
        }

        await this.notificationsService.notifyBookingUpdate({
          userId: payment.userId,
          bookingId: payment.bookingId,
          status: payment.status,
          message: 'Payment successful. Booking confirmed.',
        });

        return payment;
      });
  }

  async sendConfirmationEmailWithExistingTicket(params: {
    bookingId: string;
    requesterUserId: string;
    ticketPdfBuffer?: Buffer;
    ticketPdfPath?: string;
  }): Promise<void> {
    const booking = await this.prismaService.booking.findUnique({
      where: { id: params.bookingId },
      select: {
        id: true,
        userId: true,
        bookingReference: true,
        user: {
          select: {
            email: true,
            fullName: true,
          },
        },
        payments: {
          where: { status: PaymentStatus.SUCCESS },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== params.requesterUserId) {
      throw new ForbiddenException(
        'You are not authorized to send this booking ticket',
      );
    }

    if (!booking.payments.length) {
      throw new ForbiddenException(
        'Booking confirmation email can be sent only after payment success',
      );
    }

    if (!booking.user?.email || !booking.bookingReference) {
      this.logger.warn(
        `Skipped booking confirmation email due to missing user or booking details. bookingId=${params.bookingId}`,
      );
      return;
    }

    await this.mailService.sendBookingConfirmationEmail({
      to: booking.user.email,
      customerName: booking.user.fullName ?? 'Customer',
      bookingReference: booking.bookingReference,
      ticketPdf: params.ticketPdfBuffer,
      ticketPdfPath: params.ticketPdfPath,
    });
  }

  /**
   * Handles failed/cancelled payment.
   * Marks payment as FAILED/CANCELLED and booking as CANCELLED.
   */
  async handlePaymentFailure(tranId: string, status: PaymentStatus) {
    return this.prismaService
      .$transaction(
        async (tx) => {
          const payment = await tx.payment.findUnique({
            where: { transactionId: tranId },
            select: {
              ...paymentSafeSelect,
              booking: true,
            },
          });

          if (!payment) throw new NotFoundException('Payment record not found');
          if (payment.status === status) return payment;

          // 1. Update Payment
          const updatedPayment = await tx.payment.update({
            where: { id: payment.id },
            data: { status },
            select: paymentSafeSelect,
          });

          // 2. Update Booking
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: {
              status: BookingStatus.CANCELLED,
              cancelReason: `Payment ${status.toLowerCase()}`,
            },
          });

          // 3. Release Seats
          await tx.bookingSeat.deleteMany({
            where: { bookingId: payment.bookingId },
          });

          return updatedPayment;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .then(async (updatedPayment) => {
        await this.notificationsService.notifyBookingUpdate({
          userId: updatedPayment.userId,
          bookingId: updatedPayment.bookingId,
          status: updatedPayment.status,
          message: 'Payment failed/cancelled and booking was cancelled.',
        });
        return updatedPayment;
      });
  }

  /**
   * Initiates a real session with SSLCommerz and returns the GatewayPageURL.
   */
  private async initiateSSLCommerzPayment(payment: any): Promise<string> {
    const storeId = this.configService.get<string>('STORE_ID');
    const storePassword = this.configService.get<string>('STORE_PASSWORD');
    const sslUrl = this.configService.get<string>('SSLCOMMERZ_URL');

    console.log('SSLCommerz Config:', {
      storeId: storeId ? 'FOUND' : 'MISSING',
      sslUrl,
    });

    if (!storeId || !storePassword || !sslUrl) {
      console.warn(
        'SSLCommerz credentials missing in .env. Falling back to simulation.',
      );
      return `https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?id=${payment.transactionId}`;
    }

    const data = new URLSearchParams();
    data.append('store_id', storeId);
    data.append('store_passwd', storePassword);
    data.append('total_amount', payment.amount.toString());
    data.append('currency', 'BDT');
    data.append('tran_id', payment.transactionId);

    // Callbacks - these MUST match the controller routes
    const baseUrl = 'http://localhost:3000'; // Backend URL
    data.append('success_url', `${baseUrl}/payments/success`);
    data.append('fail_url', `${baseUrl}/payments/fail`);
    data.append('cancel_url', `${baseUrl}/payments/cancel`);

    // Customer Info
    data.append(
      'cus_name',
      payment.booking?.passengerName ||
        payment.booking?.user?.fullName ||
        'Customer',
    );
    data.append(
      'cus_email',
      payment.booking?.user?.email || 'customer@example.com',
    );
    data.append('cus_add1', 'Dhaka, Bangladesh');
    data.append(
      'cus_phone',
      payment.booking?.passengerPhone ||
        payment.booking?.user?.phoneNumber ||
        '01700000000',
    );
    data.append('cus_city', 'Dhaka');
    data.append('cus_country', 'Bangladesh');

    // Ship Info
    data.append('shipping_method', 'NO');
    data.append('num_of_item', '1');
    data.append('product_name', 'Bus Ticket');
    data.append('product_category', 'Ticket');
    data.append('product_profile', 'general');

    console.log('Initiating SSLCommerz for TranID:', payment.transactionId);

    try {
      const response = await fetch(sslUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: data,
      });

      const result: any = await response.json();
      console.log('SSLCommerz API Response Status:', result.status);

      if (result.status === 'SUCCESS' && result.GatewayPageURL) {
        console.log('SSLCommerz Session Created Successfully');
        return result.GatewayPageURL;
      }

      console.error(
        'SSLCommerz initiation failed. Result:',
        JSON.stringify(result),
      );
      return `https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?id=${payment.transactionId}&error=${encodeURIComponent(result.failedreason || 'init_failed')}`;
    } catch (error) {
      console.error('Exception during SSLCommerz fetch:', error.message);
      return `https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?id=${payment.transactionId}&exception=${encodeURIComponent(error.message)}`;
    }
  }

  async findAllAdmin(filters: AdminPaymentsFilterDto) {
    const where: {
      status?: PaymentStatus;
      createdAt?: { gte: Date; lt: Date };
    } = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      where.createdAt = { gte: startOfDay, lt: endOfDay };
    }

    return this.prismaService.payment.findMany({
      where,
      include: {
        booking: {
          include: {
            trip: {
              include: {
                route: true,
                bus: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private generateTransactionId(): string {
    return `TXN-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;
  }
}
