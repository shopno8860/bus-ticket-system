import { Module } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { BusesModule } from '../buses/buses.module';
import { RoutesModule } from '../routes/routes.module';
import { TripsAdminController } from './trips.admin.controller';
import { TripsController } from './trips.controller';
import { TripGeneratorService } from './trip-generator.service';
import { TripsService } from './trips.service';

@Module({
  imports: [PrismaModule, RoutesModule, BusesModule],
  controllers: [TripsController, TripsAdminController],
  providers: [TripsService, TripGeneratorService, RolesGuard],
  exports: [TripsService, TripGeneratorService],
})
export class TripsModule {}
