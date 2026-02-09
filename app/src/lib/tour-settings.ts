import { db } from '@lib/db';
import { logServerError } from '@lib/server-logger';

export const DEFAULT_TOUR_EXTERNAL_LINK = 'https://calendly.com/spicebushmontessori/tour-of-spicebush-montessori-school?month=2026-02';

const normalizeTourLink = (value: unknown): string => {
  if (typeof value !== 'string') {
    return DEFAULT_TOUR_EXTERNAL_LINK;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_TOUR_EXTERNAL_LINK;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  return DEFAULT_TOUR_EXTERNAL_LINK;
};

const normalizeBoolean = (value: unknown, fallback = true): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
};

export async function getTourLink(): Promise<string> {
  try {
    const rawValue = await db.content.getSetting('tour_external_link');
    return normalizeTourLink(rawValue);
  } catch (error) {
    logServerError('Failed to load tour link setting', error, { module: 'tour-settings' });
    return DEFAULT_TOUR_EXTERNAL_LINK;
  }
}

export async function getTourSettings(): Promise<{ tourLink: string; tourSchedulingEnabled: boolean }> {
  try {
    const [rawLink, rawEnabled] = await Promise.all([
      db.content.getSetting('tour_external_link'),
      db.content.getSetting('tour_scheduling_enabled')
    ]);

    return {
      tourLink: normalizeTourLink(rawLink),
      tourSchedulingEnabled: normalizeBoolean(rawEnabled, true)
    };
  } catch (error) {
    logServerError('Failed to load tour settings', error, { module: 'tour-settings' });
    return {
      tourLink: DEFAULT_TOUR_EXTERNAL_LINK,
      tourSchedulingEnabled: true
    };
  }
}

