import { describe, expect, it } from 'vitest';

import {
  isoTimestampSql,
  toDateOnlyOrNull,
  toIsoTimestamp,
  toIsoTimestampOrNull
} from '../row-values';

describe('db row-values', () => {
  it('renders TIMESTAMPTZ columns as UTC ISO strings in SQL', () => {
    expect(isoTimestampSql('se.created_at')).toBe(
      `to_char(se.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
    );
  });

  it('normalizes Date and string timestamps', () => {
    expect(toIsoTimestampOrNull(new Date('2026-10-20T12:00:00Z'))).toBe('2026-10-20T12:00:00.000Z');
    expect(toIsoTimestampOrNull(' 2026-10-20T12:00:00.000Z ')).toBe('2026-10-20T12:00:00.000Z');
    expect(toIsoTimestampOrNull(new Date('invalid'))).toBeNull();
    expect(toIsoTimestampOrNull(null)).toBeNull();
    expect(toIsoTimestampOrNull('')).toBeNull();
    expect(toIsoTimestamp(undefined)).toBe('');
  });

  it('reads pg DATE values (local midnight) back as the same calendar day', () => {
    expect(toDateOnlyOrNull(new Date(2026, 2, 8))).toBe('2026-03-08');
    expect(toDateOnlyOrNull(new Date(2026, 10, 1))).toBe('2026-11-01');
    expect(toDateOnlyOrNull('2026-11-01')).toBe('2026-11-01');
    expect(toDateOnlyOrNull(42)).toBeNull();
  });
});
