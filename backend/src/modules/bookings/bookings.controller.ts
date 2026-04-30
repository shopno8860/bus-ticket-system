import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Booking } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { ConfirmBookingDto } from './dto/confirm-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('my-bookings')
  @UseGuards(AccessTokenGuard)
  async findMyBookings(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<any[]> {
    return this.bookingsService.findMyBookings(user.sub);
  }

  @Post()
  async create(@Body() createBookingDto: CreateBookingDto): Promise<{
    tripId: string;
    seatIds: string[];
    lockExpiresAt: Date;
  }> {
    return this.bookingsService.create(createBookingDto);
  }

  @Patch('confirm')
  @UseGuards(AccessTokenGuard)
  async confirmBooking(
    @Body() confirmBookingDto: ConfirmBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Booking> {
    return this.bookingsService.confirmBooking(confirmBookingDto, user.sub);
  }

  @Get(':id')
  @UseGuards(AccessTokenGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<any> {
    return this.bookingsService.findOne(id, user.sub, user.role);
  }

  @Patch(':id/cancel')
  @UseGuards(AccessTokenGuard)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<any> {
    return this.bookingsService.cancel(id, user.sub);
  }
}
