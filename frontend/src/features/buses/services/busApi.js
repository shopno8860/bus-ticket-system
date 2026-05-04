import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

/** GET /buses — public bus list. */
export function getBuses() {
  return apiFetch(endpoints.buses.list);
}
