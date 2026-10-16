import { describe, expect, it } from 'vitest';
import { FixedClock, SystemClock } from '../../src/utils/clock.js';
import { addDays, daysBetween, formatDate, isValidDateString } from '../../src/utils/dates.js';
import { paginate, parsePagination } from '../../src/utils/pagination.js';
import { round, round1, round2 } from '../../src/utils/round.js';

describe('Utility Modules', () => {
  describe('Rounding Utilities (round.js)', () => {
    it('Round.Math: accurately rounds numbers to specified decimals', () => {
      expect(round(12.3456, 2)).toBe(12.35);
      expect(round2(100.555)).toBe(100.56);
      expect(round2(100.554)).toBe(100.55);
      expect(round1(24.56)).toBe(24.6);
      expect(round2('NaN')).toBe(0);
    });
  });

  describe('Date Utilities (dates.js)', () => {
    it('Date.Validate: validates YYYY-MM-DD date strings accurately', () => {
      expect(isValidDateString('2026-04-15')).toBe(true);
      expect(isValidDateString('2026-02-29')).toBe(false); // 2026 is not leap year
      expect(isValidDateString('15-04-2026')).toBe(false);
      expect(isValidDateString('invalid')).toBe(false);
    });

    it('Date.Add: correctly increments days across month and year boundaries', () => {
      expect(addDays('2026-04-15', 5)).toBe('2026-04-20');
      expect(addDays('2026-04-28', 5)).toBe('2026-05-03');
    });

    it('Date.Diff: calculates days between two dates', () => {
      expect(daysBetween('2026-04-15', '2026-04-20')).toBe(5);
      expect(daysBetween('2026-04-20', '2026-04-15')).toBe(-5);
    });

    it('Date.Format: formats date correctly', () => {
      expect(formatDate('2026-04-15')).toBe('2026-04-15');
      const d = new Date('2026-04-15T00:00:00Z');
      expect(formatDate(d)).toBe('2026-04-15');
    });
  });

  describe('Clock Contracts & Implementations (clock.js)', () => {
    it('Clock.System: returns current time', () => {
      const clock = new SystemClock();
      expect(clock.now()).toBeInstanceOf(Date);
      expect(clock.today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('Clock.Fixed: supports time freezing and advancing in tests', () => {
      const clock = new FixedClock('2026-04-15T12:00:00.000Z');
      expect(clock.today()).toBe('2026-04-15');
      expect(clock.iso()).toBe('2026-04-15T12:00:00.000Z');

      clock.advance(3600 * 1000); // +1 hour
      expect(clock.iso()).toBe('2026-04-15T13:00:00.000Z');
    });
  });

  describe('Keyset Pagination (pagination.js)', () => {
    it('Pagination.Parse: enforces default and max bounds', () => {
      expect(parsePagination({})).toEqual({ limit: 20, cursor: null });
      expect(parsePagination({ limit: '150' })).toEqual({ limit: 100, cursor: null });
      expect(parsePagination({ limit: '10', cursor: '42' })).toEqual({ limit: 10, cursor: 42 });
      expect(parsePagination({ limit: '-5', cursor: 'abc' })).toEqual({ limit: 20, cursor: null });
    });

    it('Pagination.Format: generates next_cursor accurately for keyset pagination', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const page1 = paginate(items, 2, 'id');
      expect(page1.data).toHaveLength(2);
      expect(page1.next_cursor).toBe(2);

      const page2 = paginate([{ id: 3 }], 2, 'id');
      expect(page2.data).toHaveLength(1);
      expect(page2.next_cursor).toBeNull();
    });
  });
});
