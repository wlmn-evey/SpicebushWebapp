import { describe, expect, it } from 'vitest';

import {
  getZonedParts,
  normalizeSchoolTimestamp,
  parseEasternWallTime,
  toEasternDateString,
  toEasternDateTimeInputValue
} from './eastern-time';

describe('parseEasternWallTime / normalizeSchoolTimestamp', () => {
  it('interprets a zone-less datetime-local value as EDT in summer/fall', () => {
    // 8:00 AM EDT (UTC-4) — previously stored as 08:00Z = 4:00 AM EDT.
    expect(normalizeSchoolTimestamp('2026-10-20T08:00')).toBe('2026-10-20T12:00:00.000Z');
    expect(normalizeSchoolTimestamp('2026-07-04T23:30:15')).toBe('2026-07-05T03:30:15.000Z');
  });

  it('interprets a zone-less value as EST in winter', () => {
    expect(normalizeSchoolTimestamp('2026-01-15T08:00')).toBe('2026-01-15T13:00:00.000Z');
    expect(normalizeSchoolTimestamp('2026-12-31T23:59')).toBe('2027-01-01T04:59:00.000Z');
  });

  it('handles the spring-forward day (2026-03-08)', () => {
    expect(normalizeSchoolTimestamp('2026-03-08T01:30')).toBe('2026-03-08T06:30:00.000Z'); // EST
    // 2:30 AM does not exist; shifted forward to 3:30 AM EDT.
    expect(normalizeSchoolTimestamp('2026-03-08T02:30')).toBe('2026-03-08T07:30:00.000Z');
    expect(normalizeSchoolTimestamp('2026-03-08T03:00')).toBe('2026-03-08T07:00:00.000Z'); // EDT
    expect(normalizeSchoolTimestamp('2026-03-08T12:00')).toBe('2026-03-08T16:00:00.000Z');
    expect(normalizeSchoolTimestamp('2026-03-08T00:00')).toBe('2026-03-08T05:00:00.000Z');
  });

  it('handles the fall-back day (2026-11-01)', () => {
    expect(normalizeSchoolTimestamp('2026-11-01T00:30')).toBe('2026-11-01T04:30:00.000Z'); // EDT
    // 1:30 AM happens twice; the earlier (EDT) occurrence wins.
    expect(normalizeSchoolTimestamp('2026-11-01T01:30')).toBe('2026-11-01T05:30:00.000Z');
    expect(normalizeSchoolTimestamp('2026-11-01T02:00')).toBe('2026-11-01T07:00:00.000Z'); // EST
    expect(normalizeSchoolTimestamp('2026-11-01T12:00')).toBe('2026-11-01T17:00:00.000Z');
  });

  it('treats a bare date as Eastern midnight', () => {
    expect(normalizeSchoolTimestamp('2026-10-20')).toBe('2026-10-20T04:00:00.000Z');
  });

  it('passes already-zoned ISO strings through unchanged (same instant)', () => {
    expect(normalizeSchoolTimestamp('2026-10-20T12:00:00.000Z')).toBe('2026-10-20T12:00:00.000Z');
    expect(normalizeSchoolTimestamp('2026-10-20T12:00:00Z')).toBe('2026-10-20T12:00:00.000Z');
    expect(normalizeSchoolTimestamp('2027-01-15T09:00:00-05:00')).toBe('2027-01-15T14:00:00.000Z');
    expect(normalizeSchoolTimestamp('2026-10-20T08:00:00+02:00')).toBe('2026-10-20T06:00:00.000Z');
  });

  it('serializes Date instances and rejects junk', () => {
    expect(normalizeSchoolTimestamp(new Date('2026-10-20T12:00:00Z'))).toBe(
      '2026-10-20T12:00:00.000Z'
    );
    expect(normalizeSchoolTimestamp(new Date('nope'))).toBeNull();
    expect(normalizeSchoolTimestamp('')).toBeNull();
    expect(normalizeSchoolTimestamp('   ')).toBeNull();
    expect(normalizeSchoolTimestamp('not a date')).toBeNull();
    expect(normalizeSchoolTimestamp(null)).toBeNull();
    expect(normalizeSchoolTimestamp(42)).toBeNull();
    expect(normalizeSchoolTimestamp('2026-02-31T08:00')).toBeNull();
    expect(normalizeSchoolTimestamp('2026-10-20T25:00')).toBeNull();
    expect(parseEasternWallTime('2026-10-20T08:00Z')).toBeNull();
  });
});

describe('toEasternDateTimeInputValue', () => {
  it('renders UTC instants as Eastern wall-clock datetime-local values', () => {
    expect(toEasternDateTimeInputValue('2026-10-20T12:00:00.000Z')).toBe('2026-10-20T08:00');
    expect(toEasternDateTimeInputValue('2026-01-15T13:00:00.000Z')).toBe('2026-01-15T08:00');
    expect(toEasternDateTimeInputValue(new Date('2026-07-05T03:30:00Z'))).toBe('2026-07-04T23:30');
    // Midnight renders as 00, not 24.
    expect(toEasternDateTimeInputValue('2026-10-20T04:00:00.000Z')).toBe('2026-10-20T00:00');
  });

  it('round-trips with normalizeSchoolTimestamp across both DST transitions', () => {
    for (const wall of [
      '2026-03-08T01:30',
      '2026-03-08T03:30',
      '2026-11-01T00:30',
      '2026-11-01T01:30',
      '2026-11-01T02:30',
      '2026-06-15T15:45',
      '2026-12-15T07:05'
    ]) {
      expect(toEasternDateTimeInputValue(normalizeSchoolTimestamp(wall))).toBe(wall);
    }
  });

  it('returns empty string for missing or invalid values', () => {
    expect(toEasternDateTimeInputValue(null)).toBe('');
    expect(toEasternDateTimeInputValue(undefined)).toBe('');
    expect(toEasternDateTimeInputValue('')).toBe('');
    expect(toEasternDateTimeInputValue('garbage')).toBe('');
  });
});

describe('getZonedParts / toEasternDateString', () => {
  it('reports the Eastern calendar day, not the UTC one', () => {
    // 2026-07-01T00:30Z is still June 30 at 8:30 PM EDT.
    expect(toEasternDateString(new Date('2026-07-01T00:30:00Z'))).toBe('2026-06-30');
    expect(toEasternDateString(new Date('2026-07-01T04:00:00Z'))).toBe('2026-07-01');
    expect(getZonedParts(new Date('2026-11-01T06:30:00Z'))).toEqual({
      year: 2026,
      month: 11,
      day: 1,
      hour: 1,
      minute: 30,
      second: 0
    });
  });
});
