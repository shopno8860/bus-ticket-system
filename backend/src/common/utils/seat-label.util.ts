const LEGACY_ROW_COL_PATTERN = /^R(\d+)C(\d+)$/i;
const LEGACY_SLEEPER_PATTERN = /^([UL])(\d{2})$/i;

/** Passenger-facing label: row A–Z + column number (e.g. A1, B3). */
export function formatPassengerSeatNumber(
  rowNumber: number,
  columnNumber: number,
): string {
  if (rowNumber < 1 || columnNumber < 1) {
    throw new Error(
      `Invalid seat position: row ${rowNumber}, column ${columnNumber}`,
    );
  }
  if (rowNumber > 26) {
    return `R${rowNumber}C${columnNumber}`;
  }
  const rowLetter = String.fromCharCode(64 + rowNumber);
  return `${rowLetter}${columnNumber}`;
}

export function formatSleeperSeatNumber(
  deck: 'U' | 'L',
  rowInDeck: number,
  columnInDeck: number,
): string {
  return `${deck}${formatPassengerSeatNumber(rowInDeck, columnInDeck)}`;
}

export function isLegacyRowColSeatNumber(seatNumber: string): boolean {
  return LEGACY_ROW_COL_PATTERN.test(seatNumber);
}

export function parseLegacyRowColSeatNumber(seatNumber: string): {
  rowNumber: number;
  columnNumber: number;
} | null {
  const match = LEGACY_ROW_COL_PATTERN.exec(seatNumber);
  if (!match) {
    return null;
  }
  return {
    rowNumber: Number(match[1]),
    columnNumber: Number(match[2]),
  };
}

/**
 * Returns a passenger-friendly seat label.
 * Uses row/column when legacy R#C# or U##/L## codes are stored.
 */
export function normalizeSeatNumber(
  seatNumber: string,
  rowNumber?: number | null,
  columnNumber?: number | null,
): string {
  const legacy = parseLegacyRowColSeatNumber(seatNumber);
  if (legacy) {
    return formatPassengerSeatNumber(legacy.rowNumber, legacy.columnNumber);
  }

  if (rowNumber == null || columnNumber == null || rowNumber < 1 || columnNumber < 1) {
    return seatNumber;
  }

  const sleeperMatch = LEGACY_SLEEPER_PATTERN.exec(seatNumber);
  if (sleeperMatch) {
    const deck = sleeperMatch[1].toUpperCase() as 'U' | 'L';
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
    if (rowInDeck >= 1 && colInDeck >= 1) {
      return formatSleeperSeatNumber(deck, rowInDeck, colInDeck);
    }
  }

  return seatNumber;
}

export function withNormalizedSeatNumber<T extends {
  seatNumber: string;
  rowNumber?: number | null;
  columnNumber?: number | null;
}>(seat: T): T {
  return {
    ...seat,
    seatNumber: normalizeSeatNumber(
      seat.seatNumber,
      seat.rowNumber,
      seat.columnNumber,
    ),
  };
}

type BookingSeatWithSeat = {
  seat?: {
    seatNumber: string;
    rowNumber?: number | null;
    columnNumber?: number | null;
  } | null;
};

/** Normalize nested seat labels on booking payloads (tickets, history). */
export function withNormalizedBookingSeats<T extends {
  bookingSeats?: BookingSeatWithSeat[];
}>(booking: T): T {
  if (!booking.bookingSeats?.length) {
    return booking;
  }

  return {
    ...booking,
    bookingSeats: booking.bookingSeats.map((bookingSeat) => {
      if (!bookingSeat.seat) {
        return bookingSeat;
      }
      return {
        ...bookingSeat,
        seat: withNormalizedSeatNumber(bookingSeat.seat),
      };
    }),
  };
}
