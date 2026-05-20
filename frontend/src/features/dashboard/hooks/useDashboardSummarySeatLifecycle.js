import { useEffect, useRef } from 'react';
import { releaseDashboardSeats } from '../services/dashboardApi';
import {
  clearDashboardHoldSession,
  markDashboardHoldActive,
  releaseDashboardHoldOnPageExit,
} from '../utils/dashboardSeatHold';

const STRICT_MODE_GUARD_MS = 400;

/**
 * Holds dashboard seat locks only while the booking summary page is active.
 * Releases (backend broadcasts seats.updated) when staff leaves the page,
 * except when booking completed successfully.
 */
export function useDashboardSummarySeatLifecycle({
  tripId,
  seatIds,
  enabled = true,
}) {
  const bookingCompletedRef = useRef(false);
  const releaseStartedRef = useRef(false);
  const allowUnmountReleaseRef = useRef(false);
  const seatIdsKey = Array.isArray(seatIds) ? seatIds.join(',') : '';

  const releaseHeldSeats = async () => {
    if (
      !tripId ||
      !seatIds?.length ||
      bookingCompletedRef.current ||
      releaseStartedRef.current
    ) {
      return;
    }
    releaseStartedRef.current = true;
    try {
      await releaseDashboardSeats({ tripId, seatIds });
    } catch {
      // best-effort; cron will eventually clear expired locks
    } finally {
      clearDashboardHoldSession(tripId);
    }
  };

  const markBookingCompleted = () => {
    bookingCompletedRef.current = true;
    clearDashboardHoldSession(tripId);
  };

  useEffect(() => {
    if (!enabled || !tripId || !seatIds?.length) {
      return undefined;
    }

    markDashboardHoldActive(tripId, seatIds);
    allowUnmountReleaseRef.current = false;

    const guardTimer = setTimeout(() => {
      allowUnmountReleaseRef.current = true;
    }, STRICT_MODE_GUARD_MS);

    const onPageHide = () => {
      if (!bookingCompletedRef.current) {
        releaseDashboardHoldOnPageExit(tripId);
      }
    };

    window.addEventListener('pagehide', onPageHide);

    return () => {
      clearTimeout(guardTimer);
      window.removeEventListener('pagehide', onPageHide);
      if (allowUnmountReleaseRef.current && !bookingCompletedRef.current) {
        releaseHeldSeats();
      }
    };
  }, [enabled, tripId, seatIdsKey]);

  return { markBookingCompleted, releaseHeldSeats };
}
