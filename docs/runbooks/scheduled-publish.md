# Runbook: Scheduled blog publishing

A blog post saved with **status = `scheduled`** and a future `data.publishedAt` goes live
automatically when its time arrives. A Netlify **scheduled function** flips due posts to
`published`; the public site shows them within the normal cache window.

## How it works

- **Function:** `app/netlify/functions/publish-scheduled-blog-posts.ts` — in-file
  `export const config = { schedule: '*/5 * * * *' }` (every 5 minutes, R3-F12), mirroring the
  existing `process-announcement-email-jobs` cron. Not `netlify.toml` (R1-F14).
- **Worker:** `app/src/lib/blog-scheduled-publish.ts` → `publishDueScheduledPosts()`. It selects
  `type='blog' AND status='scheduled'` rows and, for each, flips `status` to `published` **iff**
  `data.publishedAt` is at or before now per `isDueScheduledPublishAt` — the SAME contract the
  save-time gate validated against (`app/src/lib/blog-publish-schedule.ts`, R4-F1). So a post that
  saved cleanly is exactly what fires; there is no second date parser to drift.
- **UTC contract (R1-F27):** `publishedAt` is stored zone-explicit (ISO-8601 with `Z` or `±HH:MM`).
  A bare `datetime-local` (no zone) is rejected at save time, so the cron never guesses a zone.
- **Cadence rationale:** every 5 minutes means the by-design visibility lag never produces a
  *visibly* overdue post (R3-F12). The 30s function cap is ample — the worker touches only the
  handful of scheduled rows.

### Resilience — a bad row never blocks the batch (R3-F2)

The due/not-due decision runs in JS over the fetched candidate set, not as a SQL `::timestamptz`
cast. A row whose `publishedAt` is missing or malformed simply **fails the format guard and is
skipped** (counted in `skippedMalformed`); it cannot statement-abort the run, so every other due
post still publishes. The flip's `WHERE` re-asserts `status='scheduled'`, so a row an owner edited
out of `scheduled` in the same window is never double-flipped.

### Cache (R1-F16)

The cron flips `status` only and does **not** invalidate the SSR collection cache — that cache lives
in other function instances, so a cross-process invalidate is impossible from the cron. Visibility
lag is the 5-minute collection TTL (`DEFAULT_COLLECTION_TTL`) by design.

## Verify after deploy (one-line firing check — R2-F30 / R3-F12)

The function runs unauthenticated on Netlify's scheduler; confirm it is registered and firing:

```bash
# It appears in the deployed function list and the Netlify scheduled-functions logs show a
# ~5-min cadence with a 200 + JSON summary { scannedScheduled, published, notYetDue, skippedMalformed }.
npx netlify functions:list | grep publish-scheduled-blog-posts
```

End-to-end smoke: save a draft as `scheduled` with `publishedAt` ~6 minutes out, wait two cron
ticks, confirm it became `published` and appears at `/blog/<slug>` (allow the 5-min cache TTL).

## Apply the migration

`016_blog_status_check.sql` adds a **type-scoped** CHECK
(`type <> 'blog' OR status IN ('draft','published','scheduled','archived')`) — defense-in-depth so
no path persists an unexpected blog status. It constrains only blog rows; other content types are
untouched. All blog rows are already `published`, so it validates without rewriting data.

```bash
# From app/, against the Neon production pooler (apply-migrations.sh echoes the host — confirm it):
NETLIFY_DATABASE_URL="<neon pooler url>" npm run db:migrate
```

## Recovery & rollback

- **A stuck/overdue scheduled post** — the owner self-service path is the **editor**: open the post,
  set status to `Published` (publish now) or `Draft`, and save. The normal save path is the lever;
  no bespoke recovery UI exists (R3-F12).
- **`archived` recovery (R4-F12)** — `archived` is reversible: the editor status dropdown offers it
  and the dashboard has a per-row Restore / Move-to-Draft action. The operator DB-revert below is a
  **last resort**, not the primary path.
- **Disable the cron** — remove (or rename) the function file and redeploy; deploy-disable is the
  rollback. Scheduled rows simply stay `scheduled` (invisible) until the cron returns or an owner
  publishes them by hand.
- **DB-revert a scheduled row (last resort):**
  ```sql
  UPDATE content SET status = 'draft' WHERE type = 'blog' AND slug = '<slug>' AND status = 'scheduled';
  ```
