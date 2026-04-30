import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

export function getAdminStats() {
  return apiFetch(endpoints.admin.stats);
}

export function getAdminUsers() {
  return apiFetch(endpoints.admin.users).then((res) => res.items ?? res);
}

export function changeAdminUserRole(id, role) {
  return apiFetch(endpoints.admin.changeUserRole(id), {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export function getAdminBookings() {
  return apiFetch(endpoints.admin.bookings).then((res) => res.items ?? res);
}

export function cancelAdminBooking(id, reason) {
  return apiFetch(endpoints.admin.cancelBooking(id), {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export function getAdminPayments() {
  return apiFetch(endpoints.admin.payments).then((res) => res.items ?? res);
}

export function getAdminRefunds() {
  return apiFetch(endpoints.admin.refunds).then((res) => res.items ?? res);
}

export function approveAdminRefund(id, adminNote) {
  return apiFetch(endpoints.admin.approveRefund(id), {
    method: 'PATCH',
    body: JSON.stringify({ adminNote }),
  });
}

export function rejectAdminRefund(id, adminNote) {
  return apiFetch(endpoints.admin.rejectRefund(id), {
    method: 'PATCH',
    body: JSON.stringify({ adminNote }),
  });
}
