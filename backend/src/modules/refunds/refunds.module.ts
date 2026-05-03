import { Module } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { MailModule } from '../../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { RefundController } from './refund.controller';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { SslCommerzRefundService } from './sslcommerz-refund.service';

@Module({
  imports: [PrismaModule, NotificationsModule, MailModule],
  controllers: [RefundsController, RefundController],
  providers: [RefundsService, SslCommerzRefundService, RolesGuard],
  exports: [RefundsService],
})
export class RefundsModule {}
