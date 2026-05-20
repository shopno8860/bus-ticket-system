import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Seat, UserRole } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateSeatsForBusDto } from './dto/create-seats-for-bus.dto';
import { SeatsService } from './seats.service';

/** Seat layout under a bus: public read, ADMIN write. */
@ApiTags('Seats')
@Controller('buses/:busId/seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create/regenerate seats for bus (ADMIN)' })
  async createForBus(
    @Param('busId') busId: string,
    @Body() createSeatsForBusDto: CreateSeatsForBusDto,
  ): Promise<Seat[]> {
    return this.seatsService.createForBus(busId, createSeatsForBusDto);
  }

  @Get()
  @ApiOperation({ summary: 'List seats for bus (public)' })
  async findAllByBusId(@Param('busId') busId: string): Promise<Seat[]> {
    return this.seatsService.findAllByBusId(busId);
  }
}
