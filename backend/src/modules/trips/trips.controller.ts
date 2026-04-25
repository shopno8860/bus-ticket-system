import { Controller, Get, Param, Query } from '@nestjs/common';
import { Trip } from '@prisma/client';
import { SearchTripsDto } from './dto/search-trips.dto';
import { TripsService } from './trips.service';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  async findAll(@Query() searchTripsDto: SearchTripsDto): Promise<Trip[]> {
    return this.tripsService.findAll(searchTripsDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tripsService.findOneWithSeats(id);
  }
}
