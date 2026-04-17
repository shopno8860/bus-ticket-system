import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Seat } from '@prisma/client';
import { CreateSeatsForBusDto } from './dto/create-seats-for-bus.dto';
import { SeatsService } from './seats.service';

@Controller('buses/:busId/seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Post()
  async createForBus(
    @Param('busId') busId: string,
    @Body() createSeatsForBusDto: CreateSeatsForBusDto,
  ): Promise<Seat[]> {
    return this.seatsService.createForBus(busId, createSeatsForBusDto);
  }

  @Get()
  async findAllByBusId(@Param('busId') busId: string): Promise<Seat[]> {
    return this.seatsService.findAllByBusId(busId);
  }
}
