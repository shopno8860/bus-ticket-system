import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

export function getProfile() {
  return apiFetch(endpoints.users.me);
}

export function updateProfile(payload) {
  return apiFetch('/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
