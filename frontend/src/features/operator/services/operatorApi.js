import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

export function getOperatorStats() {
  return apiFetch(endpoints.operator.stats).then((res) => ({
    totalBuses: Number(res?.totalBuses ?? 0),
    totalTrips: Number(res?.totalTrips ?? 0),
    totalBookings: Number(res?.totalBookings ?? 0),
    totalStaff: Number(res?.totalStaff ?? 0),
    totalRevenue: String(res?.totalRevenue ?? '0'),
    pendingRefunds: Number(res?.pendingRefunds ?? 0),
  }));
}

export function getOperatorBuses() {
  return apiFetch(endpoints.operator.buses).then((res) => res ?? []);
}

export function createOperatorBus(payload) {
  return apiFetch(endpoints.operator.buses, { method: 'POST', body: JSON.stringify(payload) });
}

export function updateOperatorBus(id, payload) {
  return apiFetch(endpoints.operator.updateBus(id), { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteOperatorBus(id) {
  return apiFetch(endpoints.operator.deleteBus(id), { method: 'DELETE' });
}

export function generateOperatorBusSeats(busId, columnsPerRow = 4, forceRegenerate = false) {
  return apiFetch(endpoints.buses.createSeats(busId), { method: 'POST', body: JSON.stringify({ columnsPerRow, forceRegenerate }) });
}

export function getOperatorRoutes() {
  return apiFetch(endpoints.operator.routes).then((res) => res ?? []);
}

export function createOperatorRoute(payload) {
  return apiFetch(endpoints.operator.routes, { method: 'POST', body: JSON.stringify(payload) });
}

export function updateOperatorRoute(id, payload) {
  return apiFetch(endpoints.operator.updateRoute(id), { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteOperatorRoute(id) {
  return apiFetch(endpoints.operator.deleteRoute(id), { method: 'DELETE' });
}

export function getOperatorTrips() {
  return apiFetch(endpoints.operator.trips).then((res) => res ?? []);
}

export function createOperatorTrip(payload) {
  return apiFetch(endpoints.operator.trips, { method: 'POST', body: JSON.stringify(payload) });
}

export function updateOperatorTrip(id, payload) {
  return apiFetch(endpoints.operator.updateTrip(id), { method: 'PATCH', body: JSON.stringify(payload) });
}

export function cancelOperatorTrip(id, reason) {
  return apiFetch(endpoints.operator.cancelTrip(id), { method: 'PATCH', body: JSON.stringify({ reason }) });
}

export function getOperatorBookings() {
  return apiFetch(endpoints.operator.bookings).then((res) => res ?? []);
}

export function getOperatorStaff() {
  return apiFetch(endpoints.operator.staff).then((res) => res ?? []);
}

export function createOperatorStaff(payload) {
  return apiFetch(endpoints.operator.createStaff, { method: 'POST', body: JSON.stringify(payload) });
}

export function updateOperatorStaff(id, payload) {
  return apiFetch(endpoints.operator.updateStaff(id), { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteOperatorStaff(id) {
  return apiFetch(endpoints.operator.deleteStaff(id), { method: 'DELETE' });
}
