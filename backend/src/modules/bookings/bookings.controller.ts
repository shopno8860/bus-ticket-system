import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Booking } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { ConfirmBookingDto } from './dto/confirm-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsService } from './bookings.service';

/** Passenger booking flow: list mine, lock seats, confirm after login, cancel. */
@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('my-bookings')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List current user bookings with trips and latest payment' })
  async findMyBookings(@CurrentUser() user: AuthenticatedUser): Promise<any[]> {
    return this.bookingsService.findMyBookings(user.sub);
  }

  @Post()
  @ApiOperation({
    summary: 'Lock seats (creates PENDING booking)',
    description: 'No JWT required for lock; returns lockExpiresAt. Confirm with PATCH /bookings/confirm when logged in.',
  })
  async create(@Body() createBookingDto: CreateBookingDto): Promise<{
    tripId: string;
    seatIds: string[];
    lockExpiresAt: Date;
  }> {
    return this.bookingsService.create(createBookingDto);
  }

  @Patch('confirm')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Attach user and finalize PENDING booking before payment' })
  async confirmBooking(
    @Body() confirmBookingDto: ConfirmBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Booking> {
    return this.bookingsService.confirmBooking(confirmBookingDto, user.sub);
  }

  @Get(':id')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Booking detail', description: 'Owner or ADMIN only.' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<any> {
    return this.bookingsService.findOne(id, user.sub, user.role);
  }

  @Patch(':id/cancel')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Request cancellation for a confirmed booking',
    description: 'Creates a pending refund request; ticket stays active until admin approves.',
  })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<any> {
    return this.bookingsService.cancel(id, user.sub);
  }
}
