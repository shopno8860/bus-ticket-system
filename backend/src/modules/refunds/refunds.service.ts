import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  PaymentStatus,
  Prisma,
  Refund,
  RefundStatus,
} from '@prisma/client';
import {
  canCancelBooking,
  getHoursBeforeDeparture,
  getRefundPercentage,
} from '../../common/policies/cancellation-policy';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestRefundDto } from './dto/request-refund.dto';
import { AdminRefundsFilterDto } from './dto/admin-refunds-filter.dto';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
  ) {}

  async requestRefund(
    requestRefundDto: RequestRefundDto,
    requesterUserId: string,
  ): Promise<Refund> {
    const now = new Date();

    return this.prismaService
      .$transaction(
        async (transactionClient) => {
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
          if (booking.userId !== requesterUserId) {
            throw new ForbiddenException(
              'You are not authorized to request a refund for this booking',
            );
          }

          if (booking.status !== BookingStatus.CONFIRMED) {
            throw new ConflictException(
              'Only confirmed bookings are eligible for refund requests',
            );
          }

          const existingRefund = await transactionClient.refund.findFirst({
            where: {
              bookingId: booking.id,
              status: { in: [RefundStatus.PENDING, RefundStatus.APPROVED] },
            },
            select: { id: true },
          });

          if (existingRefund) {
            throw new ConflictException(
              'A refund request already exists for this booking',
            );
          }

          const refundPercentage = this.calculateRefundPercentage(
            now,
            booking.trip.departureTime,
          );
          if (
            !canCancelBooking(
              getHoursBeforeDeparture(now, booking.trip.departureTime),
            )
          ) {
            throw new ConflictException(
              'Refund requests are not allowed within 2 hours of departure',
            );
          }
          const refundAmount = new Prisma.Decimal(booking.totalAmount).mul(
            refundPercentage,
          );

          const latestSuccessfulPayment = booking.payments[0];
          if (!latestSuccessfulPayment) {
            throw new ConflictException(
              'No successful payment found for this booking refund',
            );
          }

          const refund = await transactionClient.refund.create({
            data: {
              bookingId: booking.id,
              paymentId: latestSuccessfulPayment.id,
              userId: booking.userId,
              reason: requestRefundDto.reason,
              amount: refundAmount,
              status: RefundStatus.PENDING,
            },
          });

          return refund;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .then(async (refund) => {
        await this.notificationsService.notifyRefundUpdate({
          userId: requesterUserId,
          refundId: refund.id,
          status: refund.status,
          message: 'Refund request created successfully.',
        });
        return refund;
      });
  }

  async approve(
    refundId: string,
    adminUserId: string,
    adminNote?: string,
  ): Promise<Refund> {
    return this.prismaService
      .$transaction(
        async (tx) => {
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
            const paymentUpdateResult = await tx.payment.updateMany({
              where: { id: refund.paymentId },
              data: {
                status: PaymentStatus.REFUNDED,
                refundAmount: refund.amount,
                refundStatus: 'PROCESSED',
              },
            });

            if (paymentUpdateResult.count === 0) {
              throw new ConflictException(
                'Linked payment was not found for this refund',
              );
            }
          }

          const bookingUpdateResult = await tx.booking.updateMany({
            where: { id: refund.bookingId },
            data: { status: BookingStatus.CANCELLED },
          });

          if (bookingUpdateResult.count === 0) {
            throw new NotFoundException(
              'Linked booking not found for this refund',
            );
          }

          await tx.bookingSeat.deleteMany({
            where: { bookingId: refund.bookingId },
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
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .then(async (refund) => {
        await this.notificationsService.notifyRefundUpdate({
          userId: refund.userId,
          refundId: refund.id,
          status: refund.status,
          message: 'Refund approved by admin.',
        });

        void this.sendRefundApprovedEmail({
          userId: refund.userId,
          bookingId: refund.bookingId,
          refundAmount: refund.amount.toString(),
        });

        return refund;
      });
  }

  private async sendRefundApprovedEmail(params: {
    userId: string;
    bookingId: string;
    refundAmount: string;
  }): Promise<void> {
    try {
      const [user, booking] = await Promise.all([
        this.prismaService.user.findUnique({
          where: { id: params.userId },
          select: { email: true, fullName: true },
        }),
        this.prismaService.booking.findUnique({
          where: { id: params.bookingId },
          select: { bookingReference: true },
        }),
      ]);

      if (!user?.email || !booking?.bookingReference) {
        this.logger.warn(
          `Skipped refund approved email due to missing user or booking details. bookingId=${params.bookingId}`,
        );
        return;
      }

      await this.mailService.sendRefundApprovedEmail({
        to: user.email,
        customerName: user.fullName ?? 'Customer',
        bookingReference: booking.bookingReference,
        refundAmount: `${params.refundAmount} BDT`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send refund approved email for bookingId=${params.bookingId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async reject(
    refundId: string,
    adminUserId: string,
    adminNote?: string,
  ): Promise<Refund> {
    return this.prismaService
      .$transaction(
        async (tx) => {
          const refund = await tx.refund.findUnique({
            where: { id: refundId },
          });

          if (!refund) {
            throw new NotFoundException('Refund not found');
          }

          if (refund.status !== RefundStatus.PENDING) {
            throw new ConflictException('Only pending refunds can be rejected');
          }

          await tx.booking.update({
            where: { id: refund.bookingId },
            data: { status: BookingStatus.CANCELLED },
          });

          return tx.refund.update({
            where: { id: refundId },
            data: {
              status: RefundStatus.REJECTED,
              processedAt: new Date(),
              processedBy: adminUserId,
              adminNote,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .then(async (refund) => {
        await this.notificationsService.notifyRefundUpdate({
          userId: refund.userId,
          refundId: refund.id,
          status: refund.status,
          message: 'Refund rejected by admin.',
        });
        return refund;
      });
  }

  async findAllAdmin(filters: AdminRefundsFilterDto) {
    const where: {
      status?: RefundStatus;
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

    return this.prismaService.refund.findMany({
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
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
            transactionId: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private calculateRefundPercentage(
    requestTime: Date,
    departureTime: Date,
  ): number {
    return getRefundPercentage(
      getHoursBeforeDeparture(requestTime, departureTime),
    );
  }
}
