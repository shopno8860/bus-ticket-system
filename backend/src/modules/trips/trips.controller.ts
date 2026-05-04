import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Trip } from '@prisma/client';
import { SearchTripsDto } from './dto/search-trips.dto';
import { TripsService } from './trips.service';

/** Public trip search and trip detail with seat map for booking UI. */
@ApiTags('Trips (public)')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  @ApiOperation({
    summary: 'Search trips',
    description: 'Query: origin, destination, date, busType, busClass, price filters, etc.',
  })
  async findAll(
    @Query() searchTripsDto: SearchTripsDto,
  ): Promise<Array<Trip & { availableSeats: number }>> {
    return this.tripsService.findAll(searchTripsDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Trip with bus, route, seats, and availability counts' })
  async findOne(@Param('id') id: string) {
    return this.tripsService.findOneWithSeats(id);
  }
}
