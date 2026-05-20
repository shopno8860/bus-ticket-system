import { io } from 'socket.io-client';
import { config } from '../config';

export const SEAT_SYNC_NAMESPACE = '/seat-sync';

export function getSeatSyncOrigin() {
  const base = config.apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!base) {
    return '';
  }
  try {
    return new URL(base).origin;
  } catch {
    return base.replace(/\/$/, '');
  }
}

let sharedSocket = null;
let subscriberCount = 0;

/**
 * One Socket.IO client per tab — avoids Strict Mode double-connect churn.
 */
export function acquireSeatSyncSocket() {
  const origin = getSeatSyncOrigin();
  if (!origin) {
    return null;
  }

  subscriberCount += 1;

  if (!sharedSocket) {
    const token = localStorage.getItem('accessToken');
    sharedSocket = io(`${origin}${SEAT_SYNC_NAMESPACE}`, {
      auth: token ? { token } : {},
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true,
    });
  }

  return sharedSocket;
}

export function releaseSeatSyncSocket() {
  subscriberCount = Math.max(0, subscriberCount - 1);
  if (subscriberCount === 0 && sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }
}
