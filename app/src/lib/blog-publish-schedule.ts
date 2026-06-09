/**
 * Shared scheduled-publish date contract (R4-F1).
 *
 * The write-time validator (`validateBlogData` in `blog-content.ts`) and the scheduled-publish
 * cron (Phase-2 PR4) BOTH import from here, so a `scheduled` post that saves cleanly is exactly
 * the set the cron will fire — one regex, one parse rule, no drift. A hand-rolled second regex in
 * the cron is the failure this module exists to prevent: a post that saves but can never fire.
 *
 * Dependency-free on purpose — the cron must not pull in the render stack (`marked` / DOMPurify /
 * TipTap) just to validate a timestamp.
 *
 * Format: ISO-8601 date-time with an EXPLICIT zone — a UTC designator (`Z`) or a numeric offset
 * (`±HH:MM`). Seconds and milliseconds are optional. A bare `datetime-local` value (no zone) is
 * REJECTED: Postgres `::timestamptz` would interpret it in the server's session TimeZone, so the
 * authoring form (PR2) must attach a zone before saving (UTC contract, R1-F27). The cron guards
 * its `::timestamptz` cast with this SAME contract so one malformed `publishedAt` row is skipped,
 * not statement-aborting every due post (R3-F2); the most robust way for PR4 to honor that is to
 * select candidate `scheduled` rows and filter them in JS with {@link isDueScheduledPublishAt}
 * rather than re-encode this pattern as a (subtly different) POSIX regex in SQL.
 */
export const SCHEDULED_PUBLISH_AT_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * True when `value` is a string matching the shared format AND a real, valid instant. Rejects
 * malformed shapes, calendar-overflow days (Feb 30, non-leap Feb 29 — validated explicitly, since
 * `Date.parse` silently rolls those forward instead of returning `NaN`), and out-of-range time /
 * offset fields (hour 25, minute 60, `+99:99` — caught by the `Date.parse` → `NaN` check).
 */
export function isScheduledPublishAtFormat(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!SCHEDULED_PUBLISH_AT_REGEX.test(trimmed)) return false;
  // Reject calendar-overflow days (non-leap Feb 29, Feb 30, Apr/Jun/Sep/Nov 31, …). `Date.parse`
  // does NOT catch these — V8 silently rolls them into the next month — so validate the wall-clock
  // date directly from the matched Y-M-D (invalid regardless of zone offset). The anchored regex
  // guarantees the first 10 chars are `YYYY-MM-DD`.
  const [year, month, day] = trimmed.slice(0, 10).split('-').map(Number);
  const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) return false;
  // Date.parse still earns its place for the out-of-range time/offset fields the day check above
  // does not cover (hour 25, minute 60, second 61, +99:99).
  return !Number.isNaN(Date.parse(trimmed));
}

/**
 * True when `value` is a well-formed scheduled instant strictly AFTER `now` (ms epoch) — the
 * save-time gate: a scheduled post must be set to go live later, never in the past.
 */
export function isFutureScheduledPublishAt(value: unknown, now: number): boolean {
  if (!isScheduledPublishAtFormat(value)) return false;
  return Date.parse(value.trim()) > now;
}

/**
 * True when `value` is a well-formed scheduled instant AT or BEFORE `now` (ms epoch) — i.e. DUE
 * to publish. The scheduled-publish cron (PR4) uses THIS to decide which rows to flip, so the
 * cron and the save-time gate share one format guard and a malformed `publishedAt` is skipped
 * (returns `false`), never fatal.
 */
export function isDueScheduledPublishAt(value: unknown, now: number): boolean {
  if (!isScheduledPublishAtFormat(value)) return false;
  return Date.parse(value.trim()) <= now;
}
