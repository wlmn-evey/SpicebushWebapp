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
 * True when `value` is a string matching the shared format AND a real, parseable instant.
 * Rejects malformed shapes and impossible dates (`Date.parse` → `NaN`).
 */
export function isScheduledPublishAtFormat(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!SCHEDULED_PUBLISH_AT_REGEX.test(trimmed)) return false;
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
