import { describe, expect, it } from 'vitest';
import {
  SCHEDULED_PUBLISH_AT_REGEX,
  isDueScheduledPublishAt,
  isFutureScheduledPublishAt,
  isScheduledPublishAtFormat,
  localInputToUtcIso,
  utcIsoToLocalInput
} from './blog-publish-schedule';

// The shared scheduled-publish date contract (R4-F1). The same predicates gate the write-time
// save AND the PR4 cron's fire decision, so these tests lock the ONE contract both depend on.
const NOW = Date.parse('2024-06-01T00:00:00Z');

describe('isScheduledPublishAtFormat', () => {
  it('accepts ISO-8601 instants with an explicit zone (Z or numeric offset)', () => {
    for (const v of [
      '2024-12-31T09:00Z',
      '2024-12-31T09:00:00Z',
      '2024-12-31T09:00:00.500Z',
      '2024-12-31T09:00:00+00:00',
      '2024-12-31T09:00:00-05:00'
    ]) {
      expect(isScheduledPublishAtFormat(v)).toBe(true);
      expect(SCHEDULED_PUBLISH_AT_REGEX.test(v)).toBe(true);
    }
  });

  it('trims surrounding whitespace before matching', () => {
    expect(isScheduledPublishAtFormat('  2024-12-31T09:00:00Z  ')).toBe(true);
  });

  it('rejects zone-less, date-only, malformed, impossible, and non-string values', () => {
    for (const v of [
      '2024-12-31T09:00:00', // no zone — Postgres would read it in session TimeZone
      '2024-12-31T09:00', // datetime-local, no zone
      '2024-12-31', // date only
      '2024-13-31T09:00:00Z', // impossible month (>12) → rejected by the explicit day check + NaN
      '2024-12-32T09:00:00Z', // impossible day (>31)
      '2024-12-31T25:00:00Z', // impossible hour → Date.parse NaN
      '2024-12-31 09:00:00Z', // space, not 'T'
      'not-a-date',
      '',
      undefined,
      null,
      12345
    ]) {
      expect(isScheduledPublishAtFormat(v as unknown)).toBe(false);
    }
  });

  it('rejects calendar-overflow days that Date.parse would silently roll forward', () => {
    // V8 normalizes these to the 1st of the next month; the explicit wall-clock day check rejects
    // them so a nonsensical typed date can never persist + fire a day late.
    for (const v of [
      '2025-02-29T09:00:00Z', // non-leap Feb 29
      '2024-02-30T09:00:00Z', // Feb 30
      '2024-04-31T09:00:00Z', // Apr 31
      '2024-06-31T09:00:00Z', // Jun 31
      '2024-11-31T09:00:00Z', // Nov 31
      '2024-01-00T09:00:00Z' // day 00
    ]) {
      expect(isScheduledPublishAtFormat(v)).toBe(false);
    }
  });

  it('accepts a real leap-day instant (Feb 29 in a leap year)', () => {
    expect(isScheduledPublishAtFormat('2024-02-29T09:00:00Z')).toBe(true);
  });
});

describe('isFutureScheduledPublishAt', () => {
  it('is true strictly after now, false at/before now or when malformed', () => {
    expect(isFutureScheduledPublishAt('2024-12-31T09:00:00Z', NOW)).toBe(true);
    expect(isFutureScheduledPublishAt('2024-01-01T09:00:00Z', NOW)).toBe(false);
    expect(isFutureScheduledPublishAt('2024-06-01T00:00:00Z', NOW)).toBe(false); // exactly now → not future
    expect(isFutureScheduledPublishAt('2024-12-31', NOW)).toBe(false); // malformed
  });
});

describe('isDueScheduledPublishAt (cron fire predicate)', () => {
  it('is true at/before now (due), false in the future or when malformed', () => {
    expect(isDueScheduledPublishAt('2024-01-01T09:00:00Z', NOW)).toBe(true);
    expect(isDueScheduledPublishAt('2024-06-01T00:00:00Z', NOW)).toBe(true); // exactly now → due
    expect(isDueScheduledPublishAt('2024-12-31T09:00:00Z', NOW)).toBe(false); // future → not yet
    // A malformed/garbage row is skipped (false), never fatal — the cron's R3-F2 resilience.
    expect(isDueScheduledPublishAt('garbage', NOW)).toBe(false);
    expect(isDueScheduledPublishAt('2024-12-31T09:00', NOW)).toBe(false);
  });

  it('future and due are mutually exclusive across the same instant', () => {
    const v = '2024-09-01T12:00:00Z';
    expect(isFutureScheduledPublishAt(v, NOW)).toBe(true);
    expect(isDueScheduledPublishAt(v, NOW)).toBe(false);
  });
});

describe('localInputToUtcIso / utcIsoToLocalInput (offset injected — deterministic in CI)', () => {
  it('converts a wall-clock local pick to UTC-Z for fixed offsets', () => {
    // offset is the getTimezoneOffset() convention: minutes UTC is AHEAD of local.
    expect(localInputToUtcIso('2026-06-15T09:00', 240)).toBe('2026-06-15T13:00:00.000Z'); // EDT (UTC-4)
    expect(localInputToUtcIso('2026-06-15T09:00', 0)).toBe('2026-06-15T09:00:00.000Z'); // UTC
    expect(localInputToUtcIso('2026-06-15T09:00', -60)).toBe('2026-06-15T08:00:00.000Z'); // CET (UTC+1)
    expect(localInputToUtcIso('2026-06-15T09:00:30', 240)).toBe('2026-06-15T13:00:30.000Z'); // seconds kept
  });

  it('always emits UTC-Z (never offset-form) so compareBlogPosts sorts it chronologically', () => {
    expect(localInputToUtcIso('2026-01-01T00:00', 240)).toMatch(/Z$/);
  });

  it('renders a stored UTC ISO back to the local wall-clock value', () => {
    expect(utcIsoToLocalInput('2026-06-15T13:00:00.000Z', 240)).toBe('2026-06-15T09:00'); // EDT
    expect(utcIsoToLocalInput('2026-06-15T09:00:00.000Z', 0)).toBe('2026-06-15T09:00'); // UTC
    // Crosses a date boundary going west: 01:00Z at UTC-4 is the previous evening.
    expect(utcIsoToLocalInput('2026-06-15T01:00:00.000Z', 240)).toBe('2026-06-14T21:00');
  });

  it('round-trips local → UTC → local for assorted offsets (property)', () => {
    for (const offset of [-330, -60, 0, 240, 300, 480]) {
      for (const local of ['2026-06-15T09:00', '2026-12-31T23:30', '2026-01-01T00:00']) {
        expect(utcIsoToLocalInput(localInputToUtcIso(local, offset), offset)).toBe(local);
      }
    }
  });

  it('returns empty string for malformed input', () => {
    expect(localInputToUtcIso('not-a-date', 0)).toBe('');
    expect(localInputToUtcIso('2026-06-15', 0)).toBe(''); // date only, no time
    expect(utcIsoToLocalInput('garbage', 0)).toBe('');
  });
});
