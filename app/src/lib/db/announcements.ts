import { logError } from '@lib/error-logger';
import { query, queryRows } from './client';

export type AnnouncementSeverity = 'info' | 'reminder' | 'urgent' | 'closure';
export type AnnouncementPlacement = 'global' | 'homepage' | 'camp' | 'coming-soon';
export type ScheduleExceptionType = 'closed' | 'modified_hours';

export interface SchoolAnnouncement {
  id: string;
  title: string;
  message: string;
  severity: AnnouncementSeverity;
  audience: string;
  placement: AnnouncementPlacement;
  ctaLabel: string | null;
  ctaUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isPublished: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolScheduleException {
  id: string;
  title: string;
  reason: string | null;
  startDate: string;
  endDate: string;
  exceptionType: ScheduleExceptionType;
  openTimeDecimal: number | null;
  closeTimeDecimal: number | null;
  beforeCareOffset: number | null;
  afterCareOffset: number | null;
  linkedAnnouncementId: string | null;
  linkedAnnouncementTitle: string | null;
  isPublished: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementAdminData {
  announcements: SchoolAnnouncement[];
  scheduleExceptions: SchoolScheduleException[];
}

export interface SchoolAnnouncementInput {
  title: string;
  message: string;
  severity?: AnnouncementSeverity;
  audience?: string;
  placement?: AnnouncementPlacement;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isPublished?: boolean;
  createdBy?: string | null;
}

export interface SchoolScheduleExceptionInput {
  title: string;
  reason?: string | null;
  startDate: string;
  endDate: string;
  exceptionType?: ScheduleExceptionType;
  openTimeDecimal?: number | null;
  closeTimeDecimal?: number | null;
  beforeCareOffset?: number | null;
  afterCareOffset?: number | null;
  linkedAnnouncementId?: string | null;
  isPublished?: boolean;
  createdBy?: string | null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_SEVERITIES = new Set<AnnouncementSeverity>(['info', 'reminder', 'urgent', 'closure']);
const VALID_PLACEMENTS = new Set<AnnouncementPlacement>([
  'global',
  'homepage',
  'camp',
  'coming-soon'
]);
const VALID_EXCEPTION_TYPES = new Set<ScheduleExceptionType>(['closed', 'modified_hours']);

const isUuidLike = (value: string): boolean => UUID_PATTERN.test(value);

const asString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

const nullableString = (value: unknown): string | null => {
  const normalized = asString(value);
  return normalized.length > 0 ? normalized : null;
};

const asBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const parseSeverity = (value: unknown): AnnouncementSeverity => {
  const normalized = asString(value).toLowerCase();
  if (VALID_SEVERITIES.has(normalized as AnnouncementSeverity)) {
    return normalized as AnnouncementSeverity;
  }
  return 'info';
};

const parsePlacement = (value: unknown): AnnouncementPlacement => {
  const normalized = asString(value).toLowerCase();
  if (VALID_PLACEMENTS.has(normalized as AnnouncementPlacement)) {
    return normalized as AnnouncementPlacement;
  }
  return 'global';
};

const parseExceptionType = (value: unknown): ScheduleExceptionType => {
  const normalized = asString(value).toLowerCase();
  if (VALID_EXCEPTION_TYPES.has(normalized as ScheduleExceptionType)) {
    return normalized as ScheduleExceptionType;
  }
  return 'closed';
};

const normalizeIsoDate = (value: unknown): string | null => {
  const normalized = asString(value);
  if (!DATE_PATTERN.test(normalized)) return null;
  return normalized;
};

const normalizeIsoTimestamp = (value: unknown): string | null => {
  const normalized = asString(value);
  if (!normalized) return null;
  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
};

const toAnnouncement = (row: Record<string, unknown>): SchoolAnnouncement => ({
  id: asString(row.id),
  title: asString(row.title),
  message: asString(row.message),
  severity: parseSeverity(row.severity),
  audience: asString(row.audience) || 'families',
  placement: parsePlacement(row.placement),
  ctaLabel: nullableString(row.cta_label),
  ctaUrl: nullableString(row.cta_url),
  startsAt: nullableString(row.starts_at),
  endsAt: nullableString(row.ends_at),
  isPublished: asBoolean(row.is_published, false),
  createdBy: nullableString(row.created_by),
  createdAt: asString(row.created_at),
  updatedAt: asString(row.updated_at)
});

const toScheduleException = (row: Record<string, unknown>): SchoolScheduleException => ({
  id: asString(row.id),
  title: asString(row.title),
  reason: nullableString(row.reason),
  startDate: asString(row.start_date),
  endDate: asString(row.end_date),
  exceptionType: parseExceptionType(row.exception_type),
  openTimeDecimal: asNumber(row.open_time_decimal),
  closeTimeDecimal: asNumber(row.close_time_decimal),
  beforeCareOffset: asNumber(row.before_care_offset),
  afterCareOffset: asNumber(row.after_care_offset),
  linkedAnnouncementId: nullableString(row.linked_announcement_id),
  linkedAnnouncementTitle: nullableString(row.linked_announcement_title),
  isPublished: asBoolean(row.is_published, false),
  createdBy: nullableString(row.created_by),
  createdAt: asString(row.created_at),
  updatedAt: asString(row.updated_at)
});

const sanitizeAnnouncementInput = (
  input: SchoolAnnouncementInput
): SchoolAnnouncementInput | null => {
  const title = asString(input.title).slice(0, 180);
  const message = asString(input.message).slice(0, 4000);
  if (!title || !message) return null;

  return {
    title,
    message,
    severity: parseSeverity(input.severity),
    audience: asString(input.audience).slice(0, 80) || 'families',
    placement: parsePlacement(input.placement),
    ctaLabel: nullableString(input.ctaLabel)?.slice(0, 80) ?? null,
    ctaUrl: nullableString(input.ctaUrl)?.slice(0, 500) ?? null,
    startsAt: normalizeIsoTimestamp(input.startsAt),
    endsAt: normalizeIsoTimestamp(input.endsAt),
    isPublished: asBoolean(input.isPublished, false),
    createdBy: nullableString(input.createdBy)?.slice(0, 255) ?? null
  };
};

const sanitizeScheduleExceptionInput = (
  input: SchoolScheduleExceptionInput
): SchoolScheduleExceptionInput | null => {
  const title = asString(input.title).slice(0, 180);
  const startDate = normalizeIsoDate(input.startDate);
  const endDate = normalizeIsoDate(input.endDate);
  if (!title || !startDate || !endDate) return null;

  const exceptionType = parseExceptionType(input.exceptionType);
  const openTimeDecimal = asNumber(input.openTimeDecimal);
  const closeTimeDecimal = asNumber(input.closeTimeDecimal);
  if (
    exceptionType === 'modified_hours' &&
    (openTimeDecimal === null || closeTimeDecimal === null)
  ) {
    return null;
  }

  const linkedAnnouncementId = nullableString(input.linkedAnnouncementId);

  return {
    title,
    reason: nullableString(input.reason)?.slice(0, 500) ?? null,
    startDate,
    endDate,
    exceptionType,
    openTimeDecimal: exceptionType === 'closed' ? null : openTimeDecimal,
    closeTimeDecimal: exceptionType === 'closed' ? null : closeTimeDecimal,
    beforeCareOffset: asNumber(input.beforeCareOffset),
    afterCareOffset: asNumber(input.afterCareOffset),
    linkedAnnouncementId:
      linkedAnnouncementId && isUuidLike(linkedAnnouncementId) ? linkedAnnouncementId : null,
    isPublished: asBoolean(input.isPublished, false),
    createdBy: nullableString(input.createdBy)?.slice(0, 255) ?? null
  };
};

export async function getActiveAnnouncements(options?: {
  placement?: AnnouncementPlacement | null;
  now?: Date;
  limit?: number;
}): Promise<SchoolAnnouncement[]> {
  const placement = options?.placement ?? null;
  const now = options?.now ?? new Date();
  const limit = Math.max(1, Math.min(options?.limit ?? 5, 20));

  try {
    const rows = await queryRows<Record<string, unknown>>(
      `
        SELECT
          id,
          title,
          message,
          severity,
          audience,
          placement,
          cta_label,
          cta_url,
          starts_at,
          ends_at,
          is_published,
          created_by,
          created_at,
          updated_at
        FROM school_announcements
        WHERE
          is_published = true
          AND (starts_at IS NULL OR starts_at <= $1::timestamptz)
          AND (ends_at IS NULL OR ends_at >= $1::timestamptz)
          AND (
            placement = 'global'
            OR ($2::text IS NOT NULL AND placement = $2::text)
          )
        ORDER BY
          CASE severity
            WHEN 'closure' THEN 0
            WHEN 'urgent' THEN 1
            WHEN 'reminder' THEN 2
            ELSE 3
          END,
          created_at DESC
        LIMIT $3
      `,
      [now.toISOString(), placement, limit]
    );
    return rows.map(toAnnouncement);
  } catch (error) {
    logError('db.announcements', error, { action: 'getActiveAnnouncements', placement, limit });
    return [];
  }
}

export async function getScheduleExceptionsInRange(
  startDate: string,
  endDate: string,
  includeUnpublished = false
): Promise<SchoolScheduleException[]> {
  const normalizedStart = normalizeIsoDate(startDate);
  const normalizedEnd = normalizeIsoDate(endDate);
  if (!normalizedStart || !normalizedEnd) return [];

  try {
    const rows = await queryRows<Record<string, unknown>>(
      `
        SELECT
          se.id,
          se.title,
          se.reason,
          se.start_date,
          se.end_date,
          se.exception_type,
          se.open_time_decimal,
          se.close_time_decimal,
          se.before_care_offset,
          se.after_care_offset,
          se.linked_announcement_id,
          se.is_published,
          se.created_by,
          se.created_at,
          se.updated_at,
          sa.title AS linked_announcement_title
        FROM school_schedule_exceptions se
        LEFT JOIN school_announcements sa
          ON sa.id = se.linked_announcement_id
        WHERE
          se.end_date >= $1::date
          AND se.start_date <= $2::date
          AND ($3::boolean = true OR se.is_published = true)
        ORDER BY se.start_date ASC, se.created_at DESC
      `,
      [normalizedStart, normalizedEnd, includeUnpublished]
    );
    return rows.map(toScheduleException);
  } catch (error) {
    logError('db.announcements', error, {
      action: 'getScheduleExceptionsInRange',
      startDate: normalizedStart,
      endDate: normalizedEnd
    });
    return [];
  }
}

export async function getAnnouncementAdminData(): Promise<AnnouncementAdminData> {
  try {
    const [announcements, scheduleExceptions] = await Promise.all([
      queryRows<Record<string, unknown>>(
        `
          SELECT
            id,
            title,
            message,
            severity,
            audience,
            placement,
            cta_label,
            cta_url,
            starts_at,
            ends_at,
            is_published,
            created_by,
            created_at,
            updated_at
          FROM school_announcements
          ORDER BY is_published DESC, created_at DESC
          LIMIT 200
        `
      ),
      queryRows<Record<string, unknown>>(
        `
          SELECT
            se.id,
            se.title,
            se.reason,
            se.start_date,
            se.end_date,
            se.exception_type,
            se.open_time_decimal,
            se.close_time_decimal,
            se.before_care_offset,
            se.after_care_offset,
            se.linked_announcement_id,
            se.is_published,
            se.created_by,
            se.created_at,
            se.updated_at,
            sa.title AS linked_announcement_title
          FROM school_schedule_exceptions se
          LEFT JOIN school_announcements sa
            ON sa.id = se.linked_announcement_id
          ORDER BY se.start_date DESC, se.created_at DESC
          LIMIT 300
        `
      )
    ]);

    return {
      announcements: announcements.map(toAnnouncement),
      scheduleExceptions: scheduleExceptions.map(toScheduleException)
    };
  } catch (error) {
    logError('db.announcements', error, { action: 'getAnnouncementAdminData' });
    return {
      announcements: [],
      scheduleExceptions: []
    };
  }
}

export async function createSchoolAnnouncement(
  input: SchoolAnnouncementInput
): Promise<string | null> {
  const data = sanitizeAnnouncementInput(input);
  if (!data) return null;

  try {
    const result = await query<{ id: string }>(
      `
        INSERT INTO school_announcements (
          title,
          message,
          severity,
          audience,
          placement,
          cta_label,
          cta_url,
          starts_at,
          ends_at,
          is_published,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, $10, $11)
        RETURNING id
      `,
      [
        data.title,
        data.message,
        data.severity,
        data.audience,
        data.placement,
        data.ctaLabel,
        data.ctaUrl,
        data.startsAt,
        data.endsAt,
        data.isPublished ?? false,
        data.createdBy ?? null
      ]
    );

    return result.rows[0]?.id ?? null;
  } catch (error) {
    logError('db.announcements', error, { action: 'createSchoolAnnouncement' });
    return null;
  }
}

export async function updateSchoolAnnouncement(
  id: string,
  input: SchoolAnnouncementInput
): Promise<boolean> {
  if (!isUuidLike(id)) return false;
  const data = sanitizeAnnouncementInput(input);
  if (!data) return false;

  try {
    const result = await query(
      `
        UPDATE school_announcements
        SET
          title = $2,
          message = $3,
          severity = $4,
          audience = $5,
          placement = $6,
          cta_label = $7,
          cta_url = $8,
          starts_at = $9::timestamptz,
          ends_at = $10::timestamptz,
          is_published = $11
        WHERE id = $1
      `,
      [
        id,
        data.title,
        data.message,
        data.severity,
        data.audience,
        data.placement,
        data.ctaLabel,
        data.ctaUrl,
        data.startsAt,
        data.endsAt,
        data.isPublished ?? false
      ]
    );

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    logError('db.announcements', error, { action: 'updateSchoolAnnouncement', id });
    return false;
  }
}

export async function deleteSchoolAnnouncement(id: string): Promise<boolean> {
  if (!isUuidLike(id)) return false;

  try {
    const result = await query(
      `
        DELETE FROM school_announcements
        WHERE id = $1
      `,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    logError('db.announcements', error, { action: 'deleteSchoolAnnouncement', id });
    return false;
  }
}

export async function createScheduleException(
  input: SchoolScheduleExceptionInput
): Promise<string | null> {
  const data = sanitizeScheduleExceptionInput(input);
  if (!data) return null;

  try {
    const result = await query<{ id: string }>(
      `
        INSERT INTO school_schedule_exceptions (
          title,
          reason,
          start_date,
          end_date,
          exception_type,
          open_time_decimal,
          close_time_decimal,
          before_care_offset,
          after_care_offset,
          linked_announcement_id,
          is_published,
          created_by
        )
        VALUES ($1, $2, $3::date, $4::date, $5, $6, $7, $8, $9, $10::uuid, $11, $12)
        RETURNING id
      `,
      [
        data.title,
        data.reason ?? null,
        data.startDate,
        data.endDate,
        data.exceptionType ?? 'closed',
        data.openTimeDecimal,
        data.closeTimeDecimal,
        data.beforeCareOffset,
        data.afterCareOffset,
        data.linkedAnnouncementId ?? null,
        data.isPublished ?? false,
        data.createdBy ?? null
      ]
    );
    return result.rows[0]?.id ?? null;
  } catch (error) {
    logError('db.announcements', error, { action: 'createScheduleException' });
    return null;
  }
}

export async function updateScheduleException(
  id: string,
  input: SchoolScheduleExceptionInput
): Promise<boolean> {
  if (!isUuidLike(id)) return false;
  const data = sanitizeScheduleExceptionInput(input);
  if (!data) return false;

  try {
    const result = await query(
      `
        UPDATE school_schedule_exceptions
        SET
          title = $2,
          reason = $3,
          start_date = $4::date,
          end_date = $5::date,
          exception_type = $6,
          open_time_decimal = $7,
          close_time_decimal = $8,
          before_care_offset = $9,
          after_care_offset = $10,
          linked_announcement_id = $11::uuid,
          is_published = $12
        WHERE id = $1
      `,
      [
        id,
        data.title,
        data.reason ?? null,
        data.startDate,
        data.endDate,
        data.exceptionType ?? 'closed',
        data.openTimeDecimal,
        data.closeTimeDecimal,
        data.beforeCareOffset,
        data.afterCareOffset,
        data.linkedAnnouncementId ?? null,
        data.isPublished ?? false
      ]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    logError('db.announcements', error, { action: 'updateScheduleException', id });
    return false;
  }
}

export async function deleteScheduleException(id: string): Promise<boolean> {
  if (!isUuidLike(id)) return false;

  try {
    const result = await query(
      `
        DELETE FROM school_schedule_exceptions
        WHERE id = $1
      `,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    logError('db.announcements', error, { action: 'deleteScheduleException', id });
    return false;
  }
}
