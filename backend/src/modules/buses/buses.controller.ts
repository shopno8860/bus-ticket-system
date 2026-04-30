import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { Bus, UserRole } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { BusesService } from './buses.service';
import { CreateBusDto } from './dto/create-bus.dto';

@Controller('buses')
export class BusesController {
  constructor(private readonly busesService: BusesService) {}

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
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
