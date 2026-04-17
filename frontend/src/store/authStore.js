const listeners = new Set();

let state = {
  accessToken: localStorage.getItem('accessToken'),
  user: null,
};

function notify() {
  listeners.forEach((listener) => listener());
}

export function getAuthState() {
  return state;
}

export function setAccessToken(token) {
  state = { ...state, accessToken: token };
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
  notify();
}

export function setUser(user) {
  state = { ...state, user };
  notify();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
