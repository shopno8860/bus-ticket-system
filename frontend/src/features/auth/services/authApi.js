import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

export function login(payload) {
  return apiFetch(endpoints.auth.login, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function register(payload) {
  return apiFetch(endpoints.auth.register, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
