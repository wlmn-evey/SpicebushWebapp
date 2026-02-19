import { db } from '@lib/db';

export interface AnalyticsConfig {
  enabled: boolean;
  measurementId: string;
  propertyId: string;
}

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }
  return false;
};

const toStringValue = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const readEnv = (key: string): string => {
  const runtimeEnv = typeof process !== 'undefined' ? process.env : undefined;
  const fromRuntime = runtimeEnv?.[key];
  if (typeof fromRuntime === 'string' && fromRuntime.trim()) return fromRuntime.trim();

  const importEnv = import.meta.env as Record<string, string | undefined>;
  const fromImportMeta = importEnv[key];
  if (typeof fromImportMeta === 'string' && fromImportMeta.trim()) return fromImportMeta.trim();

  return '';
};

export async function getAnalyticsConfig(): Promise<AnalyticsConfig> {
  const [settingEnabled, settingMeasurementId, settingPropertyId] = await Promise.all([
    db.content.getSetting('ga4_enabled'),
    db.content.getSetting('ga4_measurement_id'),
    db.content.getSetting('ga4_property_id')
  ]);

  const measurementId = toStringValue(settingMeasurementId)
    || readEnv('PUBLIC_GA4_MEASUREMENT_ID')
    || readEnv('GA4_MEASUREMENT_ID');

  const propertyId = toStringValue(settingPropertyId)
    || readEnv('GA4_PROPERTY_ID');

  const explicitEnabled = parseBoolean(settingEnabled)
    || parseBoolean(readEnv('PUBLIC_GA4_ENABLED'));

  return {
    enabled: explicitEnabled || measurementId.length > 0,
    measurementId,
    propertyId
  };
}
