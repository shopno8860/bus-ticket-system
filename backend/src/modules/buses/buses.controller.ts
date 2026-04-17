import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  NotFoundException,
} from '@nestjs/common';
import { Bus } from '@prisma/client';
import { BusesService } from './buses.service';
import { CreateBusDto } from './dto/create-bus.dto';

@Controller('buses')
export class BusesController {
  constructor(private readonly busesService: BusesService) {}

  @Post()
  async create(@Body() createBusDto: CreateBusDto): Promise<Bus> {
    return this.busesService.create(createBusDto);
  }

  @Get()
  async findAll(): Promise<Bus[]> {
    return this.busesService.findAll();
  }

  @Get(':id')
  async findOneById(@Param('id') id: string): Promise<Bus> {
    const bus = await this.busesService.findOneById(id);

    if (!bus) {
      throw new NotFoundException('Bus not found');
    }

    return bus;
  }
}
