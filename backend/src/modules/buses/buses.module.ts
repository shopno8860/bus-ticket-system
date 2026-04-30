import { Module } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { SeatsModule } from '../seats/seats.module';
import { BusSeederService } from './bus-seeder.service';
import { BusesAdminController } from './buses.admin.controller';
import { BusesController } from './buses.controller';
import { BusesService } from './buses.service';

@Module({
  imports: [PrismaModule, SeatsModule],
  controllers: [BusesController, BusesAdminController],
  providers: [BusesService, BusSeederService, RolesGuard],
  exports: [BusesService, BusSeederService],
})
export class BusesModule {}
