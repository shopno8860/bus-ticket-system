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

export const SEAT_SYNC_NAMESPACE = '/seat-sync';

export function tripRoom(tripId: string): string {
  return `trip:${tripId}`;
}
