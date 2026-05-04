import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

/**
 * Create a PENDING booking and lock seats (POST /bookings). No auth required for lock.
 * @param {{ tripId: string, seatIds: string[], guestEmail?: string }} payload
 */
export function lockSeats(payload) {
  return apiFetch(endpoints.bookings.lock, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Confirm hold after login (PATCH /bookings/confirm).
 * @param {{ tripId: string, seatIds: string[] }} payload
 */
export function confirmBooking(payload) {
  return apiFetch(endpoints.bookings.confirm, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** GET /bookings/:id — owner or admin. */
export function getBookingDetails(id) {
  return apiFetch(endpoints.bookings.details(id));
}

/** GET /bookings/my-bookings — normalizes `{ items }` list. */
export function getMyBookings() {
  return apiFetch(endpoints.bookings.my).then((res) => res.items ?? res);
}

/** PATCH /bookings/:id/cancel — passenger cancellation / refund request flow. */
export function cancelBooking(id) {
  return apiFetch(endpoints.bookings.cancel(id), {
    method: 'PATCH',
  });
}
