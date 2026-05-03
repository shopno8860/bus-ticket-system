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
import { Refund, UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { AdminBookingsFilterDto } from '../bookings/dto/admin-bookings-filter.dto';
import { CancelBookingDto } from '../bookings/dto/cancel-booking.dto';
import { BookingsService } from '../bookings/bookings.service';
import { BusesService } from '../buses/buses.service';
import { CreateBusDto } from '../buses/dto/create-bus.dto';
import { UpdateBusDto } from '../buses/dto/update-bus.dto';
import { AdminPaymentsFilterDto } from '../payments/dto/admin-payments-filter.dto';
import { PaymentsService } from '../payments/payments.service';
import { AdminRefundsFilterDto } from '../refunds/dto/admin-refunds-filter.dto';
import { ReviewRefundDto } from '../refunds/dto/review-refund.dto';
import { RefundsService } from '../refunds/refunds.service';
import { CreateRouteDto } from '../routes/dto/create-route.dto';
import { UpdateRouteDto } from '../routes/dto/update-route.dto';
import { RoutesService } from '../routes/routes.service';
import { CreateSeatsForBusDto } from '../seats/dto/create-seats-for-bus.dto';
import { SeatsService } from '../seats/seats.service';
import { CancelTripDto } from '../trips/dto/cancel-trip.dto';
import { CreateTripDto } from '../trips/dto/create-trip.dto';
import { AdminTripsFilterDto } from '../trips/dto/admin-trips-filter.dto';
import { UpdateTripDto } from '../trips/dto/update-trip.dto';
import { TripsService } from '../trips/trips.service';
import { ChangeUserRoleDto } from '../users/dto/change-user-role.dto';
import { type UserResponse, UsersService } from '../users/users.service';
import { AuditLogService } from './audit-log.service';

@Controller('admin')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly bookingsService: BookingsService,
    private readonly paymentsService: PaymentsService,
    private readonly refundsService: RefundsService,
    private readonly tripsService: TripsService,
    private readonly busesService: BusesService,
    private readonly routesService: RoutesService,
    private readonly seatsService: SeatsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.usersService.getDashboardStats();
  }

  @Get('users')
  async getUsers(@Query('page') page = '1', @Query('limit') limit = '20') {
    const users = await this.usersService.findAll();
    return this.paginate(users, page, limit);
  }

  @Patch('users/:id/role')
  async changeUserRole(
    @Param('id') id: string,
    @Body() dto: ChangeUserRoleDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserResponse> {
    const updated = await this.usersService.changeUserRole(
      id,
      currentUser.sub,
      dto,
    );
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'change_user_role',
      targetType: 'user',
      targetId: id,
      payload: { role: dto.role },
    });
    return updated;
  }

  @Get('bookings')
  async getBookings(
    @Query() filters: AdminBookingsFilterDto,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const bookings = await this.bookingsService.findAllAdmin(filters);
    return this.paginate(bookings, page, limit);
  }

  @Patch('bookings/:id/cancel')
  async cancelBooking(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const cancelled = await this.bookingsService.cancelByAdmin(
      id,
      dto.reason,
      currentUser.sub,
    );
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'cancel_booking',
      targetType: 'booking',
      targetId: id,
      payload: { reason: dto.reason },
    });
    return cancelled;
  }

  @Get('payments')
  async getPayments(
    @Query() filters: AdminPaymentsFilterDto,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const payments = await this.paymentsService.findAllAdmin(filters);
    return this.paginate(payments, page, limit);
  }

  @Get('refunds')
  async getRefunds(
    @Query() filters: AdminRefundsFilterDto,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const refunds = await this.refundsService.findAllAdmin(filters);
    return this.paginate(refunds, page, limit);
  }

  @Patch('refunds/:id/approve')
  async approveRefund(
    @Param('id') id: string,
    @Body() dto: ReviewRefundDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Refund> {
    const approved = await this.refundsService.approve(
      id,
      currentUser.sub,
      dto.adminNote,
    );
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'approve_refund',
      targetType: 'refund',
      targetId: id,
      payload: { adminNote: dto.adminNote ?? null },
    });
    return approved;
  }

  @Patch('refunds/:id/reject')
  async rejectRefund(
    @Param('id') id: string,
    @Body() dto: ReviewRefundDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Refund> {
    const rejected = await this.refundsService.reject(
      id,
      currentUser.sub,
      dto.adminNote,
    );
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'reject_refund',
      targetType: 'refund',
      targetId: id,
      payload: { adminNote: dto.adminNote ?? null },
    });
    return rejected;
  }

  @Post('refunds/:id/ssl-sync')
  async syncSslRefund(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{
    refund: Refund;
    sslLive: Record<string, unknown>;
    outcome: string;
  }> {
    const result = await this.refundsService.adminSyncSslRefundStatus(
      id,
      currentUser.sub,
    );
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'sync_ssl_refund',
      targetType: 'refund',
      targetId: id,
      payload: { outcome: result.outcome },
    });
    return result;
  }

  @Post('trips')
  async createTrip(
    @Body() dto: CreateTripDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const trip = await this.tripsService.create(dto);
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'create_trip',
      targetType: 'trip',
      targetId: trip.id,
      payload: { busId: dto.busId, routeId: dto.routeId },
    });
    return trip;
  }

  @Patch('trips/:id')
  async updateTrip(
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const trip = await this.tripsService.update(id, dto);
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'update_trip',
      targetType: 'trip',
      targetId: id,
      payload: dto as Record<string, unknown>,
    });
    return trip;
  }

  @Patch('trips/:id/cancel')
  async cancelTrip(
    @Param('id') id: string,
    @Body() dto: CancelTripDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const trip = await this.tripsService.cancel(
      id,
      dto.reason,
      currentUser.sub,
    );
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'cancel_trip',
      targetType: 'trip',
      targetId: id,
      payload: { reason: dto.reason },
    });
    return trip;
  }

  @Get('trips')
  async getTrips(@Query() filters: AdminTripsFilterDto) {
    return this.tripsService.findAllAdmin(filters);
  }

  @Post('buses')
  async createBus(
    @Body() dto: CreateBusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const bus = await this.busesService.create(dto);
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'create_bus',
      targetType: 'bus',
      targetId: bus.id,
      payload: { registrationNumber: dto.registrationNumber },
    });
    return bus;
  }

  @Patch('buses/:id')
  async updateBus(
    @Param('id') id: string,
    @Body() dto: UpdateBusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const bus = await this.busesService.update(id, dto);
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'update_bus',
      targetType: 'bus',
      targetId: id,
      payload: dto as Record<string, unknown>,
    });
    return bus;
  }

  @Delete('buses/:id')
  async deleteBus(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const bus = await this.busesService.remove(id);
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'delete_bus',
      targetType: 'bus',
      targetId: id,
    });
    return bus;
  }

  @Post('routes')
  async createRoute(
    @Body() dto: CreateRouteDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const route = await this.routesService.create(dto);
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'create_route',
      targetType: 'route',
      targetId: route.id,
      payload: { origin: dto.origin, destination: dto.destination },
    });
    return route;
  }

  @Patch('routes/:id')
  async updateRoute(
    @Param('id') id: string,
    @Body() dto: UpdateRouteDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const route = await this.routesService.update(id, dto);
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'update_route',
      targetType: 'route',
      targetId: id,
      payload: dto as Record<string, unknown>,
    });
    return route;
  }

  @Delete('routes/:id')
  async deleteRoute(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const route = await this.routesService.remove(id);
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'delete_route',
      targetType: 'route',
      targetId: id,
    });
    return route;
  }

  @Post('buses/:busId/seats')
  async createSeatsForBus(
    @Param('busId') busId: string,
    @Body() dto: CreateSeatsForBusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const seats = await this.seatsService.createForBus(busId, dto);
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'create_bus_seats',
      targetType: 'bus',
      targetId: busId,
      payload: { seatsCreated: seats.length },
    });
    return seats;
  }

  private paginate<T>(items: T[], pageRaw: string, limitRaw: string) {
    const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1);
    const limit = Math.max(1, Number.parseInt(limitRaw, 10) || 20);
    const start = (page - 1) * limit;
    const data = items.slice(start, start + limit);
    return {
      items: data,
      total: items.length,
      page,
      limit,
      totalPages: Math.ceil(items.length / limit),
    };
  }
}
