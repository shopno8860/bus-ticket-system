import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingSeatStatus, UserRole } from '@prisma/client';
import { DashboardBookingsService } from './dashboard-bookings.service';

describe('DashboardBookingsService', () => {
  const staffUser = {
    sub: 'staff-1',
    email: 'staff@test.com',
    role: UserRole.STAFF,
    operatorId: 'operator-a',
  };

  let service: DashboardBookingsService;
  let prisma: {
    $transaction: jest.Mock;
    trip: { findUnique: jest.Mock };
    bookingSeat: { updateMany: jest.Mock };
  };
  let tenantScope: { assertResourceOwnership: jest.Mock };
  let configService: { get: jest.Mock };
  let seatSyncService: { broadcastTripSeats: jest.Mock };

  const tripId = 'trip-1';
  const seatIds = ['seat-1', 'seat-2'];

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      trip: { findUnique: jest.fn() },
      bookingSeat: { updateMany: jest.fn() },
    };
    tenantScope = {
      assertResourceOwnership: jest.fn(),
    };
    configService = {
      get: jest.fn(() => undefined),
    };
    seatSyncService = {
      broadcastTripSeats: jest.fn().mockResolvedValue(undefined),
    };

    service = new DashboardBookingsService(
      prisma as never,
      tenantScope as never,
      configService as unknown as ConfigService,
      seatSyncService as never,
    );
  });

  describe('lockSeatsForDashboard', () => {
    it('returns lock expiry when seats are available', async () => {
      const lockExpiresAt = new Date(Date.now() + 120_000);
      const tx = {
        trip: {
          findUnique: jest.fn().mockResolvedValue({
            id: tripId,
            busId: 'bus-1',
            price: 500,
            operatorId: 'operator-a',
            status: 'SCHEDULED',
          }),
        },
        seat: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ id: 'seat-1' }, { id: 'seat-2' }]),
        },
        bookingSeat: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
        },
      };

      prisma.$transaction.mockImplementation(
        async (fn: (client: typeof tx) => unknown) => {
          for (const seatId of seatIds) {
            tx.bookingSeat.updateMany.mockResolvedValueOnce({ count: 0 });
            tx.bookingSeat.create.mockResolvedValueOnce({ seatId });
          }
          return fn(tx);
        },
      );

      const result = await service.lockSeatsForDashboard(
        { tripId, seatIds },
        staffUser,
      );

      expect(result.tripId).toBe(tripId);
      expect(result.seatIds).toEqual(seatIds);
      expect(result.lockExpiresAt).toBeNull();
      expect(tx.bookingSeat.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lockedByUserId: staffUser.sub,
            status: BookingSeatStatus.LOCKED,
          }),
        }),
      );
    });

    it('throws when trip is not found', async () => {
      const tx = {
        trip: { findUnique: jest.fn().mockResolvedValue(null) },
      };
      prisma.$transaction.mockImplementation(
        (fn: (client: typeof tx) => unknown) => fn(tx),
      );

      await expect(
        service.lockSeatsForDashboard({ tripId, seatIds }, staffUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('releaseSeatsForDashboard', () => {
    it('releases only the current user holds', async () => {
      prisma.trip.findUnique.mockResolvedValue({ operatorId: 'operator-a' });
      prisma.bookingSeat.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.releaseSeatsForDashboard(
        { tripId, seatIds },
        staffUser,
      );

      expect(result.released).toBe(2);
      expect(prisma.bookingSeat.updateMany).toHaveBeenCalledWith({
        where: {
          tripId,
          seatId: { in: seatIds },
          status: BookingSeatStatus.LOCKED,
          lockedByUserId: staffUser.sub,
          bookingId: null,
        },
        data: {
          status: BookingSeatStatus.CANCELLED,
          bookingId: null,
          lockedByUserId: null,
          lockExpiresAt: null,
        },
      });
    });
  });

  describe('extendDashboardSeatLocks', () => {
    it('extends lock expiry for seats held by the current user', async () => {
      prisma.trip.findUnique.mockResolvedValue({
        id: tripId,
        operatorId: 'operator-a',
        status: 'SCHEDULED',
      });
      prisma.bookingSeat.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.extendDashboardSeatLocks(
        { tripId, seatIds },
        staffUser,
      );

      expect(result.tripId).toBe(tripId);
      expect(result.seatIds).toEqual(seatIds);
      expect(result.extendedCount).toBe(2);
      expect(result.lockExpiresAt).toBeInstanceOf(Date);
      expect(prisma.bookingSeat.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tripId,
            seatId: { in: seatIds },
            status: BookingSeatStatus.LOCKED,
            lockedByUserId: staffUser.sub,
            bookingId: null,
          },
          data: expect.objectContaining({
            lockExpiresAt: expect.any(Date),
          }),
        }),
      );
      expect(seatSyncService.broadcastTripSeats).toHaveBeenCalledWith(tripId);
    });

    it('throws when not all seats are actively held', async () => {
      prisma.trip.findUnique.mockResolvedValue({
        id: tripId,
        operatorId: 'operator-a',
        status: 'SCHEDULED',
      });
      prisma.bookingSeat.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        service.extendDashboardSeatLocks({ tripId, seatIds }, staffUser),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('createManualBooking', () => {
    it('requires an active hold owned by the current user', async () => {
      const tx = {
        trip: {
          findUnique: jest.fn().mockResolvedValue({
            id: tripId,
            busId: 'bus-1',
            price: 500,
            operatorId: 'operator-a',
            status: 'SCHEDULED',
            bus: { id: 'bus-1' },
          }),
        },
        seat: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ id: 'seat-1' }, { id: 'seat-2' }]),
        },
        bookingSeat: {
          findFirst: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(0),
        },
      };

      prisma.$transaction.mockImplementation(
        (fn: (client: typeof tx) => unknown) => fn(tx),
      );

      await expect(
        service.createManualBooking(
          {
            tripId,
            seatIds,
            passengerName: 'Jane',
            passengerPhone: '01700000000',
          },
          staffUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects seats locked by another user', async () => {
      const tx = {
        trip: {
          findUnique: jest.fn().mockResolvedValue({
            id: tripId,
            busId: 'bus-1',
            price: 500,
            operatorId: 'operator-a',
            status: 'SCHEDULED',
            bus: { id: 'bus-1' },
          }),
        },
        seat: {
          findMany: jest.fn().mockResolvedValue([{ id: 'seat-1' }]),
        },
        bookingSeat: {
          findFirst: jest
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ seatId: 'seat-1' }),
        },
      };

      prisma.$transaction.mockImplementation(
        (fn: (client: typeof tx) => unknown) => fn(tx),
      );

      await expect(
        service.createManualBooking(
          {
            tripId,
            seatIds: ['seat-1'],
            passengerName: 'Jane',
            passengerPhone: '01700000000',
          },
          staffUser,
        ),
      ).rejects.toThrow(/locked by another user/);
    });
  });
});
