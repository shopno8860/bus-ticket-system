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

  /**
   * Returns the signed-in user's bookings (with trip, seats, latest payment).
   * লগইন করা user-এর নিজের বুকিংগুলা (details সহ) দেখায়।
   */
  @Get('my-bookings')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List current user bookings with trips and latest payment' })
  async findMyBookings(@CurrentUser() user: AuthenticatedUser): Promise<any[]> {
    return this.bookingsService.findMyBookings(user.sub);
  }

  /**
   * Locks seats for a trip and creates a PENDING booking without requiring JWT.
   * প্রথম ধাপ: seat hold/lock করে `lockExpiresAt` রিটার্ন করে; পরে confirm করতে হবে।
   */
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

  /**
   * Confirms a previously locked booking for the authenticated user and sets payment deadline.
   * দ্বিতীয় ধাপ: লগইন অবস্থায় booking confirm করে payment window শুরু করে।
   */
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

  /**
   * Returns booking details by ID (owner or ADMIN).
   * বুকিং ডিটেইল দেখায়; owner/ADMIN ছাড়া দেখা যাবে না।
   */
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

  /**
   * Requests cancellation for a confirmed booking (creates a pending refund request).
   * confirmed বুকিং cancel request করলে refund request pending থাকে (admin approve লাগবে)।
   */
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
