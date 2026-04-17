import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
