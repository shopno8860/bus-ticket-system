const HOLD_ACTIVE_PREFIX = 'dashboard_hold_active_';
const LOCK_EXPIRY_PREFIX = 'dashboard_lock_expiry_';

export function getHoldActiveKey(tripId) {
  return `${HOLD_ACTIVE_PREFIX}${tripId}`;
}

export function getLockExpiryKey(tripId) {
  return `${LOCK_EXPIRY_PREFIX}${tripId}`;
}

export function markDashboardHoldActive(tripId, seatIds) {
  if (!tripId || !seatIds?.length) {
    return;
  }
  sessionStorage.setItem(
    getHoldActiveKey(tripId),
    JSON.stringify({ seatIds, startedAt: Date.now() }),
  );
}

export function clearDashboardHoldSession(tripId) {
  if (!tripId) {
    return;
  }
  sessionStorage.removeItem(getHoldActiveKey(tripId));
  localStorage.removeItem(getLockExpiryKey(tripId));
}

export function persistLockExpiry(tripId, lockExpiresAt) {
  if (!tripId || !lockExpiresAt) {
    return;
  }
  const expiryMs = new Date(lockExpiresAt).getTime();
  if (Number.isFinite(expiryMs)) {
    localStorage.setItem(getLockExpiryKey(tripId), String(expiryMs));
  }
}

export function readLockExpiryMs(tripId, fallbackLockExpiresAt) {
  const stored = localStorage.getItem(getLockExpiryKey(tripId));
  if (stored != null && stored !== '') {
    const parsed = Number(stored);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  if (fallbackLockExpiresAt) {
    const parsed = new Date(fallbackLockExpiresAt).getTime();
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

/** Best-effort release when the tab is closed mid-booking (not on React unmount). */
export function releaseDashboardHoldOnPageExit(tripId) {
  const raw = sessionStorage.getItem(getHoldActiveKey(tripId));
  if (!raw) {
    return;
  }

  let seatIds = [];
  try {
    const parsed = JSON.parse(raw);
    seatIds = Array.isArray(parsed?.seatIds) ? parsed.seatIds : [];
  } catch {
    sessionStorage.removeItem(getHoldActiveKey(tripId));
    return;
  }

  if (!seatIds.length) {
    clearDashboardHoldSession(tripId);
    return;
  }

  const token = localStorage.getItem('accessToken');
  const base =
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? 'http://localhost:3000' : '');

  if (!base) {
    return;
  }

  try {
    fetch(`${base.replace(/\/$/, '')}/dashboard/bookings/lock`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ tripId, seatIds }),
      keepalive: true,
    });
  } catch {
    // ignore
  }

  clearDashboardHoldSession(tripId);
}
