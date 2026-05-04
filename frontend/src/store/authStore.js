/**
 * Minimal pub/sub store for JWT access token and user snapshot (parallel to React context).
 * @module authStore
 */

const listeners = new Set();

let state = {
  accessToken: localStorage.getItem('accessToken'),
  user: null,
};

function notify() {
  listeners.forEach((listener) => listener());
}

/** @returns {{ accessToken: string|null, user: object|null }} */
export function getAuthState() {
  return state;
}

/** Persists token to `localStorage` and notifies subscribers. */
export function setAccessToken(token) {
  state = { ...state, accessToken: token };
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
  notify();
}

/** Updates in-memory user and notifies subscribers. */
export function setUser(user) {
  state = { ...state, user };
  notify();
}

/** @param {() => void} listener */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
