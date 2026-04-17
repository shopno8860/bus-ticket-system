import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class PaymentsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    return this.prismaService.$transaction(async (transactionClient) => {
      const booking = await transactionClient.booking.findUnique({
        where: { id: createPaymentDto.bookingId },
        select: { id: true, userId: true, totalAmount: true, status: true },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.status === BookingStatus.CONFIRMED) {
        throw new ConflictException('Payment already completed for this booking');
      }

      const payment = await transactionClient.payment.create({
        data: {
          bookingId: booking.id,
          userId: booking.userId,
          amount: booking.totalAmount,
          method: createPaymentDto.method,
          status: PaymentStatus.SUCCESS,
          transactionId: this.generateTransactionId(),
        },
      });

      await transactionClient.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CONFIRMED },
      });

      await transactionClient.bookingSeat.updateMany({
        where: {
          bookingId: booking.id,
          status: BookingSeatStatus.LOCKED,
        },
        data: {
          status: BookingSeatStatus.RESERVED,
          lockExpiresAt: null,
        },
      });

      return payment;
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
