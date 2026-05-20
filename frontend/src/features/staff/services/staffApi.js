import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

export function getStaffStats() {
  return apiFetch(endpoints.staff.stats).then((res) => ({
    operatorName: res?.operatorName ?? '',
    totalBookings: Number(res?.totalBookings ?? 0),
  }));
}

export function getStaffBookings() {
  return apiFetch(endpoints.staff.bookings).then((res) => res ?? []);
}

export function createStaffBooking(payload) {
  return apiFetch(endpoints.staff.createBooking, { method: 'POST', body: JSON.stringify(payload) });
}
