/**
 * Row-value normalizers for `pg` results.
 *
 * The pool registers no custom type parsers, so `pg` hands back DATE / TIMESTAMP / TIMESTAMPTZ
 * columns as JS `Date` objects even though our row interfaces type them as strings. Code that
 * does `typeof value === 'string'` then silently drops them (blank admin date fields, NULLed
 * `starts_at`/`ends_at` on re-save). Prefer casting in SQL (`col::text` for DATE,
 * `isoTimestampSql(col)` for TIMESTAMPTZ); these helpers are the defensive JS-side net.
 */

/**
 * SQL expression rendering a TIMESTAMPTZ as a UTC ISO-8601 string identical to
 * `Date#toISOString()` (e.g. `2026-10-20T12:00:00.000Z`). NULL stays NULL.
 * Only pass trusted column expressions — never user input.
 */
export const isoTimestampSql = (columnExpression: string): string =>
  `to_char(${columnExpression} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

/** TIMESTAMPTZ-ish value → ISO string (Date → toISOString; strings trimmed); else null. */
export function toIsoTimestampOrNull(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

/** Like `toIsoTimestampOrNull` but returns '' instead of null (for non-nullable string fields). */
export const toIsoTimestamp = (value: unknown): string => toIsoTimestampOrNull(value) ?? '';

const pad2 = (value: number): string => String(value).padStart(2, '0');

/**
 * DATE-ish value → `YYYY-MM-DD`. `pg` builds DATE values as LOCAL midnight, so a `Date` is read
 * back with local getters (not UTC ones, which would shift the day west of UTC).
 */
export function toDateOnlyOrNull(value: unknown): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}
