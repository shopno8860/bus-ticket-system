import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { OperatorsService } from './operators.service';
import { BookingsService } from '../bookings/bookings.service';

@ApiTags('Staff Portal')
@ApiBearerAuth('JWT')
@Controller('staff')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.STAFF)
export class StaffController {
  constructor(
    private readonly operatorsService: OperatorsService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Staff dashboard stats' })
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    const op = await this.operatorsService.findOne(user.operatorId!);
    const bookings = await this.bookingsService.countByOperator(
      user.operatorId!,
    );
    return {
      operatorName: op.companyName,
      operatorLogo: op.logo,
      totalBookings: bookings,
    };
  }

  @Get('bookings')
  @ApiOperation({ summary: 'List own operator bookings' })
  getBookings(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.findByOperator(user.operatorId!);
  }

  @Post('bookings')
  @ApiOperation({ summary: 'Staff creates a confirmed booking' })
  createBooking(@Body() dto: any, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.createStaffBooking(
      dto,
      user.operatorId!,
      user.sub,
    );
  }
}
