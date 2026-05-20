import { useEffect, useRef } from 'react';
import {
  acquireSeatSyncSocket,
  releaseSeatSyncSocket,
} from '../../../services/seatSync';

const FALLBACK_POLL_MS = 30_000;

/**
 * Subscribe to real-time seat lock updates for a trip via WebSocket.
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

    let fallbackTimer;

    const clearFallback = () => {
      if (fallbackTimer) {
        clearInterval(fallbackTimer);
        fallbackTimer = undefined;
      }
    };

    const startFallback = () => {
      if (!onFallbackPollRef.current || fallbackTimer) {
        return;
      }
      fallbackTimer = setInterval(() => {
        onFallbackPollRef.current?.();
      }, FALLBACK_POLL_MS);
    };

    socket.on('connect', joinTrip);
    socket.on('seats.updated', handleSeatsUpdated);
    socket.on('disconnect', startFallback);

    socket.on('connect_error', () => {
      startFallback();
    });

    if (socket.connected) {
      joinTrip();
      clearFallback();
    }

    return () => {
      clearFallback();
      socket.off('connect', joinTrip);
      socket.off('seats.updated', handleSeatsUpdated);
      socket.off('disconnect', startFallback);
      socket.off('connect_error', startFallback);
      if (wasConnectedRef.current) {
        socket.emit('leaveTrip', { tripId });
      }
      releaseSeatSyncSocket();
    };
  }, [tripId, enabled]);
}
