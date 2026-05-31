import { UserRole } from '@prisma/client';
import { SeatSyncGateway } from './seat-sync.gateway';

describe('SeatSyncGateway', () => {
  let gateway: SeatSyncGateway;
  let jwtService: { verifyAsync: jest.Mock };
  let prismaService: {
    user: { findUnique: jest.Mock };
    trip: { findUnique: jest.Mock };
  };

  const configService = {
    getOrThrow: jest.fn(() => 'test-secret'),
  };

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    };
    prismaService = {
      user: { findUnique: jest.fn() },
      trip: { findUnique: jest.fn() },
    };

    gateway = new SeatSyncGateway(
      jwtService as never,
      configService as never,
      prismaService as never,
    );
  });

  describe('handleJoinTrip', () => {
    it('rejects when trip does not exist', async () => {
      prismaService.trip.findUnique.mockResolvedValue(null);
      const client = { user: null, join: jest.fn() };

      const result = await gateway.handleJoinTrip(client as never, {
        tripId: 'missing',
      });

      expect(result).toEqual({
        ok: false,
        error: 'Not allowed to join this trip',
      });
      expect(client.join).not.toHaveBeenCalled();
    });

    it('rejects staff from another operator', async () => {
      prismaService.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        operatorId: 'operator-a',
        operator: { status: 'ACTIVE' },
      });
      const client = {
        user: {
          sub: 'staff-1',
          role: UserRole.STAFF,
          operatorId: 'operator-b',
        },
        join: jest.fn(),
      };

      const result = await gateway.handleJoinTrip(client as never, {
        tripId: 'trip-1',
      });

      expect(result).toEqual({
        ok: false,
        error: 'Not allowed to join this trip',
      });
    });

    it('allows staff from the same operator', async () => {
      prismaService.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        operatorId: 'operator-a',
        operator: { status: 'ACTIVE' },
      });
      const client = {
        user: {
          sub: 'staff-1',
          role: UserRole.STAFF,
          operatorId: 'operator-a',
        },
        join: jest.fn(),
      };

      const result = await gateway.handleJoinTrip(client as never, {
        tripId: 'trip-1',
      });

      expect(result).toEqual({ ok: true, tripId: 'trip-1' });
      expect(client.join).toHaveBeenCalledWith('trip:trip-1');
    });

    it('allows anonymous public viewers for active operators', async () => {
      prismaService.trip.findUnique.mockResolvedValue({
        id: 'trip-1',
        operatorId: 'operator-a',
        operator: { status: 'ACTIVE' },
      });
      const client = { user: null, join: jest.fn() };

      const result = await gateway.handleJoinTrip(client as never, {
        tripId: 'trip-1',
      });

      expect(result).toEqual({ ok: true, tripId: 'trip-1' });
    });
  });
});
