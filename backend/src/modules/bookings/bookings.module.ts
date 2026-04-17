import { Module } from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { BookingsAdminController } from './bookings.admin.controller';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [PrismaModule],
  controllers: [BookingsController, BookingsAdminController],
  providers: [BookingsService, RolesGuard],
  exports: [BookingsService],
})
export class BookingsModule {}
