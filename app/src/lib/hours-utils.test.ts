import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchUpcomingHolidays,
  formatHolidayDate,
  formatTime,
  getDefaultHoursData,
  getFallbackHolidaysForYear,
  getHolidayEmoji,
  nthWeekdayOfMonth,
  processHoursData,
  updateCurrentTime
} from './hours-utils';

describe('hours-utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('formats times correctly across key values', () => {
    expect(formatTime(0)).toBe('');
    expect(formatTime(8.5)).toBe('8:30 AM');
    expect(formatTime(12)).toBe('12 PM');
    expect(formatTime(13)).toBe('1 PM');
    expect(formatTime(9.75)).toBe('9:45 AM');
  });

  it('updates current time display', () => {
    vi.setSystemTime(new Date('2026-02-23T14:05:00'));

    const element = document.createElement('div');
    updateCurrentTime(element);

    expect(element.textContent).toBe('2:05 PM');
  });

  it('fetches upcoming holidays from API response and filters to next seven days', async () => {
    vi.setSystemTime(new Date('2026-07-01T12:00:00'));

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { date: '2026-07-04', name: 'Independence Day' },
          { date: '2026-08-01', name: 'Out of range' },
          { date: '2026-06-30', name: 'Past holiday' }
        ]
      })
    );

    const holidays = await fetchUpcomingHolidays();
    expect(holidays).toEqual([{ date: '2026-07-04', name: 'Independence Day' }]);
  });

  it('falls back to built-in holiday list when API fails', async () => {
    vi.setSystemTime(new Date('2026-07-01T12:00:00'));

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => []
      })
    );

    const holidays = await fetchUpcomingHolidays();
    expect(holidays).toEqual([{ date: '2026-07-04', name: 'Independence Day' }]);
  });

  it('returns empty fallback holiday list when no known holidays are in range', async () => {
    vi.setSystemTime(new Date('2026-03-01T12:00:00'));

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network issue')));

    const holidays = await fetchUpcomingHolidays();
    expect(holidays).toEqual([]);
  });

  it('computes floating holidays for the requested year instead of hardcoding 2024 dates', () => {
    const byName = (year: number) =>
      Object.fromEntries(getFallbackHolidaysForYear(year).map(h => [h.name, h.date]));

    expect(byName(2026)).toMatchObject({
      "New Year's Day": '2026-01-01',
      'Martin Luther King Jr. Day': '2026-01-19',
      'Presidents Day': '2026-02-16',
      'Memorial Day': '2026-05-25',
      'Independence Day': '2026-07-04',
      'Labor Day': '2026-09-07',
      'Columbus Day': '2026-10-12',
      'Veterans Day': '2026-11-11',
      'Thanksgiving Day': '2026-11-26',
      'Christmas Day': '2026-12-25'
    });
    expect(byName(2027)).toMatchObject({
      'Martin Luther King Jr. Day': '2027-01-18',
      'Presidents Day': '2027-02-15',
      'Memorial Day': '2027-05-31',
      'Labor Day': '2027-09-06',
      'Columbus Day': '2027-10-11',
      'Thanksgiving Day': '2027-11-25'
    });
  });

  it('finds nth and last weekdays of a month', () => {
    expect(nthWeekdayOfMonth(2026, 0, 1, 3)).toBe(19); // 3rd Monday Jan 2026
    expect(nthWeekdayOfMonth(2026, 4, 1, -1)).toBe(25); // last Monday May 2026
    expect(nthWeekdayOfMonth(2026, 10, 4, 4)).toBe(26); // 4th Thursday Nov 2026
    expect(nthWeekdayOfMonth(2025, 8, 1, 1)).toBe(1); // Sep 1 2025 is a Monday
  });

  it('uses the computed fallback dates (Thanksgiving 2026 is Nov 26, not Nov 28)', async () => {
    vi.setSystemTime(new Date('2026-11-22T12:00:00'));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network issue')));

    const holidays = await fetchUpcomingHolidays();
    expect(holidays).toEqual([{ date: '2026-11-26', name: 'Thanksgiving Day' }]);
  });

  it("includes next year's holidays in late December (API path)", async () => {
    vi.setSystemTime(new Date('2026-12-29T12:00:00'));
    const fetchMock = vi.fn().mockImplementation(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes('/2027/')
          ? [
              { date: '2027-01-01', name: "New Year's Day" },
              { date: '2027-01-18', name: 'Martin Luther King Jr. Day' }
            ]
          : [{ date: '2026-12-25', name: 'Christmas Day' }]
    }));
    vi.stubGlobal('fetch', fetchMock);

    const holidays = await fetchUpcomingHolidays();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith('https://date.nager.at/api/v3/publicholidays/2027/US');
    expect(holidays).toEqual([{ date: '2027-01-01', name: "New Year's Day" }]);
  });

  it("includes next year's holidays in late December (fallback path)", async () => {
    vi.setSystemTime(new Date('2026-12-29T12:00:00'));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network issue')));

    const holidays = await fetchUpcomingHolidays();
    expect(holidays).toEqual([{ date: '2027-01-01', name: "New Year's Day" }]);
  });

  it('provides expected default hours data for weekdays and weekends', () => {
    const defaults = getDefaultHoursData();

    expect(defaults.Monday).toMatchObject({
      start: 8.5,
      end: 15,
      before_care_offset: 1,
      after_care_offset: 2.5,
      aftercare_available: true,
      closed: false
    });

    expect(defaults.Saturday).toMatchObject({
      start: 0,
      end: 0,
      aftercare_available: false,
      closed: true
    });
  });

  it('maps holiday names to the expected emoji and formats holiday dates', () => {
    expect(getHolidayEmoji("New Year's Day")).toBe('🎊');
    expect(getHolidayEmoji('Thanksgiving Day')).toBe('🦃');
    expect(getHolidayEmoji('Unlisted Holiday')).toBe('🎉');

    vi.setSystemTime(new Date('2026-07-01T12:00:00'));
    expect(formatHolidayDate('2026-07-01')).toBe('Today');
    expect(formatHolidayDate('2026-07-02')).toBe('Tomorrow');
    expect(formatHolidayDate('2026-07-04')).toBe('Saturday, Jul 4');
  });

  it('converts database hours and fills missing days with defaults', () => {
    const processed = processHoursData(
      [
        {
          day_of_week: 'Monday',
          start_time: 9,
          end_time: 16,
          before_care_offset: 2,
          after_care_offset: 1,
          aftercare_available: false,
          closed: false
        },
        {
          day_of_week: 'Tuesday',
          closed: true
        }
      ],
      ['Monday', 'Tuesday', 'Friday', 'Saturday']
    );

    expect(processed.Monday).toMatchObject({
      start: 9,
      end: 16,
      before_care_offset: 2,
      after_care_offset: 1,
      aftercare_available: false,
      closed: false
    });

    expect(processed.Tuesday).toMatchObject({
      start: 0,
      end: 0,
      closed: true
    });

    expect(processed.Friday).toMatchObject({
      start: 8.5,
      end: 15,
      aftercare_available: false,
      closed: false
    });

    expect(processed.Saturday).toMatchObject({
      start: 0,
      end: 0,
      closed: true
    });
  });

  it('returns default hours data when database rows are empty', () => {
    expect(processHoursData([], ['Monday', 'Tuesday'])).toEqual(getDefaultHoursData());
  });
});
