import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

export function getSeatsByBus(busId) {
  return apiFetch(endpoints.seats.byBus(busId));
}
