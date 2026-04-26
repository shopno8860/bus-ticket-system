import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

export function lockSeats(payload) {
  return apiFetch(endpoints.bookings.lock, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function confirmBooking(payload) {
  return apiFetch(endpoints.bookings.confirm, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getBookingDetails(id) {
  return apiFetch(endpoints.bookings.details(id));
}

export function getMyBookings() {
  return apiFetch(endpoints.bookings.my);
}
