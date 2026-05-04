import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

/** GET /routes — public route list. */
export function getRoutes() {
  return apiFetch(endpoints.routes.list);
}
