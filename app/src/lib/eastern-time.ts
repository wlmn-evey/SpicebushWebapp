/**
 * School-local (US Eastern) time helpers.
 *
 * The server runtime (Netlify Functions) is UTC, but every human-entered or human-read time in
 * the back office means "Eastern time at the school". `<input type="datetime-local">` submits a
 * zone-less wall-clock string ("2026-10-20T08:00"); `Date.parse` would read that as UTC on the
 * server, storing 8:00 AM as 08:00Z = 4:00 AM EDT. These helpers convert explicitly, DST-correct,
 * using only `Intl` (no tz database dependency).
 */

export const SCHOOL_TIME_ZONE = 'America/New_York';

/** Zone-less wall-clock value: `YYYY-MM-DD`, optionally `THH:mm`, `:ss`, `.sss` (space also ok). */
const NAIVE_DATETIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?)?$/;

export interface ZonedDateTimeParts {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const getPartsFormatter = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
};

/** Calendar/clock fields of an instant as seen in `timeZone` (default: the school's zone). */
export function getZonedParts(
  instant: Date | number,
  timeZone: string = SCHOOL_TIME_ZONE
): ZonedDateTimeParts {
  const date = typeof instant === 'number' ? new Date(instant) : instant;
  const values: Record<string, number> = {};
  for (const part of getPartsFormatter(timeZone).formatToParts(date)) {
    if (part.type !== 'literal') {
      values[part.type] = Number.parseInt(part.value, 10);
    }
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    // Some engines still emit "24" for midnight even with h23; normalize defensively.
    hour: values.hour === 24 ? 0 : values.hour,
    minute: values.minute,
    second: values.second
  };
}

/** Offset (zone wall clock minus UTC) in ms for `timeZone` at the given instant. */
const getOffsetMs = (epochMs: number, timeZone: string): number => {
  const flooredMs = Math.floor(epochMs / 1000) * 1000;
  const p = getZonedParts(flooredMs, timeZone);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallAsUtc - flooredMs;
};

/**
 * Convert wall-clock fields in `timeZone` to the UTC instant they denote.
 *
 * DST edge cases follow Temporal's "compatible" disambiguation:
 * - Ambiguous fall-back hour (e.g. 1:30 AM on 2026-11-01 happens twice) → the EARLIER (EDT) one.
 * - Nonexistent spring-forward hour (e.g. 2:30 AM on 2026-03-08) → shifted forward (3:30 AM EDT).
 */
export function zonedWallTimeToUtc(
  parts: ZonedDateTimeParts,
  timeZone: string = SCHOOL_TIME_ZONE
): Date {
  const wallAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  const firstOffset = getOffsetMs(wallAsUtc, timeZone);
  const firstGuess = wallAsUtc - firstOffset;
  const secondOffset = getOffsetMs(firstGuess, timeZone);
  if (secondOffset === firstOffset) {
    return new Date(firstGuess);
  }

  const secondGuess = wallAsUtc - secondOffset;
  if (getOffsetMs(secondGuess, timeZone) === secondOffset) {
    return new Date(secondGuess);
  }

  // Wall time falls in a spring-forward gap: the first guess is the forward-shifted instant.
  return new Date(firstGuess);
}

/**
 * Parse a zone-less `YYYY-MM-DD[THH:mm[:ss]]` string as Eastern wall-clock time.
 * Returns null for anything that is not a well-formed naive value.
 */
export function parseEasternWallTime(value: string): Date | null {
  const match = NAIVE_DATETIME_PATTERN.exec(value.trim());
  if (!match) return null;

  const [, y, mo, d, h = '0', mi = '0', s = '0'] = match;
  const parts: ZonedDateTimeParts = {
    year: Number(y),
    month: Number(mo),
    day: Number(d),
    hour: Number(h),
    minute: Number(mi),
    second: Number(s)
  };

  if (
    parts.month < 1 ||
    parts.month > 12 ||
    parts.day < 1 ||
    parts.day > 31 ||
    parts.hour > 23 ||
    parts.minute > 59 ||
    parts.second > 59
  ) {
    return null;
  }

  // Reject calendar overflow such as 2026-02-31 (Date.UTC would silently roll it to March).
  const check = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (check.getUTCMonth() !== parts.month - 1 || check.getUTCDate() !== parts.day) {
    return null;
  }

  return zonedWallTimeToUtc(parts, SCHOOL_TIME_ZONE);
}

/**
 * Normalize an admin-supplied timestamp to a UTC ISO string.
 *
 * - Values that already carry a zone (`Z` or `±HH:MM`) pass through as the same instant.
 * - Zone-less values (what `datetime-local` submits) are interpreted as America/New_York.
 * - `Date` instances are serialized as-is.
 * - Anything unparseable → null.
 */
export function normalizeSchoolTimestamp(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value !== 'string') return null;

  const text = value.trim();
  if (!text) return null;

  // Strictly zone-less shapes only (the pattern is anchored and has no zone suffix).
  const eastern = parseEasternWallTime(text);
  if (eastern) return eastern.toISOString();
  if (NAIVE_DATETIME_PATTERN.test(text)) return null; // naive shape but impossible date/time

  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

const pad2 = (value: number): string => String(value).padStart(2, '0');

/**
 * Format an instant as a `datetime-local` input value (`YYYY-MM-DDTHH:mm`) in Eastern time,
 * the inverse of `normalizeSchoolTimestamp` for zone-less input. Empty string when missing/invalid.
 */
export function toEasternDateTimeInputValue(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const epochMs = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(epochMs)) return '';
  const p = getZonedParts(epochMs, SCHOOL_TIME_ZONE);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** `YYYY-MM-DD` of the instant's calendar day in Eastern time. */
export function toEasternDateString(instant: Date | number = new Date()): string {
  const p = getZonedParts(instant, SCHOOL_TIME_ZONE);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}
