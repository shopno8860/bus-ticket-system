import { Module } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [RefundsController],
  providers: [RefundsService, RolesGuard],
  exports: [RefundsService],
})
export class RefundsModule {}
