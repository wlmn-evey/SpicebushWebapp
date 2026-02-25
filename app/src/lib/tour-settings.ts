import { db } from '@lib/db';

export const TOUR_CTA_DESTINATION = '/admissions';

const normalizeTourLink = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  return null;
};

const toBoolean = (value: unknown, fallback: boolean): boolean => {
  if (value === undefined || value === null || value === '') return fallback;
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
  const normalized = normalizeTourLink(await db.content.getSetting('tour_external_link'));
  return normalized ?? TOUR_CTA_DESTINATION;
}

export async function getTourSettings(): Promise<{ tourLink: string; tourSchedulingEnabled: boolean }> {
  const [tourExternalLinkSetting, tourSchedulingEnabledSetting] = await Promise.all([
    db.content.getSetting('tour_external_link'),
    db.content.getSetting('tour_scheduling_enabled')
  ]);

  return {
    tourLink: normalizeTourLink(tourExternalLinkSetting) ?? TOUR_CTA_DESTINATION,
    tourSchedulingEnabled: toBoolean(tourSchedulingEnabledSetting, true)
  };
}
