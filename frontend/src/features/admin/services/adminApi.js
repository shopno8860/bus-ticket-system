import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

/**
 * Dashboard and CRUD helpers for the Nest `/admin/*` facade (JWT + ADMIN role).
 * @module adminApi
 */

/** GET /admin/dashboard/stats — KPIs, charts, recent activity. */
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

/** GET /admin/users — unwraps `{ items }` when present. */
export function getAdminUsers() {
  return apiFetch(endpoints.admin.users).then((res) => res.items ?? res);
}

/** PATCH /admin/users/:id/role */
export function changeAdminUserRole(id, role) {
  return apiFetch(endpoints.admin.changeUserRole(id), {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

/** GET /admin/bookings */
export function getAdminBookings() {
  return apiFetch(endpoints.admin.bookings).then((res) => res.items ?? res);
}

/** PATCH /admin/bookings/:id/cancel */
export function cancelAdminBooking(id, reason) {
  return apiFetch(endpoints.admin.cancelBooking(id), {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

/** GET /admin/payments */
export function getAdminPayments() {
  return apiFetch(endpoints.admin.payments).then((res) => res.items ?? res);
}

/** GET /admin/refunds */
export function getAdminRefunds() {
  return apiFetch(endpoints.admin.refunds).then((res) => res.items ?? res);
}

/** PATCH /admin/refunds/:id/approve */
export function approveAdminRefund(id, adminNote) {
  return apiFetch(endpoints.admin.approveRefund(id), {
    method: 'PATCH',
    body: JSON.stringify({ adminNote }),
  });
}

/** PATCH /admin/refunds/:id/reject */
export function rejectAdminRefund(id, adminNote) {
  return apiFetch(endpoints.admin.rejectRefund(id), {
    method: 'PATCH',
    body: JSON.stringify({ adminNote }),
  });
}

/** GET /buses — admin bus table reuses public list. */
export function getAdminBuses() {
  return apiFetch(endpoints.buses.list).then((res) => res.items ?? res);
}

/** POST /buses — create bus (same as non-admin controller). */
export function createAdminBus(payload) {
  return apiFetch(endpoints.buses.list, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** PATCH /admin/buses/:id */
export function updateAdminBus(id, payload) {
  return apiFetch(endpoints.admin.updateBus(id), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** DELETE /admin/buses/:id */
export function deleteAdminBus(id) {
  return apiFetch(endpoints.admin.deleteBus(id), {
    method: 'DELETE',
  });
}

/**
 * POST /admin/buses/:id/seats — generate or regenerate seat grid.
 * @param {string} id - bus id
 * @param {number} [columnsPerRow=4]
 * @param {boolean} [forceRegenerate=false]
 */
export function generateBusSeats(id, columnsPerRow = 4, forceRegenerate = false) {
  return apiFetch(endpoints.admin.createSeats(id), {
    method: 'POST',
    body: JSON.stringify({ columnsPerRow, forceRegenerate }),
  });
}

/** GET /routes */
export function getAdminRoutes() {
  return apiFetch(endpoints.routes.list).then((res) => res.items ?? res);
}

/** POST /routes */
export function createAdminRoute(payload) {
  return apiFetch(endpoints.routes.list, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** PATCH /admin/routes/:id */
export function updateAdminRoute(id, payload) {
  return apiFetch(endpoints.admin.updateRoute(id), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** DELETE /admin/routes/:id */
export function deleteAdminRoute(id) {
  return apiFetch(endpoints.admin.deleteRoute(id), {
    method: 'DELETE',
  });
}

/**
 * GET /admin/trips with optional filters; normalizes paginated shape.
 * @param {Record<string, string|number|undefined>} [params]
 */
export function getAdminTrips(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      searchParams.set(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  const url = queryString ? `${endpoints.admin.trips}?${queryString}` : endpoints.admin.trips;
  return apiFetch(url).then((res) => ({
    items: Array.isArray(res?.items) ? res.items : [],
    total: Number(res?.total ?? 0),
    page: Number(res?.page ?? 1),
    limit: Number(res?.limit ?? 10),
    totalPages: Number(res?.totalPages ?? 1),
  }));
}

/** POST /admin/trips */
export function createAdminTrip(payload) {
  return apiFetch(endpoints.admin.trips, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** PATCH /admin/trips/:id */
export function updateAdminTrip(id, payload) {
  return apiFetch(endpoints.admin.updateTrip(id), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** PATCH /admin/trips/:id/cancel */
export function cancelAdminTrip(id, reason) {
  return apiFetch(endpoints.admin.cancelTrip(id), {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}

/** POST /admin/bookings — Admin creates confirmed booking for passenger */
export function createAdminBooking(payload) {
  return apiFetch(endpoints.admin.createBooking, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
