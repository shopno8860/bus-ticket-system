const LEGACY_ROW_COL_PATTERN = /^R(\d+)C(\d+)$/i;
const LEGACY_SLEEPER_PATTERN = /^([UL])(\d{2})$/i;

export function formatPassengerSeatNumber(rowNumber, columnNumber) {
  if (rowNumber < 1 || columnNumber < 1) {
    return null;
  }
  if (rowNumber > 26) {
    return `R${rowNumber}C${columnNumber}`;
  }
  return `${String.fromCharCode(64 + rowNumber)}${columnNumber}`;
}

export function normalizeSeatNumber(seatNumber, rowNumber, columnNumber) {
  const legacy = LEGACY_ROW_COL_PATTERN.exec(seatNumber ?? '');
  if (legacy) {
    return formatPassengerSeatNumber(Number(legacy[1]), Number(legacy[2]));
  }

  if (rowNumber == null || columnNumber == null || rowNumber < 1 || columnNumber < 1) {
    return seatNumber ?? '';
  }

  const sleeper = LEGACY_SLEEPER_PATTERN.exec(seatNumber ?? '');
  if (sleeper) {
    const deck = sleeper[1].toUpperCase();
    const deckRows = 6;
    const seatsPerDeckRow = 3;
    const isUpper = deck === 'U';
    const rowInDeck = isUpper
      ? rowNumber
      : rowNumber > deckRows
        ? rowNumber - deckRows
        : rowNumber;
    const colInDeck = isUpper
      ? columnNumber <= seatsPerDeckRow
        ? columnNumber
        : columnNumber - seatsPerDeckRow
      : columnNumber > seatsPerDeckRow
        ? columnNumber - seatsPerDeckRow
        : columnNumber;
    const label = formatPassengerSeatNumber(rowInDeck, colInDeck);
    return label ? `${deck}${label}` : seatNumber;
  }

  return seatNumber ?? '';
}

/** Display label for a seat object from the API. */
export function getDisplaySeatNumber(seat) {
  if (!seat) return '';
  if (typeof seat === 'string') {
    return normalizeSeatNumber(seat);
  }
  return normalizeSeatNumber(seat.seatNumber, seat.rowNumber, seat.columnNumber);
}
