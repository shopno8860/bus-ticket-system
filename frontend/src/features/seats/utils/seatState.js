/**
 * Whether a bookingSeat row represents a current hold or reservation.
 */
export function isActiveBookingSeat(bookingSeat) {
  if (!bookingSeat) {
    return false;
  }
  const status = String(bookingSeat.status || '').toUpperCase();
  if (status === 'RESERVED') {
    return true;
  }
  if (
    status === 'LOCKED' &&
    bookingSeat.lockExpiresAt &&
    new Date(bookingSeat.lockExpiresAt).getTime() > Date.now()
  ) {
    return true;
  }
  return false;
}

/** Coerce API/WS values to an array (null and non-arrays are common before first sync). */
export function normalizeBookingSeatsList(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Merge REST snapshot with newer real-time snapshot so in-flight fetches
 * do not wipe locks that arrived over WebSocket first.
 */
export function mergeBookingSeatsSnapshots(fromApi, fromRealtime) {
  const apiRows = normalizeBookingSeatsList(fromApi);
  const realtimeRows = normalizeBookingSeatsList(fromRealtime);
  const bySeatId = new Map();

  for (const row of apiRows) {
    const seatKey = row.seatId ?? row.seat?.id;
    if (seatKey && isActiveBookingSeat(row)) {
      bySeatId.set(seatKey, { ...row, seatId: seatKey });
    }
  }

  for (const row of realtimeRows) {
    const seatKey = row.seatId ?? row.seat?.id;
    if (seatKey && isActiveBookingSeat(row)) {
      bySeatId.set(seatKey, { ...row, seatId: seatKey });
    }
  }

  return Array.from(bySeatId.values());
}

/**
 * Map API bookingSeats + bus seats into renderable seat rows with seatState.
 */
export function buildSeatsWithState(busSeats, bookingSeats, currentUserId = null) {
  if (!busSeats?.length) {
    return [];
  }

  const now = Date.now();
  const seatStatusById = new Map();

  for (const bookingSeat of normalizeBookingSeatsList(bookingSeats)) {
    const status = String(bookingSeat.status || '').toUpperCase();
    const seatKey = bookingSeat.seatId ?? bookingSeat.seat?.id;
    if (!seatKey) {
      continue;
    }

    if (status === 'RESERVED') {
      seatStatusById.set(seatKey, 'reserved');
      continue;
    }

    if (
      status === 'LOCKED' &&
      bookingSeat.lockExpiresAt &&
      new Date(bookingSeat.lockExpiresAt).getTime() > now
    ) {
      const heldByMe =
        currentUserId &&
        bookingSeat.lockedByUserId &&
        bookingSeat.lockedByUserId === currentUserId;
      seatStatusById.set(seatKey, heldByMe ? 'heldByMe' : 'locked');
    }
  }

  return busSeats.map((seat) => ({
    ...seat,
    seatState: seatStatusById.get(seat.id) || 'available',
  }));
}
