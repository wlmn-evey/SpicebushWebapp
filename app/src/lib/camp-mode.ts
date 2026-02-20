export type CampModeOverride = 'auto' | 'on' | 'off' | 'prep';

export interface CampModeSettings {
  override: CampModeOverride;
  startAt: string;
  endAt: string;
  timezone: string;
  promotionsEnabled: boolean;
}

export interface CampModeEvaluation {
  activeForAdmin: boolean;
  prepMode: boolean;
  active: boolean;
  reason:
    | 'forced_on'
    | 'forced_off'
    | 'forced_prep'
    | 'within_window'
    | 'before_window'
    | 'after_window'
    | 'window_missing';
  nowIso: string;
  settings: CampModeSettings;
}

const VALID_OVERRIDES = new Set<CampModeOverride>(['auto', 'on', 'off', 'prep']);

const parseBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  }
  return fallback;
};

const toString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

const parseOverride = (value: unknown): CampModeOverride => {
  const raw = toString(value).toLowerCase();
  if (VALID_OVERRIDES.has(raw as CampModeOverride)) {
    return raw as CampModeOverride;
  }
  return 'off';
};

const parseTimestampMs = (value: string): number | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseCampModeSettings = (settings: Record<string, unknown>): CampModeSettings => {
  const timezone = toString(settings.camp_mode_timezone) || 'America/New_York';
  return {
    override: parseOverride(settings.camp_mode_override),
    startAt: toString(settings.camp_mode_start_at),
    endAt: toString(settings.camp_mode_end_at),
    timezone,
    promotionsEnabled: parseBoolean(settings.camp_promotions_enabled, false)
  };
};

export const evaluateCampMode = (
  modeSettings: CampModeSettings,
  now = new Date()
): CampModeEvaluation => {
  const nowMs = now.getTime();

  if (modeSettings.override === 'on') {
    return {
      activeForAdmin: true,
      prepMode: false,
      active: true,
      reason: 'forced_on',
      nowIso: now.toISOString(),
      settings: modeSettings
    };
  }

  if (modeSettings.override === 'off') {
    return {
      activeForAdmin: false,
      prepMode: false,
      active: false,
      reason: 'forced_off',
      nowIso: now.toISOString(),
      settings: modeSettings
    };
  }

  if (modeSettings.override === 'prep') {
    return {
      activeForAdmin: true,
      prepMode: true,
      active: false,
      reason: 'forced_prep',
      nowIso: now.toISOString(),
      settings: modeSettings
    };
  }

  const startMs = parseTimestampMs(modeSettings.startAt);
  const endMs = parseTimestampMs(modeSettings.endAt);

  if (startMs === null && endMs === null) {
    return {
      activeForAdmin: false,
      prepMode: false,
      active: false,
      reason: 'window_missing',
      nowIso: now.toISOString(),
      settings: modeSettings
    };
  }

  if (startMs !== null && nowMs < startMs) {
    return {
      activeForAdmin: false,
      prepMode: false,
      active: false,
      reason: 'before_window',
      nowIso: now.toISOString(),
      settings: modeSettings
    };
  }

  if (endMs !== null && nowMs > endMs) {
    return {
      activeForAdmin: false,
      prepMode: false,
      active: false,
      reason: 'after_window',
      nowIso: now.toISOString(),
      settings: modeSettings
    };
  }

  return {
    activeForAdmin: true,
    prepMode: false,
    active: true,
    reason: 'within_window',
    nowIso: now.toISOString(),
    settings: modeSettings
  };
};
