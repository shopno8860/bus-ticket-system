import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

export function withOperatorQuery(url, operatorId) {
  if (!operatorId) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}operatorId=${encodeURIComponent(operatorId)}`;
}

export function getDashboardProfile() {
  return apiFetch(endpoints.dashboard.profile);
}

export function getDashboardBookingRoutes(operatorId) {
  return apiFetch(withOperatorQuery(endpoints.dashboard.bookingRoutes, operatorId)).then(
    (res) => res.items ?? res,
  );
}

export function getDashboardStats() {
  return apiFetch(endpoints.dashboard.stats).then((res) => ({
    totalUsers: Number(res?.totalUsers ?? 0),
    totalBuses: Number(res?.totalBuses ?? 0),
    totalTrips: Number(res?.totalTrips ?? 0),
    totalBookings: Number(res?.totalBookings ?? 0),
    totalRevenue: String(res?.totalRevenue ?? res?.totalRevenue ?? '0'),
    pendingRefunds: Number(res?.pendingRefunds ?? 0),
    operatorName: res?.operatorName,
    operatorLogo: res?.operatorLogo,
    totalStaff: Number(res?.totalStaff ?? 0),
    bookingTrends: Array.isArray(res?.bookingTrends) ? res.bookingTrends : [],
    revenueOverview: Array.isArray(res?.revenueOverview) ? res.revenueOverview : [],
    recentActivity: Array.isArray(res?.recentActivity) ? res.recentActivity : [],
  }));
}

export function getDashboardUsers() {
  return apiFetch(endpoints.dashboard.users).then((res) => res.items ?? res);
}

export function changeDashboardUserRole(id, role) {
  return apiFetch(endpoints.dashboard.changeUserRole(id), {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export function getDashboardBookings(operatorId) {
  return apiFetch(withOperatorQuery(endpoints.dashboard.bookings, operatorId)).then(
    (res) => res.items ?? res,
  );
}

export function cancelDashboardBooking(id, reason) {
  return apiFetch(endpoints.dashboard.cancelBooking(id), {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export function getDashboardPayments(operatorId) {
  return apiFetch(withOperatorQuery(endpoints.dashboard.payments, operatorId)).then(
    (res) => res.items ?? res,
  );
}

export function getDashboardRefunds(operatorId) {
  return apiFetch(withOperatorQuery(endpoints.dashboard.refunds, operatorId)).then(
    (res) => res.items ?? res,
  );
}

export function approveDashboardRefund(id, adminNote) {
  return apiFetch(endpoints.dashboard.approveRefund(id), {
    method: 'PATCH',
    body: JSON.stringify({ adminNote }),
  });
}

export function rejectDashboardRefund(id, adminNote) {
  return apiFetch(endpoints.dashboard.rejectRefund(id), {
    method: 'PATCH',
    body: JSON.stringify({ adminNote }),
  });
}

export function getDashboardBuses(operatorId) {
  return apiFetch(withOperatorQuery(endpoints.dashboard.buses, operatorId)).then(
    (res) => res.items ?? res,
  );
}

export function createDashboardBus(payload) {
  return apiFetch(endpoints.dashboard.buses, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDashboardBus(id, payload) {
  return apiFetch(endpoints.dashboard.updateBus(id), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteDashboardBus(id) {
  return apiFetch(endpoints.dashboard.deleteBus(id), {
    method: 'DELETE',
  });
}

export function generateDashboardBusSeats(id, columnsPerRow = 4, forceRegenerate = false) {
  return apiFetch(endpoints.dashboard.createSeats(id), {
    method: 'POST',
    body: JSON.stringify({ columnsPerRow, forceRegenerate }),
  });
}

export function getDashboardRoutes(operatorId) {
  return apiFetch(withOperatorQuery(endpoints.dashboard.routes, operatorId)).then(
    (res) => res.items ?? res,
  );
}

export function createDashboardRoute(payload) {
  return apiFetch(endpoints.dashboard.routes, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDashboardRoute(id, payload) {
  return apiFetch(endpoints.dashboard.updateRoute(id), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteDashboardRoute(id) {
  return apiFetch(endpoints.dashboard.deleteRoute(id), {
    method: 'DELETE',
  });
}

export function getDashboardTrips(params = {}, scopedOperatorId) {
  const searchParams = new URLSearchParams();
  const merged = { ...params };
  if (scopedOperatorId) {
    merged.operatorId = scopedOperatorId;
  }
  Object.entries(merged).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      searchParams.set(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  const url = queryString
    ? `${endpoints.dashboard.trips}?${queryString}`
    : endpoints.dashboard.trips;
  return apiFetch(url).then((res) => ({
    items: Array.isArray(res?.items) ? res.items : [],
    total: Number(res?.total ?? 0),
    page: Number(res?.page ?? 1),
    limit: Number(res?.limit ?? 10),
    totalPages: Number(res?.totalPages ?? 1),
  }));
}

export function createDashboardTrip(payload) {
  return apiFetch(endpoints.dashboard.trips, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDashboardTrip(id, payload) {
  return apiFetch(endpoints.dashboard.updateTrip(id), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function cancelDashboardTrip(id, reason) {
  return apiFetch(endpoints.dashboard.cancelTrip(id), {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

export function lockDashboardSeats(payload) {
  return apiFetch(endpoints.dashboard.lockSeats, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function releaseDashboardSeats(payload) {
  return apiFetch(endpoints.dashboard.releaseSeats, {
    method: 'DELETE',
    body: JSON.stringify(payload),
  });
}

export function createDashboardBooking(payload) {
  return apiFetch(endpoints.dashboard.createBooking, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getDashboardOperators() {
  return apiFetch(endpoints.dashboard.operators);
}

export function getDashboardOperator(id) {
  return apiFetch(endpoints.dashboard.operator(id));
}

export function createDashboardOperator(payload) {
  return apiFetch(endpoints.dashboard.createOperator, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDashboardOperator(id, payload) {
  return apiFetch(endpoints.dashboard.updateOperator(id), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function suspendDashboardOperator(id) {
  return apiFetch(endpoints.dashboard.suspendOperator(id), { method: 'POST' });
}

export function activateDashboardOperator(id) {
  return apiFetch(endpoints.dashboard.activateOperator(id), { method: 'POST' });
}

export function getDashboardOperatorStats(id) {
  return apiFetch(endpoints.dashboard.operatorStats(id));
}

export function getDashboardStaff(operatorId) {
  return apiFetch(withOperatorQuery(endpoints.dashboard.staff, operatorId));
}

export function createDashboardStaff(payload, operatorId) {
  return apiFetch(withOperatorQuery(endpoints.dashboard.staff, operatorId), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDashboardStaff(id, payload, operatorId) {
  return apiFetch(withOperatorQuery(endpoints.dashboard.updateStaff(id), operatorId), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteDashboardStaff(id, operatorId) {
  return apiFetch(withOperatorQuery(endpoints.dashboard.deleteStaff(id), operatorId), {
    method: 'DELETE',
  });
}
