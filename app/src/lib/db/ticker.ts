/**
 * Public ticker read path (Phase 6). The ticker is stored as TWO `settings` JSONB keys — no dedicated
 * table (D1): `ticker_items` (a `TickerItem[]`) and `ticker_enabled` (a bool, default false).
 *
 * SECURITY MODEL (D2/R1-F2/R3-F4): the generic `/api/admin/settings` endpoint validates the KEY only,
 * never the VALUE — so EVERY value-level safety property (href scheme, expiry, ≤5 cap, text-length
 * cap) is enforced HERE, at render time, self-sufficiently. The endpoint is NOT a trust boundary for
 * ticker content; this module is. A `javascript:`/`data:` href that the endpoint happily stored is
 * neutralized here (the href is stripped, the text still renders as inert copy).
 *
 * TTL (D3/R4-F11): reads use a dedicated 5-minute `getSetting` TTL — NEVER `getAllSettings()` (whose
 * `setting:all` blob caches at 30 min) — so the ticker is no staler than the 5-min AnnouncementBar.
 */
import { getSetting } from './content';

export interface TickerItem {
  /** Required display text. Render-time length-capped. */
  text: string;
  /** Optional link; render-time scheme-validated (R3-F4) — an unsafe scheme is stripped, not kept. */
  href?: string;
  /** Optional ISO-8601 expiry; render-time filtered once `Date.parse(expiresAt) <= now`. */
  expiresAt?: string;
  /** Admin-only organisation metadata — NOT surfaced to public visitors (D5). */
  type?: 'info' | 'event' | 'closure';
}

const TICKER_ITEMS_KEY = 'ticker_items';
const TICKER_ENABLED_KEY = 'ticker_enabled';
// Dedicated 5-min TTL (R4-F11) — not the 30-min default SETTINGS_TTL.
const TICKER_TTL = 5 * 60 * 1000;
const MAX_TICKER_ITEMS = 5;
const MAX_TICKER_TEXT = 200;

/**
 * Render-time link-href scheme allowlist (R3-F4): `https:`, `mailto:`, `tel:`, and single-slash
 * site-relative paths; BLOCKS `javascript:`, `data:`, and protocol-relative `//host`.
 *
 * DUPLICATED on purpose from `blog-html.ts` `STRICT_CONFIG_V2.ALLOWED_URI_REGEXP` (the live blog-body
 * sanitizer, R3-F1 "tightening forbidden") — sharing it would widen that sanitizer's blast radius into
 * shipped posts. Parity with the source is asserted in the test so the two cannot silently drift.
 * (Note: this is intentionally NOT `IMAGE_SCHEME_REGEX`, which is https+site-relative ONLY and would
 * wrongly drop the `mailto:`/`tel:` links the ticker must support.)
 */
export const LINK_HREF_REGEX = /^(?:https:|mailto:|tel:|\/(?![/\\]))/i;

export function isSafeTickerHref(href: string | undefined): boolean {
  return typeof href === 'string' && LINK_HREF_REGEX.test(href.trim());
}

/** Whether the ticker is switched on. Missing/garbage key coerces to `false` (ships off — D-safety). */
export async function getTickerEnabled(): Promise<boolean> {
  const raw = await getSetting(TICKER_ENABLED_KEY, TICKER_TTL);
  return raw === true || raw === 'true' || raw === 1 || raw === '1';
}

/**
 * The active, render-safe ticker items. Returns `[]` when the ticker is disabled or empty. Each item
 * is text-capped; an expired item is dropped; an unsafe href is stripped (the item still renders as
 * inert text); the result is capped to 5 valid items. `now` is injected for deterministic tests.
 */
export async function getActiveTickerItems(now: number = Date.now()): Promise<TickerItem[]> {
  if (!(await getTickerEnabled())) return [];

  const raw = await getSetting(TICKER_ITEMS_KEY, TICKER_TTL);
  if (!Array.isArray(raw)) return [];

  const items: TickerItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const candidate = entry as Record<string, unknown>;

    const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
    if (!text) continue;

    // Expiry filter — drop only when a parseable expiry is in the past (unparseable → kept).
    const expiresAt = typeof candidate.expiresAt === 'string' ? candidate.expiresAt.trim() : '';
    if (expiresAt) {
      const expiryMs = Date.parse(expiresAt);
      if (Number.isFinite(expiryMs) && expiryMs <= now) continue;
    }

    // Strip an unsafe href (keep the item as inert text) — render-time trust boundary (R3-F4).
    const rawHref = typeof candidate.href === 'string' ? candidate.href.trim() : '';
    const href = rawHref && isSafeTickerHref(rawHref) ? rawHref : undefined;

    const rawType = candidate.type;
    const type =
      rawType === 'info' || rawType === 'event' || rawType === 'closure' ? rawType : undefined;

    const item: TickerItem = { text: text.slice(0, MAX_TICKER_TEXT) };
    if (href) item.href = href;
    if (expiresAt) item.expiresAt = expiresAt;
    if (type) item.type = type;
    items.push(item);

    if (items.length >= MAX_TICKER_ITEMS) break; // ≤5 enforcement
  }

  return items;
}
