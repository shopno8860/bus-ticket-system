import { Module } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { TripsAdminController } from './trips.admin.controller';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [PrismaModule],
  controllers: [TripsController, TripsAdminController],
  providers: [TripsService, RolesGuard],
  exports: [TripsService],
})
export class TripsModule {}
