import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookingsModule } from './modules/bookings/bookings.module';
import { BusesModule } from './modules/buses/buses.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { RoutesModule } from './modules/routes/routes.module';
import { SeatsModule } from './modules/seats/seats.module';
import { TripsModule } from './modules/trips/trips.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    BookingsModule,
    BusesModule,
    PaymentsModule,
    RefundsModule,
    RoutesModule,
    SeatsModule,
    TripsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
