import { Module } from '@nestjs/common';
import { OperatorsService } from './operators.service';
import { OperatorsController } from './operators.controller';
import { StaffController } from './staff.controller';
import { OperatorPublicController } from './operator-public.controller';
import { BusesModule } from '../buses/buses.module';
import { RoutesModule } from '../routes/routes.module';
import { TripsModule } from '../trips/trips.module';
import { BookingsModule } from '../bookings/bookings.module';
import { SeatsModule } from '../seats/seats.module';

@Module({
  imports: [
    BusesModule,
    RoutesModule,
    TripsModule,
    BookingsModule,
    SeatsModule,
  ],
  controllers: [OperatorsController, StaffController, OperatorPublicController],
  providers: [OperatorsService],
  exports: [OperatorsService],
})
export class OperatorsModule {}
