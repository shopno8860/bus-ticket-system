import { Module } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { RefundsAdminController } from './refunds.admin.controller';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';

@Module({
  imports: [PrismaModule],
  controllers: [RefundsController, RefundsAdminController],
  providers: [RefundsService, RolesGuard],
  exports: [RefundsService],
})
export class RefundsModule {}
