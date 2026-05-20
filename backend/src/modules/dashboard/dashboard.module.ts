import { Module } from '@nestjs/common';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { AdminModule } from '../admin/admin.module';
import { BookingsModule } from '../bookings/bookings.module';
import { BusesModule } from '../buses/buses.module';
import { OperatorsModule } from '../operators/operators.module';
import { PaymentsModule } from '../payments/payments.module';
import { RefundsModule } from '../refunds/refunds.module';
import { RoutesModule } from '../routes/routes.module';
import { SeatsModule } from '../seats/seats.module';
import { TripsModule } from '../trips/trips.module';
import { UsersModule } from '../users/users.module';
import { DashboardBookingsService } from './dashboard-bookings.service';
import { DashboardController } from './dashboard.controller';
import {
  AdminAliasController,
  OperatorAliasController,
  StaffAliasController,
} from './dashboard-alias.controller';

@Module({
  imports: [
    AdminModule,
    UsersModule,
    BookingsModule,
    PaymentsModule,
    RefundsModule,
    TripsModule,
    BusesModule,
    RoutesModule,
    SeatsModule,
    OperatorsModule,
  ],
  controllers: [
    DashboardController,
    AdminAliasController,
    OperatorAliasController,
    StaffAliasController,
  ],
  providers: [
    DashboardController,
    PermissionsGuard,
    DashboardBookingsService,
  ],
  exports: [DashboardBookingsService],
})
export class DashboardModule {}
