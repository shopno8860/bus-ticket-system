import { Module } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';

@Module({
  imports: [PrismaModule],
  controllers: [RoutesController],
  providers: [RoutesService, RolesGuard],
  exports: [RoutesService],
})
export class RoutesModule {}
