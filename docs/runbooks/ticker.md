# Runbook: News ticker

A rotating "News" strip the owner controls from **`/admin/ticker`**. It appears as a site-wide header
bar (below the AnnouncementBar) and a homepage section. It **ships off** — nothing shows publicly until
you add items _and_ turn it on.

## Turn it on / off

1. Go to **`/admin/ticker`** (admin login required).
2. The toggle at the top shows the current state ("Ticker is currently ON/OFF") and a button to flip
   it. Turning it **OFF** (or having zero items) hides the ticker on every public page.
3. Changes take effect within ~5 minutes (the public read TTL).

## Add / edit items

1. Under **Items**, click **+ Add item**, fill in:
   - **Text** (required, ≤200 chars) — the message shown.
   - **Link** (optional) — must start with `https://`, `mailto:`, `tel:`, or `/` (a site path).
     Anything else (e.g. `javascript:`) is shown as **plain text, not a link** — by design.
   - **Expires** (optional) — after this date/time the item stops showing automatically.
   - **Type** — organisation label for your own reference; **not shown to visitors**.
2. Click **Save ticker**.
3. **Only the first 5 items show publicly.** The editor warns when you have more than 5.

## Reorder

Use the **↑ / ↓** buttons on each item (keyboard-operable; a screen reader announces the new
position). Order top-to-bottom is the order shown. Click **Save ticker** to persist.

## Behavior notes

- **Auto-rotation** advances every 6 s; **Pause/Play** and **‹ ›** controls are on the strip. Visitors
  who prefer reduced motion get a static, manually-navigable ticker (no auto-advance).
- **Expiry** is evaluated at render time — an expired item simply stops appearing; you don't have to
  delete it (but you can).
- **Safety:** all link/expiry/≤5 rules are enforced when the page renders (`getActiveTickerItems`), not
  when you save — so a malformed entry can never put an unsafe link on the live site; it degrades to
  plain text or is dropped.

## Where it lives (for maintainers)

- Storage: two `settings` keys — `ticker_items` (JSON array) + `ticker_enabled` (bool). **No table.**
- Lib / trust boundary: `app/src/lib/db/ticker.ts` (`getActiveTickerItems`, `getTickerEnabled`,
  `isSafeTickerHref`).
- Public render: `app/src/components/Ticker.astro` (mounted in `Header.astro` + `index.astro`).
- Admin: `app/src/pages/admin/ticker.astro` → posts to `/api/admin/settings`.
- Spec: `docs/specs/blog.md` → **Ticker** section.
