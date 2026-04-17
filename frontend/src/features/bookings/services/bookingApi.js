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
