import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { BusesModule } from './modules/buses/buses.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { RoutesModule } from './modules/routes/routes.module';
import { SeatsModule } from './modules/seats/seats.module';
import { TripsModule } from './modules/trips/trips.module';
import { UsersModule } from './modules/users/users.module';
import { OperatorsModule } from './modules/operators/operators.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SeatSyncModule } from './modules/seat-sync/seat-sync.module';
import { ScopingModule } from './common/scoping/scoping.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    ScopingModule,
    AuthModule,
    AdminModule,
    DashboardModule,
    BookingsModule,
    BusesModule,
    PaymentsModule,
    NotificationsModule,
    RefundsModule,
    RoutesModule,
    SeatsModule,
    TripsModule,
    UsersModule,
    OperatorsModule,
    SeatSyncModule,
  ],
})
export class AppModule {}
