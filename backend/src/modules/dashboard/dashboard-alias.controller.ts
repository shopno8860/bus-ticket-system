import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { AdminBookingsFilterDto } from '../bookings/dto/admin-bookings-filter.dto';
import { CancelBookingDto } from '../bookings/dto/cancel-booking.dto';
import { CreateBusDto } from '../buses/dto/create-bus.dto';
import { UpdateBusDto } from '../buses/dto/update-bus.dto';
import { AdminPaymentsFilterDto } from '../payments/dto/admin-payments-filter.dto';
import { AdminRefundsFilterDto } from '../refunds/dto/admin-refunds-filter.dto';
import { ReviewRefundDto } from '../refunds/dto/review-refund.dto';
import { CreateRouteDto } from '../routes/dto/create-route.dto';
import { UpdateRouteDto } from '../routes/dto/update-route.dto';
import { CreateSeatsForBusDto } from '../seats/dto/create-seats-for-bus.dto';
import { CancelTripDto } from '../trips/dto/cancel-trip.dto';
import { CreateTripDto } from '../trips/dto/create-trip.dto';
import { AdminTripsFilterDto } from '../trips/dto/admin-trips-filter.dto';
import { UpdateTripDto } from '../trips/dto/update-trip.dto';
import { ChangeUserRoleDto } from '../users/dto/change-user-role.dto';
import { CreateAdminBookingDto } from '../admin-bookings/dto/create-admin-booking.dto';
import { CreateOperatorDto } from '../operators/dto/create-operator.dto';
import { UpdateOperatorDto } from '../operators/dto/update-operator.dto';
import { CreateStaffDto } from '../operators/dto/create-staff.dto';
import { UpdateStaffDto } from '../operators/dto/update-staff.dto';
import { DashboardController } from './dashboard.controller';

/** @deprecated Use /dashboard/* — forwards to DashboardController */
@ApiTags('Admin (deprecated)')
@ApiBearerAuth('JWT')
@Controller('admin')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAliasController {
  constructor(private readonly dashboard: DashboardController) {}

  @Get('dashboard/stats')
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.getDashboardStats(user);
  }

  @Get('users')
  getUsers(@Query('page') page: string, @Query('limit') limit: string) {
    return this.dashboard.getUsers(page, limit);
  }

  @Patch('users/:id/role')
  changeUserRole(
    @Param('id') id: string,
    @Body() dto: ChangeUserRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.changeUserRole(id, dto, user);
  }

  @Get('bookings')
  getBookings(
    @Query() filters: AdminBookingsFilterDto,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.getBookings(filters, page, limit, user);
  }

  @Patch('bookings/:id/cancel')
  cancelBooking(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.cancelBooking(id, dto, user);
  }

  @Post('bookings')
  createBooking(
    @Body() dto: CreateAdminBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.createManualBooking(dto, user);
  }

  @Get('payments')
  getPayments(
    @Query() filters: AdminPaymentsFilterDto,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.getPayments(filters, page, limit, user);
  }

  @Get('refunds')
  getRefunds(
    @Query() filters: AdminRefundsFilterDto,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.getRefunds(filters, page, limit, user);
  }

  @Patch('refunds/:id/approve')
  approveRefund(
    @Param('id') id: string,
    @Body() dto: ReviewRefundDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.approveRefund(id, dto, user);
  }

  @Patch('refunds/:id/reject')
  rejectRefund(
    @Param('id') id: string,
    @Body() dto: ReviewRefundDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.rejectRefund(id, dto, user);
  }

  @Post('refunds/:id/ssl-sync')
  syncSsl(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.syncSslRefund(id, user);
  }

  @Get('buses')
  getBuses(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.getBuses(user);
  }

  @Post('buses')
  createBus(@Body() dto: CreateBusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.createBus(dto, user);
  }

  @Patch('buses/:id')
  updateBus(
    @Param('id') id: string,
    @Body() dto: UpdateBusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.updateBus(id, dto, user);
  }

  @Delete('buses/:id')
  deleteBus(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.deleteBus(id, user);
  }

  @Post('buses/:busId/seats')
  createSeats(
    @Param('busId') busId: string,
    @Body() dto: CreateSeatsForBusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.createSeatsForBus(busId, dto, user);
  }

  @Get('routes')
  getRoutes(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.getRoutes(user);
  }

  @Post('routes')
  createRoute(
    @Body() dto: CreateRouteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.createRoute(dto, user);
  }

  @Patch('routes/:id')
  updateRoute(
    @Param('id') id: string,
    @Body() dto: UpdateRouteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.updateRoute(id, dto, user);
  }

  @Delete('routes/:id')
  deleteRoute(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.deleteRoute(id, user);
  }

  @Get('trips')
  getTrips(
    @Query() filters: AdminTripsFilterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.getTrips(filters, user);
  }

  @Post('trips')
  createTrip(
    @Body() dto: CreateTripDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.createTrip(dto, user);
  }

  @Patch('trips/:id')
  updateTrip(
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.updateTrip(id, dto, user);
  }

  @Patch('trips/:id/cancel')
  cancelTrip(
    @Param('id') id: string,
    @Body() dto: CancelTripDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.cancelTrip(id, dto, user);
  }

  @Get('operators')
  getOperators() {
    return this.dashboard.getOperators();
  }

  @Get('operators/:id')
  getOperator(@Param('id') id: string) {
    return this.dashboard.getOperator(id);
  }

  @Post('operators')
  createOperator(
    @Body() dto: CreateOperatorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.createOperator(dto, user);
  }

  @Patch('operators/:id')
  updateOperator(
    @Param('id') id: string,
    @Body() dto: UpdateOperatorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.updateOperator(id, dto, user);
  }

  @Post('operators/:id/suspend')
  suspendOperator(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.suspendOperator(id, user);
  }

  @Post('operators/:id/activate')
  activateOperator(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.activateOperator(id, user);
  }

  @Get('operators/:id/stats')
  getOperatorStats(@Param('id') id: string) {
    return this.dashboard.getOperatorStats(id);
  }
}

/** @deprecated Use /dashboard/* */
@ApiTags('Operator Portal (deprecated)')
@ApiBearerAuth('JWT')
@Controller('operator')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.OPERATOR)
export class OperatorAliasController {
  constructor(private readonly dashboard: DashboardController) {}

  @Get('dashboard/stats')
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.getDashboardStats(user);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.getProfile(user);
  }

  @Get('buses')
  getBuses(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.getBuses(user);
  }

  @Post('buses')
  createBus(@Body() dto: CreateBusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.createBus(dto, user);
  }

  @Patch('buses/:id')
  updateBus(
    @Param('id') id: string,
    @Body() dto: UpdateBusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.updateBus(id, dto, user);
  }

  @Delete('buses/:id')
  deleteBus(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.deleteBus(id, user);
  }

  @Post('buses/:busId/seats')
  createSeats(
    @Param('busId') busId: string,
    @Body() dto: CreateSeatsForBusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.createSeatsForBus(busId, dto, user);
  }

  @Get('routes')
  getRoutes(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.getRoutes(user);
  }

  @Post('routes')
  createRoute(
    @Body() dto: CreateRouteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.createRoute(dto, user);
  }

  @Patch('routes/:id')
  updateRoute(
    @Param('id') id: string,
    @Body() dto: UpdateRouteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.updateRoute(id, dto, user);
  }

  @Delete('routes/:id')
  deleteRoute(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.deleteRoute(id, user);
  }

  @Get('trips')
  getTrips(
    @Query() filters: AdminTripsFilterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.getTrips(filters, user);
  }

  @Post('trips')
  createTrip(
    @Body() dto: CreateTripDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.createTrip(dto, user);
  }

  @Patch('trips/:id')
  updateTrip(
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.updateTrip(id, dto, user);
  }

  @Post('trips/:id/cancel')
  cancelTrip(
    @Param('id') id: string,
    @Body() dto: CancelTripDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.cancelTrip(id, dto, user);
  }

  @Get('bookings')
  getBookings(
    @Query() filters: AdminBookingsFilterDto,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.getBookings(filters, page, limit, user);
  }

  @Get('staff')
  getStaff(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.getStaff(user);
  }

  @Post('staff')
  createStaff(
    @Body() dto: CreateStaffDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.createStaff(dto, user);
  }

  @Patch('staff/:id')
  updateStaff(
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.updateStaff(id, dto, user);
  }

  @Delete('staff/:id')
  deleteStaff(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.deleteStaff(id, user);
  }
}

/** @deprecated Use /dashboard/* */
@ApiTags('Staff Portal (deprecated)')
@ApiBearerAuth('JWT')
@Controller('staff')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.STAFF)
export class StaffAliasController {
  constructor(private readonly dashboard: DashboardController) {}

  @Get('dashboard/stats')
  getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.getDashboardStats(user);
  }

  @Get('bookings')
  getBookings(
    @Query() filters: AdminBookingsFilterDto,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.getBookings(filters, page, limit, user);
  }

  @Post('bookings')
  createBooking(
    @Body() dto: CreateAdminBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.createManualBooking(dto, user);
  }
}
