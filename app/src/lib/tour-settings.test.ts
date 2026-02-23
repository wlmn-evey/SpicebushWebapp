import { describe, expect, it } from 'vitest';
import { TOUR_CTA_DESTINATION, getTourLink, getTourSettings } from './tour-settings';

describe('tour-settings', () => {
  it('returns a stable CTA destination', async () => {
    expect(TOUR_CTA_DESTINATION).toBe('/admissions');
    await expect(getTourLink()).resolves.toBe('/admissions');
  });

  it('returns enabled tour scheduling settings payload', async () => {
    await expect(getTourSettings()).resolves.toEqual({
      tourLink: '/admissions',
      tourSchedulingEnabled: true
    });
  });
});
