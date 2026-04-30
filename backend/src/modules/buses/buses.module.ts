import { Module } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { BusesController } from './buses.controller';
import { BusesService } from './buses.service';

@Module({
  imports: [PrismaModule],
  controllers: [BusesController],
  providers: [BusesService, RolesGuard],
  exports: [BusesService],
})
export class BusesModule {}
