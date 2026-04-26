import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BookingSeatStatus,
  BookingStatus,
  Payment,
  PaymentStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminPaymentsFilterDto } from './dto/admin-payments-filter.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

/** Generates a simulated payment gateway URL for a given transaction ID. */
function buildPaymentUrl(transactionId: string): string {
  return `https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?id=${transactionId}`;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Creates a payment for a booking.
   *
   * **Idempotent**: if a payment already exists for `bookingId` (e.g. because
   * the client called this endpoint twice due to React Strict Mode or a retry),
   * the existing payment record is returned immediately — no duplicate is created
   * and no error is thrown.
   */
  async create(createPaymentDto: CreatePaymentDto): Promise<Payment & { paymentUrl: string }> {
    return this.prismaService.$transaction(async (tx) => {
      // ── 1. Validate the booking ───────────────────────────────────────────
      const booking = await tx.booking.findUnique({
        where: { id: createPaymentDto.bookingId },
        select: { id: true, userId: true, totalAmount: true, status: true },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // ── 2. Idempotency check ──────────────────────────────────────────────
      // If a payment already exists for this booking, return it as-is.
      // This makes the endpoint safe to call multiple times (e.g. React
      // Strict Mode double-invoke, network retries).
      const existingPayment = await tx.payment.findFirst({
        where: { bookingId: booking.id },
        orderBy: { createdAt: 'desc' },
      });

      if (existingPayment) {
        return {
          ...existingPayment,
          paymentUrl: buildPaymentUrl(existingPayment.transactionId || ''),
        };
      }

      // ── 3. Create the payment record ──────────────────────────────────────
      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          userId: booking.userId,
          amount: booking.totalAmount,
          method: createPaymentDto.method,
          status: PaymentStatus.SUCCESS,
          transactionId: this.generateTransactionId(),
        },
      });

      // ── 4. Confirm the booking ────────────────────────────────────────────
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CONFIRMED },
      });

      // ── 5. Promote locked seats → reserved ───────────────────────────────
      await tx.bookingSeat.updateMany({
        where: {
          bookingId: booking.id,
          status: BookingSeatStatus.LOCKED,
        },
        data: {
          status: BookingSeatStatus.RESERVED,
          lockExpiresAt: null,
        },
      });

      return {
        ...payment,
        paymentUrl: buildPaymentUrl(payment.transactionId || ''),
      };
    });
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
        booking: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
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

