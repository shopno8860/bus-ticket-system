import { Body, Controller, Patch, Post } from '@nestjs/common';
import { Booking } from '@prisma/client';
import { ConfirmBookingDto } from './dto/confirm-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  async create(@Body() createBookingDto: CreateBookingDto): Promise<{
    tripId: string;
    seatIds: string[];
    lockExpiresAt: Date;
  }> {
    return this.bookingsService.create(createBookingDto);
  }

  @Patch('confirm')
  async confirmBooking(
    @Body() confirmBookingDto: ConfirmBookingDto,
  ): Promise<Booking> {
    return this.bookingsService.confirmBooking(confirmBookingDto);
  }
}
