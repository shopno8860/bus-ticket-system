import { ConfigService } from '@nestjs/config';

/** Parses env minutes into a finite positive value capped at 60. */
function clampPositiveMinutes(raw: string | undefined, fallback: number): number {
  const n = Number(raw ?? fallback);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, 60);
}

/** Lock duration after POST /bookings (seat hold before passenger confirms). */
export function seatLockMs(config: ConfigService): number {
  return (
    clampPositiveMinutes(
      config.get<string>('SEAT_SELECTION_LOCK_MINUTES'),
      2,
    ) *
    60 *
    1000
  );
}

/** Time allowed to complete payment after PATCH /bookings/confirm. */
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
