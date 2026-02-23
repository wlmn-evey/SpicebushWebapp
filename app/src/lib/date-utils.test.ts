import { describe, expect, it, vi } from 'vitest';
import { compareDates, formatBlogDate, getISOString, safeParseDate } from './date-utils';

describe('date-utils', () => {
  it('safely parses valid and invalid date inputs', () => {
    expect(safeParseDate('2026-02-23')).toBeInstanceOf(Date);
    expect(safeParseDate(1700000000000)).toBeInstanceOf(Date);

    const dateObject = new Date('2026-02-23T12:00:00Z');
    expect(safeParseDate(dateObject)).toBe(dateObject);

    expect(safeParseDate('not-a-date')).toBeNull();
    expect(safeParseDate({} as unknown as string)).toBeNull();
    expect(safeParseDate(null)).toBeNull();
    expect(safeParseDate(undefined)).toBeNull();
  });

  it('formats blog dates and falls back for invalid input', () => {
    expect(formatBlogDate('2026-02-23')).toMatch(/2026/);
    expect(formatBlogDate('not-a-date')).toBe('Date unavailable');

    const toLocaleSpy = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockImplementationOnce(() => {
        throw new Error('locale unavailable');
      });

    expect(formatBlogDate('2026-02-23')).toBe(new Date('2026-02-23').toDateString());
    expect(toLocaleSpy).toHaveBeenCalled();
  });

  it('gets ISO strings and safely handles conversion failures', () => {
    expect(getISOString('2026-02-23')).toMatch(/^2026-02-23T/);
    expect(getISOString('invalid')).toBe('');

    const isoSpy = vi.spyOn(Date.prototype, 'toISOString').mockImplementationOnce(() => {
      throw new Error('broken');
    });

    expect(getISOString('2026-02-24')).toBe('');
    expect(isoSpy).toHaveBeenCalled();
  });

  it('compares dates in descending and ascending order with null handling', () => {
    expect(compareDates('2026-02-24', '2026-02-23', true)).toBeLessThan(0);
    expect(compareDates('2026-02-24', '2026-02-23', false)).toBeGreaterThan(0);

    expect(compareDates(null, null)).toBe(0);
    expect(compareDates(null, '2026-02-23')).toBe(1);
    expect(compareDates('2026-02-23', null)).toBe(-1);
  });
});
