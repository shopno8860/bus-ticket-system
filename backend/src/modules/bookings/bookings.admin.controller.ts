import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Booking, UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { BookingsService } from './bookings.service';
import { AdminBookingsFilterDto } from './dto/admin-bookings-filter.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

@Controller('bookings')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class BookingsAdminController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('admin')
  async findAllAdmin(@Query() filters: AdminBookingsFilterDto) {
    return this.bookingsService.findAllAdmin(filters);
  }

  @Patch(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() cancelBookingDto: CancelBookingDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Booking> {
    console.log('admin_action', {
      actorUserId: currentUser.sub,
      action: 'cancel_booking',
      targetBookingId: id,
      timestamp: new Date().toISOString(),
    });
    return this.bookingsService.cancelByAdmin(
      id,
      cancelBookingDto.reason,
      currentUser.sub,
    );
  }
}
