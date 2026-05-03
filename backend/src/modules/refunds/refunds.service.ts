import {
  BadRequestException,
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
import { randomBytes } from 'crypto';
import { RequestRefundDto } from './dto/request-refund.dto';
import { AdminRefundsFilterDto } from './dto/admin-refunds-filter.dto';
import { SslCommerzRefundService } from './sslcommerz-refund.service';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly sslCommerzRefundService: SslCommerzRefundService,
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
            const linkedPayment = await tx.payment.findUnique({
              where: { id: refund.paymentId },
              select: { status: true },
            });
            if (linkedPayment?.status === PaymentStatus.REFUNDED) {
              throw new ConflictException(
                'Payment is already marked refunded (e.g. SSLCommerz); cannot approve this request',
              );
            }

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

  /**
   * Cancels booking (on SUCCESS/PROCESSING), calls SSLCommerz refund API, persists gateway payload.
   * Admin-only legacy approve flow does not call SSL; avoid approving a different refund if SSL already completed.
   */
  async initiateSslRefundForBooking(
    bookingId: string,
    requesterUserId: string,
    reason: string,
  ) {
    const now = new Date();

    const booking = await this.prismaService.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: { select: { departureTime: true } },
        payments: {
          where: { status: PaymentStatus.SUCCESS },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.userId !== requesterUserId) {
      throw new ForbiddenException(
        'You are not authorized to refund this booking',
      );
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new ConflictException(
        'Only confirmed bookings are eligible for SSL refund',
      );
    }

    const existingRefund = await this.prismaService.refund.findFirst({
      where: {
        bookingId,
        status: { in: [RefundStatus.PENDING, RefundStatus.APPROVED] },
      },
      select: { id: true, status: true, sslGatewayStatus: true },
    });

    if (existingRefund) {
      throw new ConflictException(
        'A refund request already exists for this booking',
      );
    }

    const departureTime = new Date(booking.trip.departureTime);
    const diffInHours = getHoursBeforeDeparture(now, departureTime);
    if (!canCancelBooking(diffInHours)) {
      throw new BadRequestException(
        'Refunds are not allowed within 2 hours of departure',
      );
    }

    const latestPayment = booking.payments[0];
    if (!latestPayment) {
      throw new ConflictException(
        'No successful payment found for this booking',
      );
    }
    if (latestPayment.status === PaymentStatus.REFUNDED) {
      throw new ConflictException('This payment has already been refunded');
    }
    if (!latestPayment.bankTranId) {
      throw new BadRequestException(
        'Payment has no bank transaction id yet; complete payment with SSL validation (val_id) so bank_tran_id is stored, then retry.',
      );
    }

    const inflightSsl = await this.prismaService.refund.findFirst({
      where: {
        bookingId,
        sslGatewayStatus: { in: ['SUCCESS', 'PROCESSING'] },
      },
      select: { id: true },
    });
    if (inflightSsl) {
      throw new ConflictException(
        'A gateway refund is already in progress or completed for this booking',
      );
    }

    const refundPercentage = this.calculateRefundPercentage(now, departureTime);
    const refundAmount = new Prisma.Decimal(booking.totalAmount).mul(
      refundPercentage,
    );

    const refundTransId = `rfd_${randomBytes(12).toString('hex')}`;
    const refeId = `${bookingId.slice(0, 24)}_${Date.now()}`.slice(0, 50);

    const sslResult = await this.sslCommerzRefundService.initiateRefund({
      bankTranId: latestPayment.bankTranId,
      amount: refundAmount.toNumber(),
      reason,
      refundTransId,
      refeId,
    });

    const jsonRaw = sslResult.raw as unknown as Prisma.InputJsonValue;

    const { refund, updatedBooking } = await this.prismaService.$transaction(
      async (tx) => {
        const b = await tx.booking.findUnique({
          where: { id: bookingId },
          include: {
            trip: {
              include: {
                route: true,
                bus: true,
              },
            },
            payments: {
              where: { status: PaymentStatus.SUCCESS },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });

        if (!b || b.userId !== requesterUserId) {
          throw new NotFoundException('Booking not found');
        }
        if (b.status !== BookingStatus.CONFIRMED) {
          throw new ConflictException('Booking is no longer confirmed');
        }

        const pay = b.payments[0];
        if (!pay?.bankTranId) {
          throw new BadRequestException('Payment is missing bank transaction id');
        }

        const gateway = sslResult.normalizedStatus;
        const refundStatus: RefundStatus =
          gateway === 'SUCCESS'
            ? RefundStatus.APPROVED
            : gateway === 'PROCESSING'
              ? RefundStatus.PENDING
              : RefundStatus.REJECTED;

        const refundRow = await tx.refund.create({
          data: {
            bookingId: b.id,
            paymentId: pay.id,
            userId: b.userId,
            reason,
            amount: refundAmount,
            status: refundStatus,
            bankTranId: pay.bankTranId,
            sslRefundRefId: sslResult.refundRefId ?? null,
            refundTransId,
            sslGatewayStatus: gateway,
            sslRawResponse: jsonRaw,
            processedAt: gateway === 'SUCCESS' ? new Date() : null,
            processedBy: gateway === 'SUCCESS' ? requesterUserId : null,
          },
        });

        let bookingAfter = b;

        if (gateway === 'SUCCESS' || gateway === 'PROCESSING') {
          bookingAfter = await tx.booking.update({
            where: { id: bookingId },
            data: {
              status: BookingStatus.CANCELLED,
              cancelledAt: now,
              refundAmount,
              cancelReason: reason.slice(0, 500),
              cancelledBy: requesterUserId,
            },
            include: {
              trip: {
                include: {
                  route: true,
                  bus: true,
                },
              },
              bookingSeats: {
                include: {
                  seat: true,
                },
              },
              payments: {
                select: {
                  id: true,
                  bookingId: true,
                  userId: true,
                  amount: true,
                  method: true,
                  status: true,
                  refundAmount: true,
                  refundStatus: true,
                  transactionId: true,
                  valId: true,
                  bankTranId: true,
                  createdAt: true,
                },
              },
            },
          });

          await tx.bookingSeat.deleteMany({ where: { bookingId } });
        }

        if (gateway === 'SUCCESS') {
          await tx.payment.update({
            where: { id: pay.id },
            data: {
              status: PaymentStatus.REFUNDED,
              refundAmount,
              refundStatus: 'SUCCESS',
            },
          });
        } else if (gateway === 'PROCESSING') {
          await tx.payment.update({
            where: { id: pay.id },
            data: {
              refundAmount,
              refundStatus: 'SSL_PROCESSING',
            },
          });
        }

        return { refund: refundRow, updatedBooking: bookingAfter };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (
      sslResult.normalizedStatus === 'FAILED' ||
      sslResult.normalizedStatus === 'UNKNOWN'
    ) {
      throw new BadRequestException({
        message: 'SSLCommerz refund was not accepted',
        reason: sslResult.errorReason ?? sslResult.normalizedStatus,
        refundId: refund.id,
      });
    }

    await this.notificationsService.notifyBookingUpdate({
      userId: requesterUserId,
      bookingId,
      status: BookingStatus.CANCELLED,
      message:
        sslResult.normalizedStatus === 'SUCCESS'
          ? 'Your booking was cancelled and the refund was initiated successfully.'
          : 'Your booking was cancelled; refund is processing with the payment gateway.',
    });

    void this.sendBookingCancelledEmailForRefund({
      userId: booking.userId,
      bookingReference: updatedBooking.bookingReference,
    });

    return {
      message:
        sslResult.normalizedStatus === 'SUCCESS'
          ? 'Booking cancelled and refund completed with SSLCommerz'
          : 'Booking cancelled; SSLCommerz refund is processing',
      refundAmount: refundAmount.toNumber(),
      refundRequest: {
        id: refund.id,
        status: refund.status,
        sslGatewayStatus: sslResult.normalizedStatus,
        sslRefundRefId: sslResult.refundRefId ?? null,
      },
      booking: updatedBooking,
    };
  }

  async getSslRefundStatusForUser(refundRefId: string, requesterUserId: string) {
    const row = await this.prismaService.refund.findFirst({
      where: {
        sslRefundRefId: refundRefId,
        userId: requesterUserId,
      },
      select: {
        id: true,
        bookingId: true,
        amount: true,
        sslRefundRefId: true,
        sslGatewayStatus: true,
        status: true,
        createdAt: true,
      },
    });

    if (!row) {
      throw new NotFoundException('Refund not found');
    }

    const live = await this.sslCommerzRefundService.queryRefundStatus(
      refundRefId,
    );

    return { stored: row, live };
  }

  private async sendBookingCancelledEmailForRefund(params: {
    userId: string;
    bookingReference: string;
  }): Promise<void> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id: params.userId },
        select: { email: true, fullName: true },
      });

      if (!user?.email) {
        this.logger.warn(
          `Skipped booking cancellation email due to missing user email. userId=${params.userId}`,
        );
        return;
      }

      await this.mailService.sendBookingCancellationEmail({
        to: user.email,
        customerName: user.fullName ?? 'Customer',
        bookingReference: params.bookingReference,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send booking cancellation email for userId=${params.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
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
