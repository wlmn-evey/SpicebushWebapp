/**
 * Scheduled-publish worker (Phase-2 lifecycle). Flips every DUE `scheduled` blog post to
 * `published`. Invoked by the every-5-min Netlify scheduled function
 * (`netlify/functions/publish-scheduled-blog-posts.ts`); kept here in `src/lib/**` so the logic is
 * unit-testable with a mocked DB client and auto-coverage-measured.
 *
 * Contract sharing (R4-F1): "due" is decided by `isDueScheduledPublishAt` — the SAME predicate the
 * save-time gate uses for the future check — so a post that saved cleanly is exactly what fires
 * here. There is no second, drifting date parser.
 *
 * Resilience (R3-F2): a row whose `data.publishedAt` is missing or malformed is SKIPPED (counted),
 * never fatal — one bad row must not block the others. Because the decision runs in JS over the
 * fetched candidate set, a garbage value simply fails the format guard; there is no statement-level
 * `::timestamptz` cast that could abort the whole batch.
 *
 * Cache (R1-F16): the worker flips `status` only and does NOT invalidate the SSR collection cache —
 * that cache lives in OTHER function instances, so a cross-process invalidate is impossible from
 * here; visibility lag is the 5-min collection TTL by design (and the cadence is every 5 min so a
 * post never appears visibly overdue, R3-F12).
 */
import { query, queryRows } from '@lib/db/client';
import { isDueScheduledPublishAt, isScheduledPublishAtFormat } from './blog-publish-schedule';

export type ScheduledPublishSummary = {
  /** Count of `status='scheduled'` blog rows examined this run. */
  scannedScheduled: number;
  /** Slugs flipped to `published` this run. */
  published: string[];
  /** Rows whose `publishedAt` is valid but still in the future. */
  notYetDue: number;
  /** Rows whose `publishedAt` is missing/malformed — skipped, not fatal (R3-F2). */
  skippedMalformed: number;
};

/**
 * Publish every due scheduled blog post. `options.now` (ms epoch) is injectable for tests; defaults
 * to the wall clock. Returns a summary for the function's JSON response / logs.
 */
export async function publishDueScheduledPosts(
  options: { now?: number } = {}
): Promise<ScheduledPublishSummary> {
  const now = options.now ?? Date.now();

  const rows = await queryRows<{ slug: string; published_at: string | null }>(
    "SELECT slug, data->>'publishedAt' AS published_at FROM content WHERE type = 'blog' AND status = 'scheduled'",
    []
  );

  const summary: ScheduledPublishSummary = {
    scannedScheduled: rows.length,
    published: [],
    notYetDue: 0,
    skippedMalformed: 0
  };

  const publishedAtIso = new Date(now).toISOString();

  for (const row of rows) {
    const at = row.published_at;
    if (!isScheduledPublishAtFormat(at)) {
      summary.skippedMalformed += 1; // missing/garbage publishedAt — skip, never fatal (R3-F2)
      continue;
    }
    if (!isDueScheduledPublishAt(at, now)) {
      summary.notYetDue += 1;
      continue;
    }
    // Flip status ONLY. The WHERE re-asserts status='scheduled' so a concurrent owner edit that
    // already moved the row (published/archived/back-to-draft) is not double-flipped.
    await query(
      "UPDATE content SET status = 'published', updated_at = $2 WHERE type = 'blog' AND slug = $1 AND status = 'scheduled'",
      [row.slug, publishedAtIso]
    );
    summary.published.push(row.slug);
  }

  return summary;
}
