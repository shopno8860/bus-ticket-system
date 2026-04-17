import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

export function getAdminStats() {
  return apiFetch(endpoints.users.adminStats);
}
