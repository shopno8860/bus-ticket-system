import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

/** GET /users/me */
export function getProfile() {
  return apiFetch(endpoints.users.me);
}

/** PATCH /users/profile */
export function updateProfile(payload) {
  return apiFetch('/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** PATCH /users/change-password */
export function changePassword(payload) {
  return apiFetch(endpoints.users.changePassword, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** DELETE /users/delete-account */
export function deleteAccount() {
  return apiFetch(endpoints.users.deleteAccount, {
    method: 'DELETE',
  });
}
