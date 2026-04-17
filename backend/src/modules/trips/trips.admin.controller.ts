import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Trip, UserRole } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CancelTripDto } from './dto/cancel-trip.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripsService } from './trips.service';

@Controller('trips')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class TripsAdminController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  async create(
    @Body() createTripDto: CreateTripDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Trip> {
    console.log('admin_action', {
      actorUserId: currentUser.sub,
      action: 'create_trip',
      targetRouteId: createTripDto.routeId,
      targetBusId: createTripDto.busId,
      timestamp: new Date().toISOString(),
    });
    return this.tripsService.create(createTripDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTripDto: UpdateTripDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Trip> {
    console.log('admin_action', {
      actorUserId: currentUser.sub,
      action: 'update_trip',
      targetTripId: id,
      timestamp: new Date().toISOString(),
    });
    return this.tripsService.update(id, updateTripDto);
  }

  @Patch(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() cancelTripDto: CancelTripDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Trip> {
    console.log('admin_action', {
      actorUserId: currentUser.sub,
      action: 'cancel_trip',
      targetTripId: id,
      timestamp: new Date().toISOString(),
    });
    return this.tripsService.cancel(id, cancelTripDto.reason, currentUser.sub);
  }
}
