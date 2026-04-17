import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminPaymentsFilterDto } from './dto/admin-payments-filter.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class PaymentsAdminController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('admin')
  async findAll(@Query() filters: AdminPaymentsFilterDto) {
    return this.paymentsService.findAllAdmin(filters);
  }
}
