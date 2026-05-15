import {
  Body,
  Controller,
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
import { Trip, UserRole } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CancelTripDto } from './dto/cancel-trip.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { TripGeneratorService } from './trip-generator.service';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripsService } from './trips.service';

/** Admin CRUD on trips plus schedule generation helpers. */
@ApiTags('Trips (admin)')
@ApiBearerAuth('JWT')
@Controller('trips')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class TripsAdminController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly tripGeneratorService: TripGeneratorService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a scheduled trip' })
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
  @ApiOperation({ summary: 'Update trip fields' })
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
  @ApiOperation({ summary: 'Cancel a trip with reason' })
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

  @Post('seed-and-generate')
  @ApiOperation({
    summary: 'Seed demo routes/buses and generate upcoming trips',
    description: 'Optional replaceAllTrips wipes trips first.',
  })
  async seedAndGenerate(
    @Body()
    body: {
      forceCreate?: boolean;
      daysAhead?: number;
      /** When true, deletes all existing trips first, then rebuilds the schedule. */
      replaceAllTrips?: boolean;
    } = {},
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{
    routesCreated: number;
    busesCreated: number;
    deletedTrips: number;
    createdTrips: number;
  }> {
    console.log('admin_action', {
      actorUserId: currentUser.sub,
      action: 'seed_and_generate_trips',
      replaceAllTrips: body.replaceAllTrips ?? false,
      timestamp: new Date().toISOString(),
    });

    const { routesCreated, busesCreated } =
      await this.tripGeneratorService.seedRoutesAndBuses();
    const deletedTrips = body.replaceAllTrips
      ? await this.tripGeneratorService.deleteAllTrips()
      : 0;
    const createdTrips = await this.tripGeneratorService.createTripsForUpcomingDays(
      body.daysAhead ?? 4,
      {
        forceCreate: body.forceCreate ?? false,
      },
    );

    return {
      routesCreated,
      busesCreated,
      deletedTrips,
      createdTrips,
    };
  }

  @Post('generate-daily')
  @ApiOperation({ summary: 'Cron-style: generate trips for the daily window' })
  async generateDaily(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ date: string; createdTrips: number }> {
    console.log('admin_action', {
      actorUserId: currentUser.sub,
      action: 'generate_daily_trips',
      timestamp: new Date().toISOString(),
    });
    return this.tripGeneratorService.generateDailyTrips();
  }

  @Post('generate-for-date/today')
  @ApiOperation({ summary: 'Generate trips for today (Asia/Dhaka calendar day)' })
  async generateForToday(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ date: string; createdTrips: number }> {
    console.log('admin_action', {
      actorUserId: currentUser.sub,
      action: 'generate_trips_for_today_manual',
      timestamp: new Date().toISOString(),
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const createdTrips =
      await this.tripGeneratorService.createTripsForDate(today);
    const date = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
    return {
      date,
      createdTrips,
    };
  }
}
