import { ConfigService } from '@nestjs/config';

/**
 * Parses env minutes into a finite positive value capped at 60.
 * ENV থেকে মিনিট পড়ার সময় invalid/negative হলে fallback নেয় এবং max 60 মিনিট cap করে।
 */
function clampPositiveMinutes(
  raw: string | undefined,
  fallback: number,
): number {
  const n = Number(raw ?? fallback);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, 60);
}

/**
 * Lock duration after POST /bookings (seat hold before passenger confirms).
 * seat selection/lock কতক্ষণ থাকবে (ms এ) সেটা config/env থেকে বের করে।
 */
export function seatLockMs(config: ConfigService): number {
  return (
    clampPositiveMinutes(config.get<string>('SEAT_SELECTION_LOCK_MINUTES'), 2) *
    60 *
    1000
  );
}

/**
 * Time allowed to complete payment after PATCH /bookings/confirm.
 * booking confirm হওয়ার পর payment complete করার সর্বোচ্চ সময় (ms এ) রিটার্ন করে।
 */
export function paymentWindowMs(config: ConfigService): number {
  return (
    clampPositiveMinutes(
      config.get<string>('BOOKING_PAYMENT_TIMEOUT_MINUTES'),
      2,
    ) *
    60 *
    1000
  );
}

/**
 * Lock duration for dashboard/staff seat holds (POST /dashboard/bookings/lock).
 * Falls back to SEAT_SELECTION_LOCK_MINUTES when DASHBOARD_SEAT_LOCK_MINUTES is unset.
 */
export function dashboardSeatLockMs(config: ConfigService): number {
  const dedicated = config.get<string>('DASHBOARD_SEAT_LOCK_MINUTES');
  if (dedicated != null && dedicated !== '') {
    return clampPositiveMinutes(dedicated, 2) * 60 * 1000;
  }
  return seatLockMs(config);
}
