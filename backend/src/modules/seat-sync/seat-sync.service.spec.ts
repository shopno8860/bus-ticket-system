import { ConfigService } from '@nestjs/config';
import { SeatSyncService } from './seat-sync.service';
import { tripRoom } from './seat-sync.types';

describe('SeatSyncService', () => {
  const tripsService = {
    getActiveBookingSeatsForTrip: jest.fn(),
  };

  const emit = jest.fn();
  const seatSyncGateway = {
    server: {
      to: jest.fn(() => ({ emit })),
    },
  };

  let configService: { get: jest.Mock };
  let service: SeatSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    configService = {
      get: jest.fn(() => undefined),
    };
    service = new SeatSyncService(
      configService as unknown as ConfigService,
      tripsService as never,
      seatSyncGateway as never,
    );
  });

  it('is enabled by default when env is unset', () => {
    expect(service.isEnabled()).toBe(true);
  });

  it('is disabled when SEAT_SYNC_ENABLED=false', () => {
    configService.get.mockReturnValue('false');
    expect(service.isEnabled()).toBe(false);
  });

  it('broadcasts seats.updated to the trip room', async () => {
    const lockExpiresAt = new Date('2026-05-21T12:00:00.000Z');
    tripsService.getActiveBookingSeatsForTrip.mockResolvedValue([
      {
        seatId: 'seat-1',
        status: 'LOCKED',
        lockExpiresAt,
        lockedByUserId: 'user-1',
      },
    ]);

    await service.broadcastTripSeats('trip-abc');

    expect(tripsService.getActiveBookingSeatsForTrip).toHaveBeenCalledWith(
      'trip-abc',
    );
    expect(seatSyncGateway.server.to).toHaveBeenCalledWith(
      tripRoom('trip-abc'),
    );
    expect(emit).toHaveBeenCalledWith('seats.updated', {
      type: 'seats.updated',
      tripId: 'trip-abc',
      bookingSeats: [
        {
          seatId: 'seat-1',
          status: 'LOCKED',
          lockExpiresAt: lockExpiresAt.toISOString(),
          lockedByUserId: 'user-1',
        },
      ],
    });
  });

  it('skips broadcast when disabled', async () => {
    configService.get.mockReturnValue('false');
    await service.broadcastTripSeats('trip-abc');
    expect(tripsService.getActiveBookingSeatsForTrip).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });
});
