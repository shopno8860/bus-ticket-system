import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Bus, UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { BusesService } from './buses.service';
import { CreateBusDto } from './dto/create-bus.dto';

/** Public bus catalog; create restricted to ADMIN. */
@ApiTags('Buses')
@Controller('buses')
export class BusesController {
  constructor(private readonly busesService: BusesService) {}

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create bus (ADMIN)' })
  async create(
    @Body() createBusDto: CreateBusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Bus> {
    return this.busesService.create(createBusDto, currentUser.operatorId!);
  }

  @Get()
  @ApiOperation({ summary: 'List all buses' })
  async findAll(): Promise<Bus[]> {
    return this.busesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bus by id with seats' })
  async findOneById(@Param('id') id: string): Promise<Bus> {
    const bus = await this.busesService.findOneById(id);

    if (!bus) {
      throw new NotFoundException('Bus not found');
    }

    return bus;
  }
}
