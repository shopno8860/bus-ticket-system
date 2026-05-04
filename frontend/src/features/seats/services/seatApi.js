import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

/** GET /buses/:busId/seats — seat layout for seat selection UI. */
export function getSeatsByBus(busId) {
  return apiFetch(endpoints.seats.byBus(busId));
}
