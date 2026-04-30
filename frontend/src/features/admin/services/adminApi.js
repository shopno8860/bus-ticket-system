import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

export function getAdminStats() {
  return apiFetch(endpoints.admin.stats).then((res) => ({
    totalUsers: Number(res?.totalUsers ?? 0),
    totalBuses: Number(res?.totalBuses ?? 0),
    totalTrips: Number(res?.totalTrips ?? 0),
    totalBookings: Number(res?.totalBookings ?? 0),
    totalRevenue: String(res?.totalRevenue ?? '0'),
    pendingRefunds: Number(res?.pendingRefunds ?? 0),
    bookingTrends: Array.isArray(res?.bookingTrends) ? res.bookingTrends : [],
    revenueOverview: Array.isArray(res?.revenueOverview) ? res.revenueOverview : [],
    recentActivity: Array.isArray(res?.recentActivity) ? res.recentActivity : [],
  }));
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

export function getAdminBuses() {
  return apiFetch(endpoints.buses.list).then((res) => res.items ?? res);
}

export function createAdminBus(payload) {
  return apiFetch(endpoints.buses.list, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminBus(id, payload) {
  return apiFetch(endpoints.admin.updateBus(id), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminBus(id) {
  return apiFetch(endpoints.admin.deleteBus(id), {
    method: 'DELETE',
  });
}

export function generateBusSeats(id, columnsPerRow = 4, forceRegenerate = false) {
  return apiFetch(endpoints.admin.createSeats(id), {
    method: 'POST',
    body: JSON.stringify({ columnsPerRow, forceRegenerate }),
  });
}

export function getAdminRoutes() {
  return apiFetch(endpoints.routes.list).then((res) => res.items ?? res);
}

export function createAdminRoute(payload) {
  return apiFetch(endpoints.routes.list, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminRoute(id, payload) {
  return apiFetch(endpoints.admin.updateRoute(id), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminRoute(id) {
  return apiFetch(endpoints.admin.deleteRoute(id), {
    method: 'DELETE',
  });
}
