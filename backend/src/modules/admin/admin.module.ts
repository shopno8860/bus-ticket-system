import { Module } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminBookingsService } from '../admin-bookings/admin-bookings.service';
import { BookingsModule } from '../bookings/bookings.module';
import { BusesModule } from '../buses/buses.module';
import { OperatorsModule } from '../operators/operators.module';
import { PaymentsModule } from '../payments/payments.module';
import { RefundsModule } from '../refunds/refunds.module';
import { RoutesModule } from '../routes/routes.module';
import { SeatsModule } from '../seats/seats.module';
import { TripsModule } from '../trips/trips.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AuditLogService } from './audit-log.service';

@Module({
  imports: [
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
  controllers: [AdminController],
  providers: [RolesGuard, AuditLogService, AdminBookingsService],
  exports: [AuditLogService],
})
export class AdminModule {}
