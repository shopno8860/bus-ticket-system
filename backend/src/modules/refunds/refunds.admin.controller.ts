import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Refund, UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ReviewRefundDto } from './dto/review-refund.dto';
import { RefundsService } from './refunds.service';

/** Legacy/admin duplicate paths under /refunds (approve/reject). Prefer /admin/refunds when possible. */
@ApiTags('Refunds (admin alt)')
@ApiBearerAuth('JWT')
@Controller('refunds')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class RefundsAdminController {
  constructor(private readonly refundsService: RefundsService) {}

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve refund (ADMIN)' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ReviewRefundDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Refund> {
    console.log('admin_action', {
      actorUserId: currentUser.sub,
      action: 'approve_refund',
      targetRefundId: id,
      timestamp: new Date().toISOString(),
    });
    return this.refundsService.approve(id, currentUser.sub, dto.adminNote);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject refund (ADMIN)' })
  async reject(
    @Param('id') id: string,
    @Body() dto: ReviewRefundDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Refund> {
    console.log('admin_action', {
      actorUserId: currentUser.sub,
      action: 'reject_refund',
      targetRefundId: id,
      timestamp: new Date().toISOString(),
    });
    return this.refundsService.reject(id, currentUser.sub, dto.adminNote);
  }
}
