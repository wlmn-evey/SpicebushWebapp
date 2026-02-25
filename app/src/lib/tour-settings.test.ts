import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSettingMock } = vi.hoisted(() => ({
  getSettingMock: vi.fn()
}));

vi.mock('@lib/db', () => ({
  db: {
    content: {
      getSetting: getSettingMock
    }
  }
}));

import { TOUR_CTA_DESTINATION, getTourLink, getTourSettings } from './tour-settings';

describe('tour-settings', () => {
  beforeEach(() => {
    getSettingMock.mockReset();
  });

  it('falls back to admissions when no tour link is configured', async () => {
    getSettingMock.mockResolvedValue(null);

    expect(TOUR_CTA_DESTINATION).toBe('/admissions');
    await expect(getTourLink()).resolves.toBe('/admissions');
  });

  it('returns the configured external tour link when valid', async () => {
    getSettingMock.mockResolvedValue('https://calendly.com/spicebushmontessori/tour');

    await expect(getTourLink()).resolves.toBe('https://calendly.com/spicebushmontessori/tour');
  });

  it('returns tour settings payload from DB settings', async () => {
    getSettingMock.mockImplementation(async (key: string) => {
      if (key === 'tour_external_link') {
        return 'https://calendly.com/spicebushmontessori/tour';
      }

      if (key === 'tour_scheduling_enabled') {
        return 'false';
      }

      return null;
    });

    await expect(getTourSettings()).resolves.toEqual({
      tourLink: 'https://calendly.com/spicebushmontessori/tour',
      tourSchedulingEnabled: false
    });
  });
});
