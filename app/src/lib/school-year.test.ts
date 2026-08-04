import { describe, expect, it } from 'vitest';

import { getCurrentSchoolYear } from './school-year';

describe('getCurrentSchoolYear', () => {
  it('rolls over on July 1', () => {
    expect(getCurrentSchoolYear(new Date(2026, 5, 30))).toBe('2025-2026'); // Jun 30
    expect(getCurrentSchoolYear(new Date(2026, 6, 1))).toBe('2026-2027'); // Jul 1
  });

  it('keeps the started year through the following spring', () => {
    expect(getCurrentSchoolYear(new Date(2026, 8, 15))).toBe('2026-2027'); // Sep
    expect(getCurrentSchoolYear(new Date(2027, 0, 10))).toBe('2026-2027'); // Jan
    expect(getCurrentSchoolYear(new Date(2027, 4, 31))).toBe('2026-2027'); // May
  });
});
