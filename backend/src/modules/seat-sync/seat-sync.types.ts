export type SeatSyncBookingSeatPayload = {
  seatId: string;
  status: 'LOCKED' | 'RESERVED';
  lockExpiresAt: string | null;
  lockedByUserId: string | null;
};

export type SeatsUpdatedEvent = {
  type: 'seats.updated';
  tripId: string;
  bookingSeats: SeatSyncBookingSeatPayload[];
};

type ActiveBookingSeatRow = {
  seatId: string;
  status: string;
  lockExpiresAt: Date | null;
  lockedByUserId: string | null;
};

/** Build the WebSocket payload from active booking-seat rows for a trip. */
export function buildSeatsUpdatedPayload(
  tripId: string,
  rows: ActiveBookingSeatRow[],
): SeatsUpdatedEvent {
  return {
    type: 'seats.updated',
    tripId,
    bookingSeats: rows.map((row) => ({
      seatId: row.seatId,
      status: row.status as 'LOCKED' | 'RESERVED',
      lockExpiresAt: row.lockExpiresAt
        ? row.lockExpiresAt.toISOString()
        : null,
      lockedByUserId: row.lockedByUserId ?? null,
    })),
  };
}

export const SEAT_SYNC_NAMESPACE = '/seat-sync';

export function tripRoom(tripId: string): string {
  return `trip:${tripId}`;
}
