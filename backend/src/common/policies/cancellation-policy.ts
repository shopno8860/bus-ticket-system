export function getHoursBeforeDeparture(
  requestTime: Date,
  departureTime: Date,
): number {
  return (departureTime.getTime() - requestTime.getTime()) / (1000 * 60 * 60);
}

export function canCancelBooking(hoursBeforeDeparture: number): boolean {
  return hoursBeforeDeparture >= 2;
}

export function getRefundPercentage(hoursBeforeDeparture: number): number {
  if (hoursBeforeDeparture >= 24) {
    return 0.9;
  }
  if (hoursBeforeDeparture >= 6) {
    return 0.5;
  }
  if (hoursBeforeDeparture >= 2) {
    return 0.25;
  }
  return 0;
}
