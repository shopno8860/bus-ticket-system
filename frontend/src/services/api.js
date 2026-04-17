import { config } from '../config';

function getAuthToken() {
  return localStorage.getItem('accessToken');
}

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
    const errorBody = await response.text();
    throw new Error(errorBody || 'Request failed');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
