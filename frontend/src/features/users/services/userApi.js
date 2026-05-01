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

export function changePassword(payload) {
  return apiFetch(endpoints.users.changePassword, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAccount() {
  return apiFetch(endpoints.users.deleteAccount, {
    method: 'DELETE',
  });
}
