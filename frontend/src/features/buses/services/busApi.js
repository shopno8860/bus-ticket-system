import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

export function getBuses() {
  return apiFetch(endpoints.buses.list);
}
