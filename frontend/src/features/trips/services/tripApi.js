import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

export function searchTrips(query) {
  const params = new URLSearchParams(query).toString();
  return apiFetch(`${endpoints.trips.search}?${params}`);
}
