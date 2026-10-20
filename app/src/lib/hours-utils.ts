// Hours Widget Utilities
// Extracted from HoursWidget.astro to reduce complexity

interface HoursData {
  start: number;
  end: number;
  before_care_offset: number;
  after_care_offset: number;
  aftercare_available: boolean;
  closed: boolean;
}

interface Holiday {
  date: string;
  name: string;
  localName?: string;
}

interface DatabaseHoursRow {
  day_of_week: string;
  start_time?: number;
  end_time?: number;
  before_care_offset?: number;
  after_care_offset?: number;
  aftercare_available?: boolean;
  closed?: boolean;
}

// Format time helper with improved formatting
export function formatTime(value: number): string {
  if (value === 0) return '';

  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  if (minutes === 0) {
    return `${displayHour} ${ampm}`;
  } else {
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }
}

// Update current time display
export function updateCurrentTime(timeElement: HTMLElement): void {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  timeElement.textContent = `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

const HOLIDAY_LOOKAHEAD_DAYS = 7;

const getHolidayWindow = (): { today: Date; windowEnd: Date } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowEnd = new Date(today);
  windowEnd.setDate(today.getDate() + HOLIDAY_LOOKAHEAD_DAYS);
  windowEnd.setHours(23, 59, 59, 999);
  return { today, windowEnd };
};

/** Calendar years the lookahead window touches (two in late December). */
const getWindowYears = (today: Date, windowEnd: Date): number[] => {
  const years: number[] = [];
  for (let year = today.getFullYear(); year <= windowEnd.getFullYear(); year++) {
    years.push(year);
  }
  return years;
};

const isWithinWindow = (dateString: string, today: Date, windowEnd: Date): boolean => {
  const [year, month, day] = dateString.split('-').map(Number);
  const holidayDate = new Date(year, month - 1, day);
  return holidayDate >= today && holidayDate <= windowEnd;
};

// Fetch US holidays from public API
export async function fetchUpcomingHolidays(): Promise<Holiday[]> {
  const { today, windowEnd } = getHolidayWindow();

  try {
    const holidaysByYear = await Promise.all(
      getWindowYears(today, windowEnd).map(async year => {
        const response = await fetch(`https://date.nager.at/api/v3/publicholidays/${year}/US`);
        if (!response.ok) {
          throw new Error(`Holiday API responded ${response.status}`);
        }
        return (await response.json()) as Holiday[];
      })
    );

    return holidaysByYear
      .flat()
      .filter((holiday: Holiday) => isWithinWindow(holiday.date, today, windowEnd));
  } catch {
    return getFallbackHolidays(today, windowEnd);
  }
}

const pad2 = (value: number): string => String(value).padStart(2, '0');

const toDateString = (year: number, monthIndex: number, day: number): string =>
  `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;

/**
 * Day-of-month of the nth `weekday` (0=Sun..6=Sat) in a month; n = -1 means the last one.
 * Exported for tests.
 */
export function nthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  n: number
): number {
  if (n === -1) {
    const lastDay = new Date(year, monthIndex + 1, 0);
    const back = (lastDay.getDay() - weekday + 7) % 7;
    return lastDay.getDate() - back;
  }
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const firstMatch = 1 + ((weekday - firstWeekday + 7) % 7);
  return firstMatch + (n - 1) * 7;
}

const MONDAY = 1;
const THURSDAY = 4;

/** Built-in US federal holiday list for a given year (floating holidays computed, not hardcoded). */
export function getFallbackHolidaysForYear(year: number): Holiday[] {
  return [
    { date: toDateString(year, 0, 1), name: "New Year's Day" },
    {
      date: toDateString(year, 0, nthWeekdayOfMonth(year, 0, MONDAY, 3)),
      name: 'Martin Luther King Jr. Day'
    },
    { date: toDateString(year, 1, nthWeekdayOfMonth(year, 1, MONDAY, 3)), name: 'Presidents Day' },
    { date: toDateString(year, 4, nthWeekdayOfMonth(year, 4, MONDAY, -1)), name: 'Memorial Day' },
    { date: toDateString(year, 6, 4), name: 'Independence Day' },
    { date: toDateString(year, 8, nthWeekdayOfMonth(year, 8, MONDAY, 1)), name: 'Labor Day' },
    { date: toDateString(year, 9, nthWeekdayOfMonth(year, 9, MONDAY, 2)), name: 'Columbus Day' },
    { date: toDateString(year, 10, 11), name: 'Veterans Day' },
    {
      date: toDateString(year, 10, nthWeekdayOfMonth(year, 10, THURSDAY, 4)),
      name: 'Thanksgiving Day'
    },
    { date: toDateString(year, 11, 25), name: 'Christmas Day' }
  ];
}

// Fallback holiday data
function getFallbackHolidays(today: Date, windowEnd: Date): Holiday[] {
  return getWindowYears(today, windowEnd)
    .flatMap(getFallbackHolidaysForYear)
    .filter(holiday => isWithinWindow(holiday.date, today, windowEnd));
}

// Get default hours data
export function getDefaultHoursData(): Record<string, HoursData> {
  return {
    Sunday: {
      start: 0,
      end: 0,
      before_care_offset: 0,
      after_care_offset: 0,
      aftercare_available: false,
      closed: true
    },
    Monday: {
      start: 8.5,
      end: 15,
      before_care_offset: 1,
      after_care_offset: 2.5,
      aftercare_available: true,
      closed: false
    },
    Tuesday: {
      start: 8.5,
      end: 15,
      before_care_offset: 1,
      after_care_offset: 2.5,
      aftercare_available: true,
      closed: false
    },
    Wednesday: {
      start: 8.5,
      end: 15,
      before_care_offset: 1,
      after_care_offset: 2.5,
      aftercare_available: true,
      closed: false
    },
    Thursday: {
      start: 8.5,
      end: 15,
      before_care_offset: 1,
      after_care_offset: 2.5,
      aftercare_available: true,
      closed: false
    },
    Friday: {
      start: 8.5,
      end: 15,
      before_care_offset: 1,
      after_care_offset: 0,
      aftercare_available: false,
      closed: false
    },
    Saturday: {
      start: 0,
      end: 0,
      before_care_offset: 0,
      after_care_offset: 0,
      aftercare_available: false,
      closed: true
    }
  };
}

// Helper function to get appropriate emoji for holidays
export function getHolidayEmoji(holidayName: string): string {
  const name = holidayName.toLowerCase();

  if (name.includes('new year')) return '🎊';
  if (name.includes('martin luther king')) return '✊';
  if (name.includes('president')) return '🇺🇸';
  if (name.includes('memorial')) return '🇺🇸';
  if (name.includes('independence') || name.includes('july')) return '🎆';
  if (name.includes('labor')) return '⚒️';
  if (name.includes('columbus')) return '⛵';
  if (name.includes('veteran')) return '🇺🇸';
  if (name.includes('thanksgiving')) return '🦃';
  if (name.includes('christmas')) return '🎄';

  return '🎉'; // Default holiday emoji
}

// Helper function to format holiday date
export function formatHolidayDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowMidnight = new Date(
    tomorrow.getFullYear(),
    tomorrow.getMonth(),
    tomorrow.getDate()
  );
  const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateMidnight.getTime() === todayMidnight.getTime()) {
    return 'Today';
  } else if (dateMidnight.getTime() === tomorrowMidnight.getTime()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  }
}

// Convert database hours to local format
export function processHoursData(
  dbHours: DatabaseHoursRow[],
  days: string[]
): Record<string, HoursData> {
  const hoursData: Record<string, HoursData> = {};

  if (dbHours && dbHours.length > 0) {
    dbHours.forEach(hour => {
      const closed = hour.closed || false;
      const start = typeof hour.start_time === 'number' ? hour.start_time : 8.5;
      const end = typeof hour.end_time === 'number' ? hour.end_time : 15;
      hoursData[hour.day_of_week] = {
        start: closed ? 0 : start,
        end: closed ? 0 : end,
        before_care_offset: hour.before_care_offset || 1,
        after_care_offset: hour.after_care_offset || 2.5,
        aftercare_available: hour.aftercare_available !== false,
        closed
      };
    });

    // Fill in any missing days with sensible defaults
    days.forEach(day => {
      if (!hoursData[day]) {
        const isWeekend = day === 'Saturday' || day === 'Sunday';
        hoursData[day] = {
          start: isWeekend ? 0 : 8.5,
          end: isWeekend ? 0 : 15,
          before_care_offset: isWeekend ? 0 : 1,
          after_care_offset: isWeekend ? 0 : 2.5,
          aftercare_available: !isWeekend && day !== 'Friday',
          closed: isWeekend
        };
      }
    });

    return hoursData;
  } else {
    return getDefaultHoursData();
  }
}
