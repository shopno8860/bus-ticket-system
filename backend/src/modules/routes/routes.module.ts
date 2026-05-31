import { Module } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { PointsModule } from '../points/points.module';
import { RouteSeederService } from './route-seeder.service';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';

@Module({
  imports: [PrismaModule, PointsModule],
  controllers: [RoutesController],
  providers: [RoutesService, RouteSeederService, RolesGuard],
  exports: [RoutesService, RouteSeederService],
})
export class RoutesModule {}
