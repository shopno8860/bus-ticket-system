import { ConflictException } from '@nestjs/common';
import {
  BookingSeatStatus,
  BookingStatus,
  TripStatus,
} from '@prisma/client';
import { TripsService } from './trips.service';

describe('TripsService', () => {
  let service: TripsService;
  let prisma: {
    trip: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  const tripId = 'trip-1';
  const scheduledTrip = {
    id: tripId,
    status: TripStatus.SCHEDULED,
  };

  beforeEach(() => {
    prisma = {
      trip: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new TripsService(prisma as never);
  });

  describe('cancel', () => {
    it('rejects cancellation when active bookings exist', async () => {
      prisma.trip.findUnique.mockResolvedValue(scheduledTrip);
      prisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          booking: {
            count: jest.fn().mockResolvedValue(1),
          },
          bookingSeat: {
            count: jest.fn(),
          },
          trip: {
            update: jest.fn(),
          },
        };
        return fn(tx);
      });

      await expect(
        service.cancel(tripId, 'Maintenance', 'admin-1'),
      ).rejects.toThrow(
        new ConflictException(
          'This trip cannot be cancelled because tickets have already been booked for it.',
        ),
      );
    });

    it('rejects cancellation when seats are locked or reserved', async () => {
      prisma.trip.findUnique.mockResolvedValue(scheduledTrip);
      prisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          booking: {
            count: jest.fn().mockResolvedValue(0),
          },
          bookingSeat: {
            count: jest.fn().mockResolvedValue(2),
          },
          trip: {
            update: jest.fn(),
          },
        };
        return fn(tx);
      });

      await expect(
        service.cancel(tripId, 'Weather', 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('cancels trip when there are no active bookings or seat holds', async () => {
      const cancelledTrip = {
        ...scheduledTrip,
        status: TripStatus.CANCELLED,
        cancelReason: 'Low demand',
      };

      prisma.trip.findUnique.mockResolvedValue(scheduledTrip);
      prisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          booking: {
            count: jest.fn().mockResolvedValue(0),
          },
          bookingSeat: {
            count: jest.fn().mockResolvedValue(0),
          },
          trip: {
            update: jest.fn().mockResolvedValue(cancelledTrip),
          },
        };
        return fn(tx);
      });

      await expect(
        service.cancel(tripId, 'Low demand', 'admin-1'),
      ).resolves.toEqual(cancelledTrip);
    });

    it('checks pending and confirmed bookings before updating trip status', async () => {
      prisma.trip.findUnique.mockResolvedValue(scheduledTrip);

      let bookingCountWhere: unknown;
      prisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          booking: {
            count: jest.fn().mockImplementation(({ where }) => {
              bookingCountWhere = where;
              return 0;
            }),
          },
          bookingSeat: {
            count: jest.fn().mockResolvedValue(0),
          },
          trip: {
            update: jest.fn().mockResolvedValue({
              ...scheduledTrip,
              status: TripStatus.CANCELLED,
            }),
          },
        };
        return fn(tx);
      });

      await service.cancel(tripId, 'Reason', 'admin-1');

      expect(bookingCountWhere).toEqual({
        tripId,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
        },
      });
    });

    it('checks active seat holds using reserved and non-expired locked seats', async () => {
      prisma.trip.findUnique.mockResolvedValue(scheduledTrip);

      let seatCountWhere: unknown;
      prisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          booking: {
            count: jest.fn().mockResolvedValue(0),
          },
          bookingSeat: {
            count: jest.fn().mockImplementation(({ where }) => {
              seatCountWhere = where;
              return 0;
            }),
          },
          trip: {
            update: jest.fn().mockResolvedValue({
              ...scheduledTrip,
              status: TripStatus.CANCELLED,
            }),
          },
        };
        return fn(tx);
      });

      await service.cancel(tripId, 'Reason', 'admin-1');

      expect(seatCountWhere).toMatchObject({
        tripId,
        OR: [
          { status: BookingSeatStatus.RESERVED },
          {
            status: BookingSeatStatus.LOCKED,
            lockExpiresAt: { gt: expect.any(Date) },
          },
        ],
      });
    });
  });
});
