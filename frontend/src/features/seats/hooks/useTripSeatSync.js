import { useEffect, useRef } from 'react';
import {
  acquireSeatSyncSocket,
  releaseSeatSyncSocket,
} from '../../../services/seatSync';

const SEAT_REFRESH_MS = 10_000;

/**
 * Subscribe to real-time seat lock updates for a trip via WebSocket.
 * Also polls the REST trip endpoint so seat status stays fresh even if WS misses an event.
 * @param {string | undefined} tripId
 * @param {{ enabled?: boolean, onSeatsUpdated?: (bookingSeats: Array) => void, onFallbackPoll?: () => void }} options
 */
export function useTripSeatSync(tripId, { enabled = true, onSeatsUpdated, onFallbackPoll } = {}) {
  const onSeatsUpdatedRef = useRef(onSeatsUpdated);
  const onFallbackPollRef = useRef(onFallbackPoll);
  const wasConnectedRef = useRef(false);

  useEffect(() => {
    onSeatsUpdatedRef.current = onSeatsUpdated;
  }, [onSeatsUpdated]);

  useEffect(() => {
    onFallbackPollRef.current = onFallbackPoll;
  }, [onFallbackPoll]);

  useEffect(() => {
    if (!enabled || !tripId) {
      return undefined;
    }

    const socket = acquireSeatSyncSocket();
    if (!socket) {
      return undefined;
    }

    const handleSeatsUpdated = (payload) => {
      if (payload?.type === 'seats.updated' && payload.tripId === tripId) {
        const rows = Array.isArray(payload.bookingSeats) ? payload.bookingSeats : [];
        onSeatsUpdatedRef.current?.(rows);
      }
    };

    const joinTrip = () => {
      wasConnectedRef.current = true;
      socket.emit('joinTrip', { tripId });
    };

    socket.on('connect', joinTrip);
    socket.on('seats.updated', handleSeatsUpdated);

    if (socket.connected) {
      joinTrip();
    }

    return () => {
      socket.off('connect', joinTrip);
      socket.off('seats.updated', handleSeatsUpdated);
      if (wasConnectedRef.current) {
        socket.emit('leaveTrip', { tripId });
      }
      releaseSeatSyncSocket();
    };
  }, [tripId, enabled]);

  useEffect(() => {
    if (!enabled || !tripId || !onFallbackPollRef.current) {
      return undefined;
    }

    const refreshTimer = setInterval(() => {
      onFallbackPollRef.current?.();
    }, SEAT_REFRESH_MS);
    return () => clearInterval(refreshTimer);
  }, [tripId, enabled]);
}
