import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { OperatorsService } from './operators.service';
import { BusesService } from '../buses/buses.service';
import { RoutesService } from '../routes/routes.service';
import { TripsService } from '../trips/trips.service';
import { BookingsService } from '../bookings/bookings.service';
import { SeatsService } from '../seats/seats.service';
import { CreateBusDto } from '../buses/dto/create-bus.dto';
import { UpdateBusDto } from '../buses/dto/update-bus.dto';
import { CreateRouteDto } from '../routes/dto/create-route.dto';
import { UpdateRouteDto } from '../routes/dto/update-route.dto';
import { CreateTripDto } from '../trips/dto/create-trip.dto';
import { UpdateTripDto } from '../trips/dto/update-trip.dto';
import { CancelTripDto } from '../trips/dto/cancel-trip.dto';
import { CreateSeatsForBusDto } from '../seats/dto/create-seats-for-bus.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@ApiTags('Operator Portal')
@ApiBearerAuth('JWT')
@Controller('operator')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.OPERATOR)
export class OperatorsController {
  constructor(
    private readonly operatorsService: OperatorsService,
    private readonly busesService: BusesService,
    private readonly routesService: RoutesService,
    private readonly tripsService: TripsService,
    private readonly bookingsService: BookingsService,
    private readonly seatsService: SeatsService,
  ) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Operator dashboard stats' })
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.operatorsService.getStats(user.operatorId!);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get operator company profile' })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.operatorsService.findOne(user.operatorId!);
  }

  // --- BUSES ---

  @Get('buses')
  @ApiOperation({ summary: 'List own buses' })
  getBuses(@CurrentUser() user: AuthenticatedUser) {
    return this.busesService.findByOperator(user.operatorId!);
  }

  @Post('buses')
  @ApiOperation({ summary: 'Create a bus' })
  createBus(@Body() dto: CreateBusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.busesService.create(dto, user.operatorId!);
  }

  @Patch('buses/:id')
  @ApiOperation({ summary: 'Update own bus' })
  updateBus(@Param('id') id: string, @Body() dto: UpdateBusDto) {
    return this.busesService.update(id, dto);
  }

  @Delete('buses/:id')
  @ApiOperation({ summary: 'Delete own bus' })
  deleteBus(@Param('id') id: string) {
    return this.busesService.remove(id);
  }

  @Post('buses/:busId/seats')
  @ApiOperation({ summary: 'Generate seat layout for own bus' })
  createSeats(
    @Param('busId') busId: string,
    @Body() dto: CreateSeatsForBusDto,
  ) {
    return this.seatsService.createForBus(busId, dto);
  }

  // --- ROUTES ---

  @Get('routes')
  @ApiOperation({ summary: 'List own routes' })
  getRoutes(@CurrentUser() user: AuthenticatedUser) {
    return this.routesService.findByOperator(user.operatorId!);
  }

  @Post('routes')
  @ApiOperation({ summary: 'Create a route' })
  createRoute(
    @Body() dto: CreateRouteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.routesService.create(dto, user.operatorId!);
  }

  @Patch('routes/:id')
  @ApiOperation({ summary: 'Update own route' })
  updateRoute(@Param('id') id: string, @Body() dto: UpdateRouteDto) {
    return this.routesService.update(id, dto);
  }

  @Delete('routes/:id')
  @ApiOperation({ summary: 'Delete own route' })
  deleteRoute(@Param('id') id: string) {
    return this.routesService.remove(id);
  }

  // --- TRIPS ---

  @Get('trips')
  @ApiOperation({ summary: 'List own trips' })
  getTrips(@CurrentUser() user: AuthenticatedUser) {
    return this.tripsService.findByOperator(user.operatorId!);
  }

  @Post('trips')
  @ApiOperation({ summary: 'Create a trip' })
  createTrip(
    @Body() dto: CreateTripDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tripsService.create(dto, user.operatorId!);
  }

  @Patch('trips/:id')
  @ApiOperation({ summary: 'Update own trip' })
  updateTrip(@Param('id') id: string, @Body() dto: UpdateTripDto) {
    return this.tripsService.update(id, dto);
  }

  @Post('trips/:id/cancel')
  @ApiOperation({ summary: 'Cancel own trip' })
  cancelTrip(
    @Param('id') id: string,
    @Body() dto: CancelTripDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tripsService.cancel(id, dto.reason, user.sub);
  }

  // --- BOOKINGS ---

  @Get('bookings')
  @ApiOperation({ summary: 'List own operator bookings' })
  getBookings(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.findByOperator(user.operatorId!);
  }

  // --- STAFF ---

  @Get('staff')
  @ApiOperation({ summary: 'List own staff' })
  getStaff(@CurrentUser() user: AuthenticatedUser) {
    return this.operatorsService.findStaff(user.operatorId!);
  }

  @Post('staff')
  @ApiOperation({ summary: 'Create staff user' })
  createStaff(
    @Body() dto: CreateStaffDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operatorsService.createStaff(user.operatorId!, dto);
  }

  @Patch('staff/:id')
  @ApiOperation({ summary: 'Update staff user' })
  updateStaff(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.operatorsService.updateStaff(id, dto);
  }

  @Delete('staff/:id')
  @ApiOperation({ summary: 'Delete staff user' })
  deleteStaff(@Param('id') id: string) {
    return this.operatorsService.deleteStaff(id);
  }
}
