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
import {
  SslCommerzRefundService,
  type SslRefundInitResult,
} from './sslcommerz-refund.service';

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
    const snapshot = await this.prismaService.refund.findUnique({
      where: { id: refundId },
      include: {
        payment: {
          select: {
            id: true,
            status: true,
            bankTranId: true,
            amount: true,
            refundAmount: true,
          },
        },
      },
    });

    if (!snapshot) {
      throw new NotFoundException('Refund not found');
    }
    if (snapshot.status !== RefundStatus.PENDING) {
      throw new ConflictException('Only pending refunds can be approved');
    }
    if (snapshot.payment?.status === PaymentStatus.REFUNDED) {
      throw new ConflictException(
        'Payment is already marked refunded; cannot approve this request',
      );
    }

    if (snapshot.payment?.amount != null) {
      if (snapshot.amount.gt(snapshot.payment.amount)) {
        throw new BadRequestException(
          'Refund amount cannot exceed the paid amount for this transaction',
        );
      }
    }

    let sslResult: SslRefundInitResult | null = null;
    let refundTransId: string | undefined;

    const storeReady =
      Boolean(this.sslCommerzRefundService.getStoreId()) &&
      Boolean(this.sslCommerzRefundService.getStorePass());
    const bankTranIdTrimmed = snapshot.payment?.bankTranId?.trim() ?? '';
    const canCallSsl = bankTranIdTrimmed.length > 0 && storeReady;

    if (canCallSsl) {
      refundTransId = `rfd_${randomBytes(12).toString('hex')}`;
      const refeId = `${snapshot.id}_${Date.now()}`.slice(0, 50);
      const reason =
        adminNote?.trim() ||
        snapshot.reason ||
        'Admin approved refund';

      sslResult = await this.sslCommerzRefundService.initiateRefund({
        bankTranId: bankTranIdTrimmed,
        amount: snapshot.amount.toNumber(),
        reason,
        refundTransId,
        refeId,
      });
    } else if (snapshot.paymentId && !bankTranIdTrimmed) {
      this.logger.warn(
        `Refund ${refundId}: approving without bankTranId — payment marked refunded in DB only (no SSL gateway call).`,
      );
    }

    const sslJson = sslResult
      ? (sslResult.raw as unknown as Prisma.InputJsonValue)
      : undefined;

    const mergedFailureNote = RefundsService.mergeAdminNoteWithSsl(
      adminNote,
      sslResult?.errorReason,
    );

    if (
      sslResult &&
      (sslResult.normalizedStatus === 'FAILED' ||
        sslResult.normalizedStatus === 'UNKNOWN')
    ) {
      const gatewayLabel = [
        sslResult.apiConnect && `APIConnect=${sslResult.apiConnect}`,
        sslResult.sslStatus && `status=${sslResult.sslStatus}`,
        sslResult.approvalStatus && `approval=${sslResult.approvalStatus}`,
      ]
        .filter(Boolean)
        .join(' ');

      await this.prismaService.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.FAILED,
          processedAt: new Date(),
          processedBy: adminUserId,
          sslRefundRefId: sslResult.refundRefId ?? null,
          refundTransId: refundTransId ?? null,
          sslGatewayStatus:
            sslResult.sslStatus ??
            sslResult.approvalStatus ??
            sslResult.normalizedStatus,
          sslRawResponse: sslJson,
          bankTranId: (bankTranIdTrimmed || snapshot.payment?.bankTranId) ?? null,
          adminNote: mergedFailureNote ?? undefined,
        },
      });

      this.logger.warn(
        `Refund ${refundId} marked FAILED after SSL outcome (${gatewayLabel || sslResult.normalizedStatus})`,
      );

      throw new BadRequestException({
        message:
          'SSLCommerz did not confirm the refund; booking was not cancelled',
        reason: sslResult.errorReason ?? sslResult.normalizedStatus,
      });
    }

    if (sslResult?.normalizedStatus === 'PROCESSING') {
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
                where: {
                  id: refund.paymentId,
                  status: { not: PaymentStatus.REFUNDED },
                },
                data: {
                  refundAmount: refund.amount,
                  refundStatus: 'SSL_PROCESSING',
                },
              });
              if (paymentUpdateResult.count === 0) {
                throw new ConflictException(
                  'Linked payment was not found or already refunded',
                );
              }
            }

            const processingNote =
              adminNote?.trim() || snapshot.adminNote?.trim();
            return tx.refund.update({
              where: { id: refundId },
              data: {
                status: RefundStatus.PENDING,
                sslRefundRefId: sslResult.refundRefId ?? null,
                refundTransId: refundTransId ?? null,
                sslGatewayStatus: 'PROCESSING',
                sslRawResponse: sslJson,
                bankTranId: bankTranIdTrimmed || null,
                ...(processingNote ? { adminNote: processingNote } : {}),
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
            message:
              'Refund submitted to SSLCommerz; gateway is processing. Booking stays active until the refund settles.',
          });
          return refund;
        });
    }

    const finalizeAsRefundedAtGateway =
      !sslResult || sslResult.normalizedStatus === 'SUCCESS';

    if (sslResult && !finalizeAsRefundedAtGateway) {
      throw new ConflictException(
        'Unexpected SSL gateway state during refund approval',
      );
    }

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
                'Payment is already marked refunded; cannot approve this request',
              );
            }

            const baseData = { refundAmount: refund.amount };
            let paymentUpdateResult: { count: number };

            if (sslResult) {
              paymentUpdateResult = await tx.payment.updateMany({
                where: { id: refund.paymentId },
                data: {
                  ...baseData,
                  status: PaymentStatus.REFUNDED,
                  refundStatus: 'SUCCESS',
                },
              });
            } else {
              paymentUpdateResult = await tx.payment.updateMany({
                where: { id: refund.paymentId },
                data: {
                  ...baseData,
                  status: PaymentStatus.REFUNDED,
                  refundStatus: 'PROCESSED',
                },
              });
            }

            if (paymentUpdateResult.count === 0) {
              throw new ConflictException(
                'Linked payment was not found for this refund',
              );
            }
          }

          const bookingUpdateResult = await tx.booking.updateMany({
            where: { id: refund.bookingId },
            data: {
              status: BookingStatus.CANCELLED,
              cancelledAt: new Date(),
              cancelReason: 'Refund approved by admin',
              cancelledBy: adminUserId,
              refundAmount: refund.amount,
            },
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
              ...(adminNote !== undefined ? { adminNote } : {}),
              ...(sslResult
                ? {
                    sslRefundRefId: sslResult.refundRefId ?? null,
                    refundTransId: refundTransId ?? null,
                    sslGatewayStatus: sslResult.sslStatus ?? 'SUCCESS',
                    sslRawResponse: sslJson,
                    bankTranId: bankTranIdTrimmed || null,
                  }
                : {}),
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

  /**
   * Calls SSLCommerz refund **query** API (`refund_ref_id`), updates `sslRawResponse`,
   * and when SSL reports `refunded`, finalizes a pending refund (payment REFUNDED,
   * booking cancelled). When SSL reports cancelled/failed while payment is
   * `SSL_PROCESSING`, marks refund FAILED. SSL merchant UI is unchanged; this syncs **our** DB.
   */
  async adminSyncSslRefundStatus(
    refundId: string,
    adminUserId: string,
  ): Promise<{
    refund: Refund;
    sslLive: Record<string, unknown>;
    outcome: string;
  }> {
    const row = await this.prismaService.refund.findUnique({
      where: { id: refundId },
      include: {
        payment: {
          select: {
            id: true,
            status: true,
            refundStatus: true,
            amount: true,
          },
        },
        booking: { select: { id: true, status: true } },
      },
    });

    if (!row) {
      throw new NotFoundException('Refund not found');
    }

    const refId = row.sslRefundRefId?.trim();
    if (!refId) {
      throw new BadRequestException(
        'No sslRefundRefId on this refund. Run approve first so SSL returns a refund reference.',
      );
    }

    const sslLive = await this.sslCommerzRefundService.queryRefundStatus(refId);
    const parsed =
      this.sslCommerzRefundService.interpretRefundQueryResponse(sslLive);
    const liveJson = sslLive as unknown as Prisma.InputJsonValue;

    if (parsed.normalizedStatus === 'SUCCESS') {
      if (row.status === RefundStatus.APPROVED) {
        const refund = await this.prismaService.refund.update({
          where: { id: refundId },
          data: {
            sslRawResponse: liveJson,
            sslGatewayStatus: parsed.sslStatus ?? 'refunded',
          },
        });
        return {
          refund,
          sslLive,
          outcome:
            'Already approved locally; refreshed SSL snapshot only. SSL dashboard may still show its own labels.',
        };
      }

      if (row.status !== RefundStatus.PENDING) {
        throw new ConflictException(
          'SSL reports refunded but this refund is not pending locally; resolve manually.',
        );
      }

      if (row.booking?.status !== BookingStatus.CONFIRMED) {
        const refund = await this.prismaService.refund.update({
          where: { id: refundId },
          data: {
            sslRawResponse: liveJson,
            sslGatewayStatus: parsed.sslStatus ?? 'refunded',
          },
        });
        return {
          refund,
          sslLive,
          outcome:
            'SSL reports refunded but booking is not CONFIRMED; stored snapshot only.',
        };
      }

      if (!row.paymentId || row.payment?.status !== PaymentStatus.SUCCESS) {
        const refund = await this.prismaService.refund.update({
          where: { id: refundId },
          data: {
            sslRawResponse: liveJson,
            sslGatewayStatus: parsed.sslStatus ?? 'refunded',
          },
        });
        return {
          refund,
          sslLive,
          outcome:
            'SSL reports refunded but payment is not SUCCESS; stored snapshot only.',
        };
      }

      const refund = await this.prismaService.$transaction(
        async (tx) => {
          const r = await tx.refund.findUnique({ where: { id: refundId } });
          if (!r || r.status !== RefundStatus.PENDING) {
            throw new ConflictException('Refund is no longer pending');
          }

          const pay = await tx.payment.findUnique({
            where: { id: r.paymentId! },
            select: { status: true },
          });
          if (pay?.status === PaymentStatus.REFUNDED) {
            return tx.refund.update({
              where: { id: refundId },
              data: {
                sslRawResponse: liveJson,
                sslGatewayStatus: parsed.sslStatus ?? 'refunded',
              },
            });
          }

          const payUp = await tx.payment.updateMany({
            where: {
              id: r.paymentId!,
              status: PaymentStatus.SUCCESS,
            },
            data: {
              refundAmount: r.amount,
              status: PaymentStatus.REFUNDED,
              refundStatus: 'SUCCESS',
            },
          });
          if (payUp.count === 0) {
            throw new ConflictException(
              'Payment was not SUCCESS; cannot finalize refund from SSL query',
            );
          }

          const bu = await tx.booking.updateMany({
            where: {
              id: r.bookingId,
              status: BookingStatus.CONFIRMED,
            },
            data: {
              status: BookingStatus.CANCELLED,
              cancelledAt: new Date(),
              cancelReason: 'Refund settled via SSLCommerz (admin sync)',
              cancelledBy: adminUserId,
              refundAmount: r.amount,
            },
          });
          if (bu.count === 0) {
            throw new ConflictException(
              'Booking was not CONFIRMED; cannot finalize refund from SSL query',
            );
          }

          await tx.bookingSeat.deleteMany({
            where: { bookingId: r.bookingId },
          });

          return tx.refund.update({
            where: { id: refundId },
            data: {
              status: RefundStatus.APPROVED,
              processedAt: new Date(),
              processedBy: adminUserId,
              sslRawResponse: liveJson,
              sslGatewayStatus: parsed.sslStatus ?? 'refunded',
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      await this.notificationsService.notifyRefundUpdate({
        userId: refund.userId,
        refundId: refund.id,
        status: refund.status,
        message: 'Refund finalized after SSL reported refunded.',
      });
      void this.sendRefundApprovedEmail({
        userId: refund.userId,
        bookingId: refund.bookingId,
        refundAmount: refund.amount.toString(),
      });

      return {
        refund,
        sslLive,
        outcome:
          'SSL reported refunded — payment marked REFUNDED and booking cancelled in our system.',
      };
    }

    if (parsed.normalizedStatus === 'FAILED') {
      if (
        row.status === RefundStatus.PENDING &&
        row.payment?.refundStatus === 'SSL_PROCESSING'
      ) {
        const refund = await this.prismaService.$transaction(
          async (tx) => {
            if (row.paymentId) {
              await tx.payment.updateMany({
                where: { id: row.paymentId },
                data: { refundStatus: 'SSL_REFUND_CANCELLED' },
              });
            }
            const failedNote = RefundsService.mergeAdminNoteWithSsl(
              row.adminNote ?? undefined,
              parsed.errorReason,
            );
            return tx.refund.update({
              where: { id: refundId },
              data: {
                status: RefundStatus.FAILED,
                processedAt: new Date(),
                processedBy: adminUserId,
                sslRawResponse: liveJson,
                sslGatewayStatus: parsed.sslStatus ?? 'cancelled',
                ...(failedNote ? { adminNote: failedNote } : {}),
              },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        await this.notificationsService.notifyRefundUpdate({
          userId: refund.userId,
          refundId: refund.id,
          status: refund.status,
          message:
            'SSL cancelled or failed the refund; local refund marked FAILED (booking unchanged).',
        });

        return {
          refund,
          sslLive,
          outcome:
            'SSL cancelled/failed this refund — marked FAILED locally; booking was not cancelled.',
        };
      }

      const refund = await this.prismaService.refund.update({
        where: { id: refundId },
        data: {
          sslRawResponse: liveJson,
          sslGatewayStatus: parsed.sslStatus ?? parsed.normalizedStatus,
        },
      });
      return {
        refund,
        sslLive,
        outcome:
          'Stored latest SSL query snapshot. No automatic local status change for this combination.',
      };
    }

    const refund = await this.prismaService.refund.update({
      where: { id: refundId },
      data: {
        sslRawResponse: liveJson,
        sslGatewayStatus: parsed.sslStatus ?? parsed.normalizedStatus,
      },
    });

    return {
      refund,
      sslLive,
      outcome:
        parsed.normalizedStatus === 'PROCESSING'
          ? 'SSL still processing; try sync again later.'
          : 'SSL status unclear; snapshot stored.',
    };
  }

  private static mergeAdminNoteWithSsl(
    adminNote?: string,
    sslReason?: string,
  ): string | undefined {
    const a = adminNote?.trim();
    const r = sslReason?.trim();
    if (!a && !r) return undefined;
    if (!r) return a;
    if (!a) return `[SSL] ${r}`;
    return `${a} | [SSL] ${r}`;
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

          // Keep booking CONFIRMED and seats held — user only loses the refund path, not the ticket.

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
