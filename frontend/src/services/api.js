import { config } from '../config';

/**
 * Read JWT access token from browser storage (set after login/register).
 * @returns {string|null}
 */
function getAuthToken() {
  return localStorage.getItem('accessToken');
}

/**
 * JSON `fetch` wrapper: prefixes `config.apiBaseUrl`, attaches Bearer token when present,
 * parses JSON errors, and returns `null` for HTTP 204.
 *
 * @param {string} path - Relative path (e.g. from `endpoints`)
 * @param {RequestInit} [options] - Standard fetch options; body often `JSON.stringify(...)`
 * @returns {Promise<unknown>} Parsed JSON body, or `null` if no content
 * @throws {Error} With `status` and `data` when `response.ok` is false
 */
export async function apiFetch(path, options = {}) {
  const token = getAuthToken();

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText };
    }

    const error = new Error(errorData.message || 'Request failed');
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
