import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  PaymentStatus,
  Prisma,
  Refund,
  RefundStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestRefundDto } from './dto/request-refund.dto';

@Injectable()
export class RefundsService {
  constructor(private readonly prismaService: PrismaService) {}

  async requestRefund(requestRefundDto: RequestRefundDto): Promise<Refund> {
    const now = new Date();

    return this.prismaService.$transaction(async (transactionClient) => {
      const booking = await transactionClient.booking.findUnique({
        where: { id: requestRefundDto.bookingId },
        include: {
          trip: {
            select: {
              departureTime: true,
            },
          },
          payments: {
            where: {
              status: PaymentStatus.SUCCESS,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              id: true,
            },
          },
        },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new ConflictException(
          'Only confirmed bookings are eligible for refund requests',
        );
      }

      const refundPercentage = this.calculateRefundPercentage(
        now,
        booking.trip.departureTime,
      );
      const refundAmount = new Prisma.Decimal(booking.totalAmount).mul(
        refundPercentage,
      );

      const latestSuccessfulPayment = booking.payments[0];

      const refund = await transactionClient.refund.create({
        data: {
          bookingId: booking.id,
          paymentId: latestSuccessfulPayment?.id ?? null,
          userId: booking.userId,
          reason: requestRefundDto.reason,
          amount: refundAmount,
          status: RefundStatus.PENDING,
        },
      });

      return refund;
    });
  }

  async approve(
    refundId: string,
    adminUserId: string,
    adminNote?: string,
  ): Promise<Refund> {
    return this.prismaService.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({
        where: { id: refundId },
      });

      if (!refund) {
        throw new NotFoundException('Refund not found');
      }

      if (refund.status !== RefundStatus.PENDING) {
        throw new ConflictException('Only pending refunds can be approved');
      }

      if (refund.paymentId) {
        await tx.payment.update({
          where: { id: refund.paymentId },
          data: { status: PaymentStatus.REFUNDED },
        });
      }

      await tx.booking.update({
        where: { id: refund.bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      return tx.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.APPROVED,
          processedAt: new Date(),
          processedBy: adminUserId,
          adminNote,
        },
      });
    });
  }

  async reject(
    refundId: string,
    adminUserId: string,
    adminNote?: string,
  ): Promise<Refund> {
    return this.prismaService.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({
        where: { id: refundId },
      });

      if (!refund) {
        throw new NotFoundException('Refund not found');
      }

      if (refund.status !== RefundStatus.PENDING) {
        throw new ConflictException('Only pending refunds can be rejected');
      }

      return tx.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.REJECTED,
          processedAt: new Date(),
          processedBy: adminUserId,
          adminNote,
        },
      });
    });
  }

  private calculateRefundPercentage(
    requestTime: Date,
    departureTime: Date,
  ): number {
    const diffInHours =
      (departureTime.getTime() - requestTime.getTime()) / (1000 * 60 * 60);

    if (diffInHours >= 24) {
      return 0.9;
    }
    if (diffInHours >= 12) {
      return 0.7;
    }
    if (diffInHours >= 6) {
      return 0.5;
    }
    return 0;
  }
}
