import { apiFetch } from '../../../services/api';
import { endpoints } from '../../../services/endpoints';

/**
 * @param {{ email: string, password: string }} payload
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 * POST /auth/login
 */
export function login(payload) {
  return apiFetch(endpoints.auth.login, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * @param {object} payload - RegisterDto shape (email, password, fullName, phoneNumber, …)
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 * POST /auth/register
 */
export function register(payload) {
  return apiFetch(endpoints.auth.register, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
