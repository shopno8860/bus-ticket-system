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
import { Refund, UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permission } from '../../auth/permissions/permission.enum';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { TenantScopeService } from '../../common/scoping/tenant-scope.service';
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
import { SearchTripsDto } from '../trips/dto/search-trips.dto';
import { UpdateTripDto } from '../trips/dto/update-trip.dto';
import { TripsService } from '../trips/trips.service';
import { ChangeUserRoleDto } from '../users/dto/change-user-role.dto';
import { type UserResponse, UsersService } from '../users/users.service';
import { CreateAdminBookingDto } from '../admin-bookings/dto/create-admin-booking.dto';
import { OperatorsService } from '../operators/operators.service';
import { CreateOperatorDto } from '../operators/dto/create-operator.dto';
import { UpdateOperatorDto } from '../operators/dto/update-operator.dto';
import { CreateStaffDto } from '../operators/dto/create-staff.dto';
import { UpdateStaffDto } from '../operators/dto/update-staff.dto';
import { AuditLogService } from '../admin/audit-log.service';
import { DashboardBookingsService } from './dashboard-bookings.service';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT')
@Controller('dashboard')
@UseGuards(AccessTokenGuard, PermissionsGuard)
export class DashboardController {
  constructor(
    private readonly usersService: UsersService,
    private readonly bookingsService: BookingsService,
    private readonly paymentsService: PaymentsService,
    private readonly refundsService: RefundsService,
    private readonly tripsService: TripsService,
    private readonly busesService: BusesService,
    private readonly routesService: RoutesService,
    private readonly seatsService: SeatsService,
    private readonly dashboardBookingsService: DashboardBookingsService,
    private readonly operatorsService: OperatorsService,
    private readonly auditLogService: AuditLogService,
    private readonly tenantScope: TenantScopeService,
  ) {}

  @Get('stats')
  @RequirePermissions(Permission.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Role-scoped dashboard KPIs' })
  async getDashboardStats(@CurrentUser() user: AuthenticatedUser) {
    if (user.role === UserRole.ADMIN) {
      return this.usersService.getDashboardStats();
    }

    this.tenantScope.requireOperatorContext(user);
    await this.tenantScope.assertOperatorActive(user.operatorId!);

    if (user.role === UserRole.STAFF) {
      const op = await this.operatorsService.findOne(user.operatorId!);
      const totalBookings = await this.bookingsService.countByOperator(
        user.operatorId!,
      );
      return {
        operatorName: op.companyName,
        operatorLogo: op.logo,
        totalBookings,
      };
    }

    return this.operatorsService.getStats(user.operatorId!);
  }

  @Get('profile')
  @RequirePermissions(Permission.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Operator company profile' })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    this.tenantScope.requireOperatorContext(user);
    return this.operatorsService.findOne(user.operatorId!);
  }

  @Get('users')
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Paginated user list' })
  async getUsers(@Query('page') page = '1', @Query('limit') limit = '20') {
    const users = await this.usersService.findAll();
    return this.paginate(users, page, limit);
  }

  @Patch('users/:id/role')
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Change user role with audit log' })
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
  @RequirePermissions(Permission.MANAGE_BOOKINGS)
  @ApiOperation({ summary: 'Filtered bookings, paginated' })
  async getBookings(
    @Query() filters: AdminBookingsFilterDto,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const operatorId = this.tenantScope.resolveScopedOperatorId(
      user,
      filters.operatorId,
    );
    const bookings = await this.bookingsService.findAllAdmin(
      filters,
      operatorId,
    );
    return this.paginate(bookings, page, limit);
  }

  @Patch('bookings/:id/cancel')
  @RequirePermissions(Permission.MANAGE_BOOKINGS)
  @ApiOperation({ summary: 'Cancel booking from dashboard' })
  async cancelBooking(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const booking = await this.bookingsService.findOneForDashboard(id);
    this.tenantScope.assertResourceOwnership(
      currentUser,
      booking.operatorId,
    );

    const cancelled = await this.bookingsService.cancelByAdmin(
      id,
      dto.reason,
      currentUser.sub,
    );

    if (currentUser.role === UserRole.ADMIN) {
      await this.auditLogService.logAction({
        actorUserId: currentUser.sub,
        action: 'cancel_booking',
        targetType: 'booking',
        targetId: id,
        payload: { reason: dto.reason },
      });
    }

    return cancelled;
  }

  @Post('bookings')
  @RequirePermissions(Permission.BOOK_TICKET)
  @ApiOperation({ summary: 'Create confirmed manual booking' })
  createManualBooking(
    @Body() dto: CreateAdminBookingDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.dashboardBookingsService.createManualBooking(dto, currentUser);
  }

  @Get('booking/routes')
  @RequirePermissions(Permission.BOOK_TICKET)
  @ApiOperation({
    summary: 'Routes for book-ticket search filters (operator-scoped)',
  })
  async getBookingRoutes(
    @CurrentUser() user: AuthenticatedUser,
    @Query('operatorId') operatorId?: string,
  ) {
    const scope = this.tenantScope.resolveListScope(user, operatorId);
    if (scope.operatorId) {
      return this.routesService.findByOperator(scope.operatorId);
    }
    return this.routesService.findAll();
  }

  @Get('trips/search')
  @RequirePermissions(Permission.BOOK_TICKET)
  @ApiOperation({
    summary: 'Search trips for manual booking (operator-scoped for OPERATOR/STAFF)',
  })
  async searchTripsForBooking(
    @Query() searchTripsDto: SearchTripsDto,
    @Query('operatorId') queryOperatorId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const operatorId = this.tenantScope.resolveScopedOperatorId(
      user,
      queryOperatorId,
    );
    return this.tripsService.findAll(searchTripsDto, operatorId);
  }

  @Get('payments')
  @RequirePermissions(Permission.MANAGE_PAYMENTS)
  @ApiOperation({ summary: 'Filtered payments, paginated' })
  async getPayments(
    @Query() filters: AdminPaymentsFilterDto,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const operatorId = this.tenantScope.resolveScopedOperatorId(
      user,
      filters.operatorId,
    );
    const payments = await this.paymentsService.findAllAdmin(
      filters,
      operatorId,
    );
    return this.paginate(payments, page, limit);
  }

  @Get('refunds')
  @RequirePermissions(Permission.MANAGE_REFUNDS)
  @ApiOperation({ summary: 'Filtered refunds, paginated' })
  async getRefunds(
    @Query() filters: AdminRefundsFilterDto,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const operatorId = this.tenantScope.resolveScopedOperatorId(
      user,
      filters.operatorId,
    );
    const refunds = await this.refundsService.findAllAdmin(filters, operatorId);
    return this.paginate(refunds, page, limit);
  }

  @Patch('refunds/:id/approve')
  @RequirePermissions(Permission.MANAGE_REFUNDS)
  async approveRefund(
    @Param('id') id: string,
    @Body() dto: ReviewRefundDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Refund> {
    const refund = await this.refundsService.findOneById(id);
    this.tenantScope.assertResourceOwnership(
      currentUser,
      refund.operatorId,
    );

    const approved = await this.refundsService.approve(
      id,
      currentUser.sub,
      dto.adminNote,
    );

    if (currentUser.role === UserRole.ADMIN) {
      await this.auditLogService.logAction({
        actorUserId: currentUser.sub,
        action: 'approve_refund',
        targetType: 'refund',
        targetId: id,
        payload: { adminNote: dto.adminNote ?? null },
      });
    }

    return approved;
  }

  @Patch('refunds/:id/reject')
  @RequirePermissions(Permission.MANAGE_REFUNDS)
  async rejectRefund(
    @Param('id') id: string,
    @Body() dto: ReviewRefundDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Refund> {
    const refund = await this.refundsService.findOneById(id);
    this.tenantScope.assertResourceOwnership(
      currentUser,
      refund.operatorId,
    );

    const rejected = await this.refundsService.reject(
      id,
      currentUser.sub,
      dto.adminNote,
    );

    if (currentUser.role === UserRole.ADMIN) {
      await this.auditLogService.logAction({
        actorUserId: currentUser.sub,
        action: 'reject_refund',
        targetType: 'refund',
        targetId: id,
        payload: { adminNote: dto.adminNote ?? null },
      });
    }

    return rejected;
  }

  @Post('refunds/:id/ssl-sync')
  @RequirePermissions(Permission.MANAGE_REFUNDS)
  async syncSslRefund(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const refund = await this.refundsService.findOneById(id);
    this.tenantScope.assertResourceOwnership(
      currentUser,
      refund.operatorId,
    );

    const result = await this.refundsService.adminSyncSslRefundStatus(
      id,
      currentUser.sub,
    );

    if (currentUser.role === UserRole.ADMIN) {
      await this.auditLogService.logAction({
        actorUserId: currentUser.sub,
        action: 'sync_ssl_refund',
        targetType: 'refund',
        targetId: id,
        payload: { outcome: result.outcome },
      });
    }

    return result;
  }

  @Get('buses')
  @RequirePermissions(Permission.MANAGE_BUSES)
  async getBuses(
    @CurrentUser() user: AuthenticatedUser,
    @Query('operatorId') operatorId?: string,
  ) {
    const scope = this.tenantScope.resolveListScope(user, operatorId);
    if (scope.operatorId) {
      return this.busesService.findByOperator(scope.operatorId);
    }
    return this.busesService.findAll();
  }

  @Post('buses')
  @RequirePermissions(Permission.MANAGE_BUSES)
  async createBus(
    @Body() dto: CreateBusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const operatorId = this.tenantScope.resolveCreateOperatorId(
      currentUser,
      dto.operatorId,
    );
    const bus = await this.busesService.create(dto, operatorId);

    if (currentUser.role === UserRole.ADMIN) {
      await this.auditLogService.logAction({
        actorUserId: currentUser.sub,
        action: 'create_bus',
        targetType: 'bus',
        targetId: bus.id,
        payload: { registrationNumber: dto.registrationNumber },
      });
    }

    return bus;
  }

  @Patch('buses/:id')
  @RequirePermissions(Permission.MANAGE_BUSES)
  async updateBus(
    @Param('id') id: string,
    @Body() dto: UpdateBusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const resourceOperatorId = await this.busesService.getOperatorId(id);
    this.tenantScope.assertResourceOwnership(currentUser, resourceOperatorId);
    const bus = await this.busesService.update(id, dto);

    if (currentUser.role === UserRole.ADMIN) {
      await this.auditLogService.logAction({
        actorUserId: currentUser.sub,
        action: 'update_bus',
        targetType: 'bus',
        targetId: id,
        payload: dto as Record<string, unknown>,
      });
    }

    return bus;
  }

  @Delete('buses/:id')
  @RequirePermissions(Permission.MANAGE_BUSES)
  async deleteBus(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const resourceOperatorId = await this.busesService.getOperatorId(id);
    this.tenantScope.assertResourceOwnership(currentUser, resourceOperatorId);
    const bus = await this.busesService.remove(id);

    if (currentUser.role === UserRole.ADMIN) {
      await this.auditLogService.logAction({
        actorUserId: currentUser.sub,
        action: 'delete_bus',
        targetType: 'bus',
        targetId: id,
      });
    }

    return bus;
  }

  @Post('buses/:busId/seats')
  @RequirePermissions(Permission.MANAGE_BUSES)
  async createSeatsForBus(
    @Param('busId') busId: string,
    @Body() dto: CreateSeatsForBusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const resourceOperatorId = await this.busesService.getOperatorId(busId);
    this.tenantScope.assertResourceOwnership(currentUser, resourceOperatorId);
    const seats = await this.seatsService.createForBus(busId, dto);

    if (currentUser.role === UserRole.ADMIN) {
      await this.auditLogService.logAction({
        actorUserId: currentUser.sub,
        action: 'create_bus_seats',
        targetType: 'bus',
        targetId: busId,
        payload: { seatsCreated: seats.length },
      });
    }

    return seats;
  }

  @Get('routes')
  @RequirePermissions(Permission.MANAGE_ROUTES)
  async getRoutes(
    @CurrentUser() user: AuthenticatedUser,
    @Query('operatorId') operatorId?: string,
  ) {
    const scope = this.tenantScope.resolveListScope(user, operatorId);
    if (scope.operatorId) {
      return this.routesService.findByOperator(scope.operatorId);
    }
    return this.routesService.findAll();
  }

  @Post('routes')
  @RequirePermissions(Permission.MANAGE_ROUTES)
  async createRoute(
    @Body() dto: CreateRouteDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const operatorId = this.tenantScope.resolveCreateOperatorId(
      currentUser,
      dto.operatorId,
    );
    const route = await this.routesService.create(dto, operatorId);

    if (currentUser.role === UserRole.ADMIN) {
      await this.auditLogService.logAction({
        actorUserId: currentUser.sub,
        action: 'create_route',
        targetType: 'route',
        targetId: route.id,
        payload: { origin: dto.origin, destination: dto.destination },
      });
    }

    return route;
  }

  @Patch('routes/:id')
  @RequirePermissions(Permission.MANAGE_ROUTES)
  async updateRoute(
    @Param('id') id: string,
    @Body() dto: UpdateRouteDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const resourceOperatorId = await this.routesService.getOperatorId(id);
    this.tenantScope.assertResourceOwnership(currentUser, resourceOperatorId);
    const route = await this.routesService.update(id, dto);

    if (currentUser.role === UserRole.ADMIN) {
      await this.auditLogService.logAction({
        actorUserId: currentUser.sub,
        action: 'update_route',
        targetType: 'route',
        targetId: id,
        payload: dto as Record<string, unknown>,
      });
    }

    return route;
  }

  @Delete('routes/:id')
  @RequirePermissions(Permission.MANAGE_ROUTES)
  async deleteRoute(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const resourceOperatorId = await this.routesService.getOperatorId(id);
    this.tenantScope.assertResourceOwnership(currentUser, resourceOperatorId);
    const route = await this.routesService.remove(id);

    if (currentUser.role === UserRole.ADMIN) {
      await this.auditLogService.logAction({
        actorUserId: currentUser.sub,
        action: 'delete_route',
        targetType: 'route',
        targetId: id,
      });
    }

    return route;
  }

  @Get('trips')
  @RequirePermissions(Permission.MANAGE_TRIPS)
  async getTrips(
    @Query() filters: AdminTripsFilterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const operatorId = this.tenantScope.resolveScopedOperatorId(
      user,
      filters.operatorId,
    );
    return this.tripsService.findAllAdmin(filters, operatorId);
  }

  @Post('trips')
  @RequirePermissions(Permission.MANAGE_TRIPS)
  async createTrip(
    @Body() dto: CreateTripDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const operatorId = this.tenantScope.resolveCreateOperatorId(
      currentUser,
      dto.operatorId,
    );
    const trip = await this.tripsService.create(dto, operatorId);

    if (currentUser.role === UserRole.ADMIN) {
      await this.auditLogService.logAction({
        actorUserId: currentUser.sub,
        action: 'create_trip',
        targetType: 'trip',
        targetId: trip.id,
        payload: { busId: dto.busId, routeId: dto.routeId },
      });
    }

    return trip;
  }

  @Patch('trips/:id')
  @RequirePermissions(Permission.MANAGE_TRIPS)
  async updateTrip(
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const resourceOperatorId = await this.tripsService.getOperatorId(id);
    this.tenantScope.assertResourceOwnership(currentUser, resourceOperatorId);
    const trip = await this.tripsService.update(id, dto);

    if (currentUser.role === UserRole.ADMIN) {
      await this.auditLogService.logAction({
        actorUserId: currentUser.sub,
        action: 'update_trip',
        targetType: 'trip',
        targetId: id,
        payload: dto as Record<string, unknown>,
      });
    }

    return trip;
  }

  @Patch('trips/:id/cancel')
  @RequirePermissions(Permission.MANAGE_TRIPS)
  async cancelTrip(
    @Param('id') id: string,
    @Body() dto: CancelTripDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const resourceOperatorId = await this.tripsService.getOperatorId(id);
    this.tenantScope.assertResourceOwnership(currentUser, resourceOperatorId);
    const trip = await this.tripsService.cancel(id, dto.reason, currentUser.sub);

    if (currentUser.role === UserRole.ADMIN) {
      await this.auditLogService.logAction({
        actorUserId: currentUser.sub,
        action: 'cancel_trip',
        targetType: 'trip',
        targetId: id,
        payload: { reason: dto.reason },
      });
    }

    return trip;
  }

  @Get('operators')
  @RequirePermissions(Permission.MANAGE_OPERATORS)
  async getOperators() {
    return this.operatorsService.findAll();
  }

  @Get('operators/:id')
  @RequirePermissions(Permission.MANAGE_OPERATORS)
  async getOperator(@Param('id') id: string) {
    return this.operatorsService.findOne(id);
  }

  @Post('operators')
  @RequirePermissions(Permission.MANAGE_OPERATORS)
  async createOperator(
    @Body() dto: CreateOperatorDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const operator = await this.operatorsService.create(dto);
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'create_operator',
      targetType: 'operator',
      targetId: operator.id,
      payload: { companyName: dto.companyName },
    });
    return operator;
  }

  @Patch('operators/:id')
  @RequirePermissions(Permission.MANAGE_OPERATORS)
  async updateOperator(
    @Param('id') id: string,
    @Body() dto: UpdateOperatorDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const operator = await this.operatorsService.update(id, dto);
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'update_operator',
      targetType: 'operator',
      targetId: id,
      payload: dto as Record<string, unknown>,
    });
    return operator;
  }

  @Post('operators/:id/suspend')
  @RequirePermissions(Permission.MANAGE_OPERATORS)
  async suspendOperator(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.operatorsService.suspend(id);
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'suspend_operator',
      targetType: 'operator',
      targetId: id,
    });
    return result;
  }

  @Post('operators/:id/activate')
  @RequirePermissions(Permission.MANAGE_OPERATORS)
  async activateOperator(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.operatorsService.activate(id);
    await this.auditLogService.logAction({
      actorUserId: currentUser.sub,
      action: 'activate_operator',
      targetType: 'operator',
      targetId: id,
    });
    return result;
  }

  @Get('operators/:id/stats')
  @RequirePermissions(Permission.MANAGE_OPERATORS)
  async getOperatorStats(@Param('id') id: string) {
    return this.operatorsService.getStats(id);
  }

  @Get('staff')
  @RequirePermissions(Permission.MANAGE_STAFF)
  async getStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Query('operatorId') operatorId?: string,
  ) {
    const effectiveOperatorId = this.tenantScope.resolveRequiredOperatorId(
      user,
      operatorId,
    );
    await this.tenantScope.assertOperatorActive(effectiveOperatorId);
    return this.operatorsService.findStaff(effectiveOperatorId);
  }

  @Post('staff')
  @RequirePermissions(Permission.MANAGE_STAFF)
  async createStaff(
    @Body() dto: CreateStaffDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query('operatorId') operatorId?: string,
  ) {
    const effectiveOperatorId = this.tenantScope.resolveRequiredOperatorId(
      user,
      operatorId,
    );
    await this.tenantScope.assertOperatorActive(effectiveOperatorId);
    return this.operatorsService.createStaff(effectiveOperatorId, dto);
  }

  @Patch('staff/:id')
  @RequirePermissions(Permission.MANAGE_STAFF)
  async updateStaff(
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query('operatorId') operatorId?: string,
  ) {
    const effectiveOperatorId = this.tenantScope.resolveRequiredOperatorId(
      user,
      operatorId,
    );
    await this.tenantScope.assertOperatorActive(effectiveOperatorId);
    return this.operatorsService.updateStaff(id, dto, effectiveOperatorId);
  }

  @Delete('staff/:id')
  @RequirePermissions(Permission.MANAGE_STAFF)
  async deleteStaff(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('operatorId') operatorId?: string,
  ) {
    const effectiveOperatorId = this.tenantScope.resolveRequiredOperatorId(
      user,
      operatorId,
    );
    await this.tenantScope.assertOperatorActive(effectiveOperatorId);
    return this.operatorsService.deleteStaff(id, effectiveOperatorId);
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
