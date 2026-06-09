import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSettingMock } = vi.hoisted(() => ({ getSettingMock: vi.fn() }));

vi.mock('../content', () => ({
  getSetting: getSettingMock
}));

import { STRICT_CONFIG_V2 } from '../../blog-html';
import {
  LINK_HREF_REGEX,
  getActiveTickerItems,
  getTickerEnabled,
  isSafeTickerHref,
  type TickerItem
} from '../ticker';

// Convenience: stub the two settings keys the ticker reads.
const stubSettings = (enabled: unknown, items: unknown) => {
  getSettingMock.mockImplementation(async (key: string) => {
    if (key === 'ticker_enabled') return enabled;
    if (key === 'ticker_items') return items;
    return null;
  });
};

const NOW = Date.parse('2026-06-09T12:00:00Z');

beforeEach(() => {
  getSettingMock.mockReset();
});

describe('isSafeTickerHref (R3-F4)', () => {
  it('ACCEPTS https / mailto / tel / site-relative (the positive survival cases)', () => {
    expect(isSafeTickerHref('https://spicebushmontessori.org')).toBe(true);
    expect(isSafeTickerHref('mailto:hi@spicebushmontessori.org')).toBe(true);
    expect(isSafeTickerHref('tel:+14842020712')).toBe(true);
    expect(isSafeTickerHref('/blog')).toBe(true);
  });

  it('REJECTS javascript: / data: / protocol-relative // and empty', () => {
    // eslint-disable-next-line no-script-url -- intentional XSS test vector
    expect(isSafeTickerHref('javascript:alert(1)')).toBe(false);
    expect(isSafeTickerHref('data:text/html,<script>')).toBe(false);
    expect(isSafeTickerHref('//evil.com')).toBe(false);
    expect(isSafeTickerHref('http://insecure')).toBe(false); // http (not https) rejected
    expect(isSafeTickerHref(undefined)).toBe(false);
    expect(isSafeTickerHref('')).toBe(false);
  });

  it('REJECTS the tab/LF/CR open-redirect bypass (browsers strip them → //host)', () => {
    // `'/\t/evil.com'` reconstitutes to `'//evil.com'` in a browser → cross-origin. The validator
    // strips tab/LF/CR before the scheme check, so these must be rejected (R3-F4 open-redirect).
    expect(isSafeTickerHref('/\t/evil.com')).toBe(false);
    expect(isSafeTickerHref('/\n/evil.com')).toBe(false);
    expect(isSafeTickerHref('/\r/evil.com')).toBe(false);
    expect(isSafeTickerHref('/\t\t/evil.com')).toBe(false);
  });

  it('ACCEPTS a whitespace-padded safe href and a mixed-case scheme (the /i flag + trim)', () => {
    expect(isSafeTickerHref('  https://spicebushmontessori.org  ')).toBe(true);
    expect(isSafeTickerHref('HTTPS://spicebushmontessori.org')).toBe(true);
    expect(isSafeTickerHref('MailTo:hi@spicebushmontessori.org')).toBe(true);
    expect(isSafeTickerHref('TEL:+14842020712')).toBe(true);
  });

  it('PARITY: the href allowlist is byte-identical to blog-html ALLOWED_URI_REGEXP (R3-F1, no drift)', () => {
    expect(LINK_HREF_REGEX.source).toBe(STRICT_CONFIG_V2.ALLOWED_URI_REGEXP.source);
    expect(LINK_HREF_REGEX.flags).toBe(STRICT_CONFIG_V2.ALLOWED_URI_REGEXP.flags);
  });
});

describe('getTickerEnabled', () => {
  it('coerces truthy settings forms to true, everything else to false', async () => {
    for (const truthy of [true, 'true', 1, '1']) {
      stubSettings(truthy, []);
      expect(await getTickerEnabled()).toBe(true);
    }
    for (const falsy of [false, 'false', 0, null, undefined, 'yes']) {
      stubSettings(falsy, []);
      expect(await getTickerEnabled()).toBe(false);
    }
  });
});

describe('getActiveTickerItems', () => {
  it('returns [] when the ticker is DISABLED even if items exist', async () => {
    stubSettings(false, [{ text: 'Hi' }]);
    expect(await getActiveTickerItems(NOW)).toEqual([]);
  });

  it('returns [] for empty / missing / non-array items', async () => {
    stubSettings(true, []);
    expect(await getActiveTickerItems(NOW)).toEqual([]);
    stubSettings(true, null);
    expect(await getActiveTickerItems(NOW)).toEqual([]);
    stubSettings(true, 'not-an-array');
    expect(await getActiveTickerItems(NOW)).toEqual([]);
  });

  it('skips null / primitive / array entries without throwing (the entry-type guard)', async () => {
    // A value-blind endpoint could store a non-object entry; the public render path must not crash.
    stubSettings(true, [null, 'a string', 42, ['nested'], { text: 'ok' }]);
    const items = await getActiveTickerItems(NOW);
    expect(items.map(i => i.text)).toEqual(['ok']);
  });

  it('strips a tab/LF/CR open-redirect href but keeps the item as inert text', async () => {
    stubSettings(true, [{ text: 'Sneaky', href: '/\t/evil.com' }]);
    const [item] = await getActiveTickerItems(NOW);
    expect(item.text).toBe('Sneaky');
    expect(item.href).toBeUndefined();
  });

  it('stores the NORMALIZED (tab/whitespace-stripped) href for a safe link', async () => {
    stubSettings(true, [{ text: 'Padded', href: '  https://spicebushmontessori.org  ' }]);
    const [item] = await getActiveTickerItems(NOW);
    expect(item.href).toBe('https://spicebushmontessori.org');
  });

  it('R3-F4 NEGATIVE: strips an unsafe href but KEEPS the item as inert text', async () => {
    stubSettings(true, [
      // eslint-disable-next-line no-script-url -- intentional XSS test vector
      { text: 'Bad link', href: 'javascript:alert(1)' },
      { text: 'Data link', href: 'data:text/html,x' },
      { text: 'Proto-rel', href: '//evil.com' }
    ]);
    const items = await getActiveTickerItems(NOW);
    expect(items.map(i => i.text)).toEqual(['Bad link', 'Data link', 'Proto-rel']);
    expect(items.every(i => i.href === undefined)).toBe(true);
  });

  it('R3-F4 POSITIVE: keeps safe https/mailto/tel/site-relative hrefs intact', async () => {
    stubSettings(true, [
      { text: 'Site', href: 'https://spicebushmontessori.org' },
      { text: 'Mail', href: 'mailto:hi@spicebushmontessori.org' },
      { text: 'Call', href: 'tel:+14842020712' },
      { text: 'Blog', href: '/blog' }
    ]);
    const items = await getActiveTickerItems(NOW);
    expect(items.map(i => i.href)).toEqual([
      'https://spicebushmontessori.org',
      'mailto:hi@spicebushmontessori.org',
      'tel:+14842020712',
      '/blog'
    ]);
  });

  it('R1-F2 SECURITY: a javascript: href stored by the value-blind endpoint is neutralized at render', async () => {
    // Simulate the settings-write bypass (D2: the endpoint does NO value validation) — the render
    // path is the trust boundary, so the live link must never reach the page.
    // eslint-disable-next-line no-script-url -- intentional XSS test vector
    stubSettings(true, [{ text: 'Click me', href: 'JavaScript:stealCookies()' }]);
    const [item] = await getActiveTickerItems(NOW);
    expect(item.text).toBe('Click me');
    expect(item.href).toBeUndefined();
  });

  it('EXPIRY: drops a past expiry, keeps a future or unparseable one (injected now)', async () => {
    stubSettings(true, [
      { text: 'Expired', expiresAt: '2026-06-08T12:00:00Z' }, // yesterday → dropped
      { text: 'Future', expiresAt: '2026-06-10T12:00:00Z' }, // tomorrow → kept
      { text: 'NoExpiry' }, // kept
      { text: 'Garbage expiry', expiresAt: 'not-a-date' } // unparseable → kept
    ]);
    const items = await getActiveTickerItems(NOW);
    expect(items.map(i => i.text)).toEqual(['Future', 'NoExpiry', 'Garbage expiry']);
  });

  it('≤5 ENFORCEMENT: a 7-item array yields exactly 5', async () => {
    stubSettings(
      true,
      Array.from({ length: 7 }, (_, i) => ({ text: `Item ${i}` }))
    );
    const items = await getActiveTickerItems(NOW);
    expect(items).toHaveLength(5);
    expect(items.map(i => i.text)).toEqual(['Item 0', 'Item 1', 'Item 2', 'Item 3', 'Item 4']);
  });

  it('≤5 counts KEPT items, not raw indices — leading filtered entries do not eat the budget', async () => {
    // 2 expired up front + 6 valid → the cap must yield the first 5 VALID (v1..v5), proving it counts
    // post-filter survivors, not raw array positions.
    stubSettings(true, [
      { text: 'gone1', expiresAt: '2026-06-01T00:00:00Z' },
      { text: 'gone2', expiresAt: '2026-06-02T00:00:00Z' },
      ...Array.from({ length: 6 }, (_, i) => ({ text: `v${i + 1}` }))
    ]);
    const items = await getActiveTickerItems(NOW);
    expect(items.map(i => i.text)).toEqual(['v1', 'v2', 'v3', 'v4', 'v5']);
  });

  it('drops empty-text items and caps text length to 200', async () => {
    stubSettings(true, [{ text: '   ' }, { text: 'x'.repeat(250) }, { notText: 1 }]);
    const items = await getActiveTickerItems(NOW);
    expect(items).toHaveLength(1);
    expect(items[0].text).toHaveLength(200);
  });

  it('passes through every valid `type` allowlist member, drops an invalid type', async () => {
    stubSettings(true, [
      { text: 'A', type: 'info' },
      { text: 'B', type: 'event' },
      { text: 'C', type: 'closure' },
      { text: 'D', type: 'bogus' }
    ]);
    const items = await getActiveTickerItems(NOW);
    expect(items.map(i => i.type)).toEqual(['info', 'event', 'closure', undefined]);
  });

  it('R4-F11 TTL: reads BOTH keys with the dedicated 5-minute maxAge, never the 30-min default', async () => {
    stubSettings(true, [{ text: 'Hi' }]);
    await getActiveTickerItems(NOW);
    const FIVE_MIN = 5 * 60 * 1000;
    expect(getSettingMock).toHaveBeenCalledWith('ticker_enabled', FIVE_MIN);
    expect(getSettingMock).toHaveBeenCalledWith('ticker_items', FIVE_MIN);
  });
});

// Type-only smoke: TickerItem shape is exported and usable.
const _example: TickerItem = { text: 'ok' };
void _example;
