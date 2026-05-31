import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TripsService } from '../trips/trips.service';
import { SeatSyncGateway } from './seat-sync.gateway';
import {
  buildSeatsUpdatedPayload,
  type SeatsUpdatedEvent,
  tripRoom,
} from './seat-sync.types';

@Injectable()
export class SeatSyncService {
  private readonly logger = new Logger(SeatSyncService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly tripsService: TripsService,
    @Inject(forwardRef(() => SeatSyncGateway))
    private readonly seatSyncGateway: SeatSyncGateway,
  ) {}

  isEnabled(): boolean {
    const flag = this.configService.get<string>('SEAT_SYNC_ENABLED');
    if (flag === undefined || flag === '') {
      return true;
    }
    return flag === 'true' || flag === '1';
  }

  async broadcastTripSeats(tripId: string): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    try {
      const bookingSeats =
        await this.tripsService.getActiveBookingSeatsForTrip(tripId);

      const payload: SeatsUpdatedEvent = buildSeatsUpdatedPayload(
        tripId,
        bookingSeats,
      );

      this.emitSeatsUpdated(payload);
    } catch (error) {
      this.logger.warn(
        `Failed to broadcast seat sync for trip ${tripId}: ${String(error)}`,
      );
    }
  }

  /** Emit after DB commit; retried once if the gateway is still starting. */
  private emitSeatsUpdated(payload: SeatsUpdatedEvent, attempt = 0): void {
    const server = this.seatSyncGateway.server;
    if (!server) {
      if (attempt < 3) {
        setTimeout(() => this.emitSeatsUpdated(payload, attempt + 1), 50);
      }
      return;
    }

    server.to(tripRoom(payload.tripId)).emit('seats.updated', payload);
  }

  async broadcastTripSeatsMany(tripIds: string[]): Promise<void> {
    const unique = [...new Set(tripIds.filter(Boolean))];
    await Promise.all(unique.map((id) => this.broadcastTripSeats(id)));
  }
}
