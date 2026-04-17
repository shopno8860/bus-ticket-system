import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

export function getProfile() {
  return apiFetch(endpoints.users.me);
}
