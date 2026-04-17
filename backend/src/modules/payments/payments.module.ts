import { Module } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentsAdminController } from './payments.admin.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController, PaymentsAdminController],
  providers: [PaymentsService, RolesGuard],
  exports: [PaymentsService],
})
export class PaymentsModule {}
