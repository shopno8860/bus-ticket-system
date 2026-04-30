import { Module } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { SeatsModule } from '../seats/seats.module';
import { BusesAdminController } from './buses.admin.controller';
import { BusesController } from './buses.controller';
import { BusesService } from './buses.service';

@Module({
  imports: [PrismaModule, SeatsModule],
  controllers: [BusesController, BusesAdminController],
  providers: [BusesService, RolesGuard],
  exports: [BusesService],
})
export class BusesModule {}
