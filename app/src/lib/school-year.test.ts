import { describe, expect, it } from 'vitest';

import { getCurrentSchoolYear } from './school-year';

describe('getCurrentSchoolYear', () => {
  it('rolls over on July 1', () => {
    expect(getCurrentSchoolYear(new Date('2026-06-30T16:00:00Z'))).toBe('2025-2026'); // Jun 30
    expect(getCurrentSchoolYear(new Date('2026-07-01T16:00:00Z'))).toBe('2026-2027'); // Jul 1
  });

  it('rolls over at midnight Eastern, not midnight UTC', () => {
    // 2026-07-01T00:30Z is 8:30 PM EDT on June 30 — still the old school year.
    expect(getCurrentSchoolYear(new Date('2026-07-01T00:30:00Z'))).toBe('2025-2026');
    expect(getCurrentSchoolYear(new Date('2026-07-01T03:59:00Z'))).toBe('2025-2026');
    // 12:00 AM EDT on July 1.
    expect(getCurrentSchoolYear(new Date('2026-07-01T04:00:00Z'))).toBe('2026-2027');
  });

  it('keeps the started year through the following spring', () => {
    expect(getCurrentSchoolYear(new Date('2026-09-15T16:00:00Z'))).toBe('2026-2027'); // Sep
    expect(getCurrentSchoolYear(new Date('2027-01-10T16:00:00Z'))).toBe('2026-2027'); // Jan
    expect(getCurrentSchoolYear(new Date('2027-05-31T16:00:00Z'))).toBe('2026-2027'); // May
    // New Year's Eve evening in Eastern is already Jan 1 in UTC — year math must not flip.
    expect(getCurrentSchoolYear(new Date('2027-01-01T03:00:00Z'))).toBe('2026-2027');
  });
});
