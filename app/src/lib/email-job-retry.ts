/**
 * Shared claim/retry policy for the scheduled email job tables
 * (`announcement_email_jobs`, `donation_email_jobs`).
 *
 * A job is claimed by flipping it to `processing` and bumping `attempt_count`. Without a reclaim
 * rule, a function crash/timeout between claim and result left the row in `processing` forever,
 * and `failed` was terminal despite `attempt_count`. Policy:
 *
 * - `scheduled` rows are due once `scheduled_for <= NOW()`.
 * - `processing` rows untouched for STALE_JOB_MINUTES are presumed abandoned and are reclaimed.
 * - `failed` rows are retried after the same back-off, while `attempt_count < MAX_JOB_ATTEMPTS`.
 * - Retries/reclaims only apply while the job is still recent (`scheduled_for` within
 *   RETRY_WINDOW_HOURS) so old failures are never resent long after the fact (e.g. on deploy).
 * - Abandoned `processing` rows that are out of attempts or out of the window are swept to
 *   `failed` so they stop looking in-flight in the admin UI.
 *
 * Trade-off: if a send succeeded but recording the result failed, a reclaim can send a duplicate.
 */
export const MAX_JOB_ATTEMPTS = 3;
export const STALE_JOB_MINUTES = 15;
export const RETRY_WINDOW_HOURS = 24;

/**
 * WHERE clause selecting claimable jobs. Expects `$maxAttemptsParam`, `$staleMinutesParam` and
 * `$retryWindowHoursParam` placeholders bound to the constants above.
 */
export const buildClaimableJobsWhereSql = (params: {
  maxAttemptsParam: string;
  staleMinutesParam: string;
  retryWindowHoursParam: string;
}): string => `
        (status = 'scheduled' AND scheduled_for <= NOW())
        OR (
          status IN ('processing', 'failed')
          AND attempt_count < ${params.maxAttemptsParam}::int
          AND updated_at <= NOW() - (${params.staleMinutesParam}::int * INTERVAL '1 minute')
          AND scheduled_for >= NOW() - (${params.retryWindowHoursParam}::int * INTERVAL '1 hour')
        )`;

/** UPDATE that retires abandoned `processing` rows which may no longer be retried. */
export const buildAbandonedJobSweepSql = (
  table: 'announcement_email_jobs' | 'donation_email_jobs'
): string => `
      UPDATE ${table}
      SET
        status = 'failed',
        last_error = COALESCE(last_error, 'Abandoned while processing (timed out or crashed)'),
        updated_at = NOW()
      WHERE status = 'processing'
        AND updated_at <= NOW() - ($2::int * INTERVAL '1 minute')
        AND (
          attempt_count >= $1::int
          OR scheduled_for < NOW() - ($3::int * INTERVAL '1 hour')
        )
    `;

export const jobRetryParams = (): [number, number, number] => [
  MAX_JOB_ATTEMPTS,
  STALE_JOB_MINUTES,
  RETRY_WINDOW_HOURS
];
