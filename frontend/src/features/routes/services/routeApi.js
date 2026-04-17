import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

export function getRoutes() {
  return apiFetch(endpoints.routes.list);
}
