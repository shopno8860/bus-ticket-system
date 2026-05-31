import {
  formatPassengerSeatNumber,
  formatSleeperSeatNumber,
  isLegacyRowColSeatNumber,
  normalizeSeatNumber,
} from './seat-label.util';

describe('seat-label.util', () => {
  describe('formatPassengerSeatNumber', () => {
    it('maps row/column to letter-number labels', () => {
      expect(formatPassengerSeatNumber(1, 1)).toBe('A1');
      expect(formatPassengerSeatNumber(1, 4)).toBe('A4');
      expect(formatPassengerSeatNumber(2, 1)).toBe('B1');
      expect(formatPassengerSeatNumber(9, 4)).toBe('I4');
    });
  });

  describe('formatSleeperSeatNumber', () => {
    it('prefixes deck letter to row/column label', () => {
      expect(formatSleeperSeatNumber('U', 1, 1)).toBe('UA1');
      expect(formatSleeperSeatNumber('L', 2, 3)).toBe('LB3');
    });
  });

  describe('normalizeSeatNumber', () => {
    it('converts legacy R#C# labels', () => {
      expect(normalizeSeatNumber('R1C1')).toBe('A1');
      expect(normalizeSeatNumber('R2C3')).toBe('B3');
      expect(isLegacyRowColSeatNumber('R10C2')).toBe(true);
      expect(normalizeSeatNumber('R10C2')).toBe('J2');
    });

    it('converts legacy sleeper U##/L## using row/column', () => {
      expect(normalizeSeatNumber('U01', 1, 1)).toBe('UA1');
      expect(normalizeSeatNumber('L01', 7, 4)).toBe('LA1');
    });

    it('returns modern labels unchanged', () => {
      expect(normalizeSeatNumber('A1', 1, 1)).toBe('A1');
      expect(normalizeSeatNumber('UA2', 1, 2)).toBe('UA2');
    });
  });
});
