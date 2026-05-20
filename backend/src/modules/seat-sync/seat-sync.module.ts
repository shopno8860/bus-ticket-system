import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { TripsModule } from '../trips/trips.module';
import { SeatSyncGateway } from './seat-sync.gateway';
import { SeatSyncService } from './seat-sync.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
    TripsModule,
  ],
  providers: [SeatSyncGateway, SeatSyncService],
  exports: [SeatSyncService],
})
export class SeatSyncModule {}
