import { logError } from '@lib/error-logger';
import { query, queryFirst, queryRows, withTransaction } from './client';

type CampWeekStatus = 'draft' | 'open' | 'limited' | 'full' | 'waitlist' | 'closed';

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const asInteger = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
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

const asNullableIso = (value: unknown): string | null => {
  const text = asString(value);
  if (!text) return null;
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeSlug = (value: unknown): string =>
  asString(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const normalizeDateOnly = (value: unknown): string => {
  const text = asString(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return '';
  return new Date(parsed).toISOString().slice(0, 10);
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuidLike = (value: string): boolean => UUID_PATTERN.test(value);

const isMissingCampSchemaError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String((error as { message?: unknown }).message ?? '') : '';
  return message.includes('relation "camp_') && message.includes('does not exist');
};

export interface CampSeasonView {
  id: string;
  slug: string;
  name: string;
  year: number;
  isActive: boolean;
  registrationOpenAt: string | null;
  registrationCloseAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampWeekVariantView {
  id: string;
  weekId: string;
  label: string;
  ageRangeLabel: string | null;
  hoursLabel: string | null;
  priceLabel: string | null;
  notes: string | null;
  displayOrder: number;
}

export interface CampWeekView {
  id: string;
  seasonId: string;
  seasonSlug: string;
  seasonName: string;
  seasonYear: number;
  slug: string;
  themeTitle: string;
  summary: string;
  description: string;
  startDate: string;
  endDate: string;
  ageRangeLabel: string;
  hoursLabel: string;
  priceLabel: string;
  capacityTotal: number;
  seatsConfirmed: number;
  seatsHeld: number;
  availableSeats: number;
  waitlistEnabled: boolean;
  limitedThreshold: number;
  enrollmentUrl: string;
  waitlistUrl: string | null;
  isPublished: boolean;
  displayOrder: number;
  heroMediaSlug: string | null;
  registrationOpenAt: string | null;
  registrationCloseAt: string | null;
  lastSyncedAt: string | null;
  syncSource: string | null;
  status: CampWeekStatus;
  variants: CampWeekVariantView[];
  createdAt: string;
  updatedAt: string;
}

export interface CampSeatAdjustmentView {
  id: string;
  weekId: string;
  weekSlug: string;
  weekTitle: string;
  action: string;
  beforeConfirmed: number | null;
  afterConfirmed: number | null;
  beforeHeld: number | null;
  afterHeld: number | null;
  beforeCapacity: number | null;
  afterCapacity: number | null;
  note: string | null;
  actorEmail: string | null;
  createdAt: string;
}

export interface CampAdminData {
  available: boolean;
  seasons: CampSeasonView[];
  weeks: CampWeekView[];
  recentAdjustments: CampSeatAdjustmentView[];
  errorMessage: string | null;
}

export interface CampPromotionWeekSummary {
  slug: string;
  themeTitle: string;
  startDate: string;
  availableSeats: number;
  status: CampWeekStatus;
}

export interface CampPromotionSummary {
  available: boolean;
  totalPublishedWeeks: number;
  openWeeks: number;
  limitedWeeks: number;
  waitlistWeeks: number;
  fullWeeks: number;
  closedWeeks: number;
  nextOpenWeek: CampPromotionWeekSummary | null;
  errorMessage: string | null;
}

const computeWeekStatus = (
  week: {
    isPublished: boolean;
    availableSeats: number;
    waitlistEnabled: boolean;
    limitedThreshold: number;
    registrationOpenAt: string | null;
    registrationCloseAt: string | null;
  },
  now = new Date()
): CampWeekStatus => {
  if (!week.isPublished) return 'draft';

  const nowMs = now.getTime();
  const openMs = week.registrationOpenAt ? Date.parse(week.registrationOpenAt) : null;
  const closeMs = week.registrationCloseAt ? Date.parse(week.registrationCloseAt) : null;

  if ((openMs && nowMs < openMs) || (closeMs && nowMs > closeMs)) {
    return 'closed';
  }

  if (week.availableSeats <= 0) {
    return week.waitlistEnabled ? 'waitlist' : 'full';
  }

  if (week.availableSeats <= Math.max(0, week.limitedThreshold)) {
    return 'limited';
  }

  return 'open';
};

const mapSeason = (row: {
  id: string;
  slug: string;
  name: string;
  year: number | string;
  is_active: boolean | number | string;
  registration_open_at: string | null;
  registration_close_at: string | null;
  created_at: string;
  updated_at: string;
}): CampSeasonView => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  year: asInteger(row.year),
  isActive: asBoolean(row.is_active),
  registrationOpenAt: row.registration_open_at,
  registrationCloseAt: row.registration_close_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export async function getCampAdminData(): Promise<CampAdminData> {
  const fallback: CampAdminData = {
    available: false,
    seasons: [],
    weeks: [],
    recentAdjustments: [],
    errorMessage: null
  };

  try {
    const [seasonRows, weekRows, adjustmentRows] = await Promise.all([
      queryRows<{
        id: string;
        slug: string;
        name: string;
        year: number | string;
        is_active: boolean | number | string;
        registration_open_at: string | null;
        registration_close_at: string | null;
        created_at: string;
        updated_at: string;
      }>(
        `
          SELECT
            id,
            slug,
            name,
            year,
            is_active,
            registration_open_at,
            registration_close_at,
            created_at,
            updated_at
          FROM camp_seasons
          ORDER BY year DESC, created_at DESC
        `
      ),
      queryRows<{
        id: string;
        season_id: string;
        season_slug: string;
        season_name: string;
        season_year: number | string;
        slug: string;
        theme_title: string;
        summary: string;
        description: string;
        start_date: string;
        end_date: string;
        age_range_label: string;
        hours_label: string;
        price_label: string;
        capacity_total: number | string;
        seats_confirmed: number | string;
        seats_held: number | string;
        waitlist_enabled: boolean | number | string;
        limited_threshold: number | string;
        enrollment_url: string;
        waitlist_url: string | null;
        is_published: boolean | number | string;
        display_order: number | string;
        hero_media_slug: string | null;
        registration_open_at_effective: string | null;
        registration_close_at_effective: string | null;
        last_synced_at: string | null;
        sync_source: string | null;
        created_at: string;
        updated_at: string;
      }>(
        `
          SELECT
            cw.id,
            cw.season_id,
            cs.slug AS season_slug,
            cs.name AS season_name,
            cs.year AS season_year,
            cw.slug,
            cw.theme_title,
            cw.summary,
            cw.description,
            cw.start_date::text AS start_date,
            cw.end_date::text AS end_date,
            cw.age_range_label,
            cw.hours_label,
            cw.price_label,
            cw.capacity_total,
            cw.seats_confirmed,
            cw.seats_held,
            cw.waitlist_enabled,
            cw.limited_threshold,
            cw.enrollment_url,
            cw.waitlist_url,
            cw.is_published,
            cw.display_order,
            cw.hero_media_slug,
            COALESCE(cw.registration_open_at, cs.registration_open_at) AS registration_open_at_effective,
            COALESCE(cw.registration_close_at, cs.registration_close_at) AS registration_close_at_effective,
            cw.last_synced_at,
            cw.sync_source,
            cw.created_at,
            cw.updated_at
          FROM camp_weeks cw
          INNER JOIN camp_seasons cs ON cs.id = cw.season_id
          ORDER BY cw.start_date ASC, cw.display_order ASC, cw.created_at ASC
        `
      ),
      queryRows<{
        id: string;
        week_id: string;
        week_slug: string;
        week_title: string;
        action: string;
        before_confirmed: number | string | null;
        after_confirmed: number | string | null;
        before_held: number | string | null;
        after_held: number | string | null;
        before_capacity: number | string | null;
        after_capacity: number | string | null;
        note: string | null;
        actor_email: string | null;
        created_at: string;
      }>(
        `
          SELECT
            a.id,
            a.camp_week_id AS week_id,
            w.slug AS week_slug,
            w.theme_title AS week_title,
            a.action,
            a.before_confirmed,
            a.after_confirmed,
            a.before_held,
            a.after_held,
            a.before_capacity,
            a.after_capacity,
            a.note,
            a.actor_email,
            a.created_at
          FROM camp_seat_adjustments a
          INNER JOIN camp_weeks w ON w.id = a.camp_week_id
          ORDER BY a.created_at DESC
          LIMIT 60
        `
      )
    ]);

    const seasons = seasonRows.map(mapSeason);
    const weekIds = weekRows.map(row => row.id);

    const variantRows =
      weekIds.length > 0
        ? await queryRows<{
            id: string;
            camp_week_id: string;
            label: string;
            age_range_label: string | null;
            hours_label: string | null;
            price_label: string | null;
            notes: string | null;
            display_order: number | string;
          }>(
            `
          SELECT
            id,
            camp_week_id,
            label,
            age_range_label,
            hours_label,
            price_label,
            notes,
            display_order
          FROM camp_week_variants
          WHERE camp_week_id = ANY($1::uuid[])
          ORDER BY display_order ASC, created_at ASC
        `,
            [weekIds]
          )
        : [];

    const variantsByWeekId = new Map<string, CampWeekVariantView[]>();
    variantRows.forEach(row => {
      const mapped: CampWeekVariantView = {
        id: row.id,
        weekId: row.camp_week_id,
        label: row.label,
        ageRangeLabel: row.age_range_label,
        hoursLabel: row.hours_label,
        priceLabel: row.price_label,
        notes: row.notes,
        displayOrder: asInteger(row.display_order)
      };

      const list = variantsByWeekId.get(row.camp_week_id) ?? [];
      list.push(mapped);
      variantsByWeekId.set(row.camp_week_id, list);
    });

    const weeks: CampWeekView[] = weekRows.map(row => {
      const capacityTotal = asInteger(row.capacity_total);
      const seatsConfirmed = asInteger(row.seats_confirmed);
      const seatsHeld = asInteger(row.seats_held);
      const availableSeats = Math.max(0, capacityTotal - seatsConfirmed - seatsHeld);
      const waitlistEnabled = asBoolean(row.waitlist_enabled, true);
      const limitedThreshold = Math.max(0, asInteger(row.limited_threshold, 4));
      const isPublished = asBoolean(row.is_published, false);
      const registrationOpenAt = row.registration_open_at_effective;
      const registrationCloseAt = row.registration_close_at_effective;

      return {
        id: row.id,
        seasonId: row.season_id,
        seasonSlug: row.season_slug,
        seasonName: row.season_name,
        seasonYear: asInteger(row.season_year),
        slug: row.slug,
        themeTitle: row.theme_title,
        summary: row.summary,
        description: row.description,
        startDate: row.start_date,
        endDate: row.end_date,
        ageRangeLabel: row.age_range_label,
        hoursLabel: row.hours_label,
        priceLabel: row.price_label,
        capacityTotal,
        seatsConfirmed,
        seatsHeld,
        availableSeats,
        waitlistEnabled,
        limitedThreshold,
        enrollmentUrl: row.enrollment_url,
        waitlistUrl: row.waitlist_url,
        isPublished,
        displayOrder: asInteger(row.display_order),
        heroMediaSlug: row.hero_media_slug,
        registrationOpenAt,
        registrationCloseAt,
        lastSyncedAt: row.last_synced_at,
        syncSource: row.sync_source,
        status: computeWeekStatus({
          isPublished,
          availableSeats,
          waitlistEnabled,
          limitedThreshold,
          registrationOpenAt,
          registrationCloseAt
        }),
        variants: variantsByWeekId.get(row.id) ?? [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });

    const recentAdjustments: CampSeatAdjustmentView[] = adjustmentRows.map(row => ({
      id: row.id,
      weekId: row.week_id,
      weekSlug: row.week_slug,
      weekTitle: row.week_title,
      action: row.action,
      beforeConfirmed: row.before_confirmed === null ? null : asInteger(row.before_confirmed),
      afterConfirmed: row.after_confirmed === null ? null : asInteger(row.after_confirmed),
      beforeHeld: row.before_held === null ? null : asInteger(row.before_held),
      afterHeld: row.after_held === null ? null : asInteger(row.after_held),
      beforeCapacity: row.before_capacity === null ? null : asInteger(row.before_capacity),
      afterCapacity: row.after_capacity === null ? null : asInteger(row.after_capacity),
      note: row.note,
      actorEmail: row.actor_email,
      createdAt: row.created_at
    }));

    return {
      available: true,
      seasons,
      weeks,
      recentAdjustments,
      errorMessage: null
    };
  } catch (error) {
    logError('db.camp', error, { action: 'getCampAdminData' });
    return {
      ...fallback,
      errorMessage: isMissingCampSchemaError(error)
        ? 'Camp tables are not available yet. Apply migration 006 to enable camp management.'
        : 'Camp data is currently unavailable.'
    };
  }
}

export async function getPublishedCampWeeks(): Promise<CampWeekView[]> {
  const data = await getCampAdminData();
  if (!data.available) return [];
  return data.weeks.filter(week => week.isPublished);
}

export async function getCampPromotionSummary(): Promise<CampPromotionSummary> {
  const fallback: CampPromotionSummary = {
    available: false,
    totalPublishedWeeks: 0,
    openWeeks: 0,
    limitedWeeks: 0,
    waitlistWeeks: 0,
    fullWeeks: 0,
    closedWeeks: 0,
    nextOpenWeek: null,
    errorMessage: null
  };

  try {
    const rows = await queryRows<{
      slug: string;
      theme_title: string;
      start_date: string;
      capacity_total: number | string;
      seats_confirmed: number | string;
      seats_held: number | string;
      waitlist_enabled: boolean | number | string;
      limited_threshold: number | string;
      registration_open_at_effective: string | null;
      registration_close_at_effective: string | null;
      is_published: boolean | number | string;
    }>(
      `
        SELECT
          cw.slug,
          cw.theme_title,
          cw.start_date::text AS start_date,
          cw.capacity_total,
          cw.seats_confirmed,
          cw.seats_held,
          cw.waitlist_enabled,
          cw.limited_threshold,
          COALESCE(cw.registration_open_at, cs.registration_open_at) AS registration_open_at_effective,
          COALESCE(cw.registration_close_at, cs.registration_close_at) AS registration_close_at_effective,
          cw.is_published
        FROM camp_weeks cw
        INNER JOIN camp_seasons cs ON cs.id = cw.season_id
        WHERE cw.is_published = true
        ORDER BY cw.start_date ASC, cw.display_order ASC, cw.created_at ASC
      `
    );

    const weekSummaries: CampPromotionWeekSummary[] = rows.map(row => {
      const capacityTotal = asInteger(row.capacity_total);
      const seatsConfirmed = asInteger(row.seats_confirmed);
      const seatsHeld = asInteger(row.seats_held);
      const availableSeats = Math.max(0, capacityTotal - seatsConfirmed - seatsHeld);
      const waitlistEnabled = asBoolean(row.waitlist_enabled, true);
      const limitedThreshold = Math.max(0, asInteger(row.limited_threshold, 4));
      const isPublished = asBoolean(row.is_published, false);
      const registrationOpenAt = row.registration_open_at_effective;
      const registrationCloseAt = row.registration_close_at_effective;

      return {
        slug: row.slug,
        themeTitle: row.theme_title,
        startDate: row.start_date,
        availableSeats,
        status: computeWeekStatus({
          isPublished,
          availableSeats,
          waitlistEnabled,
          limitedThreshold,
          registrationOpenAt,
          registrationCloseAt
        })
      };
    });

    const openWeeks = weekSummaries.filter(week => week.status === 'open').length;
    const limitedWeeks = weekSummaries.filter(week => week.status === 'limited').length;
    const waitlistWeeks = weekSummaries.filter(week => week.status === 'waitlist').length;
    const fullWeeks = weekSummaries.filter(week => week.status === 'full').length;
    const closedWeeks = weekSummaries.filter(week => week.status === 'closed').length;

    const nextOpenWeek =
      weekSummaries.find(week => week.status === 'open' || week.status === 'limited') ?? null;

    return {
      available: true,
      totalPublishedWeeks: weekSummaries.length,
      openWeeks,
      limitedWeeks,
      waitlistWeeks,
      fullWeeks,
      closedWeeks,
      nextOpenWeek,
      errorMessage: null
    };
  } catch (error) {
    logError('db.camp', error, { action: 'getCampPromotionSummary' });
    return {
      ...fallback,
      errorMessage: isMissingCampSchemaError(error)
        ? 'Camp tables are not available yet. Apply migration 006 to enable camp promotions.'
        : 'Camp promotion summary is currently unavailable.'
    };
  }
}

export interface CampSeasonInput {
  slug: string;
  name: string;
  year: number;
  isActive: boolean;
  registrationOpenAt: string | null;
  registrationCloseAt: string | null;
}

export interface CampWeekInput {
  seasonId: string;
  slug: string;
  themeTitle: string;
  summary: string;
  description: string;
  startDate: string;
  endDate: string;
  ageRangeLabel: string;
  hoursLabel: string;
  priceLabel: string;
  capacityTotal: number;
  seatsConfirmed: number;
  seatsHeld: number;
  waitlistEnabled: boolean;
  limitedThreshold: number;
  enrollmentUrl: string;
  waitlistUrl: string | null;
  isPublished: boolean;
  displayOrder: number;
  registrationOpenAt: string | null;
  registrationCloseAt: string | null;
}

const sanitizeSeasonInput = (input: Partial<CampSeasonInput>): CampSeasonInput | null => {
  const slug = normalizeSlug(input.slug);
  const name = asString(input.name);
  const year = clamp(asInteger(input.year, Number.NaN), 2020, 2100);

  if (!slug || !name || !Number.isFinite(year)) return null;

  return {
    slug,
    name: name.slice(0, 140),
    year,
    isActive: asBoolean(input.isActive, false),
    registrationOpenAt: asNullableIso(input.registrationOpenAt),
    registrationCloseAt: asNullableIso(input.registrationCloseAt)
  };
};

const sanitizeWeekInput = (input: Partial<CampWeekInput>): CampWeekInput | null => {
  const seasonId = asString(input.seasonId);
  const slug = normalizeSlug(input.slug);
  const themeTitle = asString(input.themeTitle);
  const startDate = normalizeDateOnly(input.startDate);
  const endDate = normalizeDateOnly(input.endDate);

  if (!isUuidLike(seasonId) || !slug || !themeTitle || !startDate || !endDate) return null;

  return {
    seasonId,
    slug,
    themeTitle: themeTitle.slice(0, 180),
    summary: asString(input.summary).slice(0, 700),
    description: asString(input.description).slice(0, 7000),
    startDate,
    endDate,
    ageRangeLabel: asString(input.ageRangeLabel).slice(0, 120),
    hoursLabel: asString(input.hoursLabel).slice(0, 120),
    priceLabel: asString(input.priceLabel).slice(0, 120),
    capacityTotal: Math.max(0, asInteger(input.capacityTotal)),
    seatsConfirmed: Math.max(0, asInteger(input.seatsConfirmed)),
    seatsHeld: Math.max(0, asInteger(input.seatsHeld)),
    waitlistEnabled: asBoolean(input.waitlistEnabled, true),
    limitedThreshold: Math.max(0, asInteger(input.limitedThreshold, 4)),
    enrollmentUrl: asString(input.enrollmentUrl).slice(0, 2048),
    waitlistUrl: asString(input.waitlistUrl).slice(0, 2048) || null,
    isPublished: asBoolean(input.isPublished, false),
    displayOrder: Math.max(0, asInteger(input.displayOrder, 0)),
    registrationOpenAt: asNullableIso(input.registrationOpenAt),
    registrationCloseAt: asNullableIso(input.registrationCloseAt)
  };
};

export async function createCampSeason(input: Partial<CampSeasonInput>): Promise<string | null> {
  const data = sanitizeSeasonInput(input);
  if (!data) return null;

  try {
    const row = await queryFirst<{ id: string }>(
      `
        INSERT INTO camp_seasons (
          slug,
          name,
          year,
          is_active,
          registration_open_at,
          registration_close_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [
        data.slug,
        data.name,
        data.year,
        data.isActive,
        data.registrationOpenAt,
        data.registrationCloseAt
      ]
    );

    return row?.id ?? null;
  } catch (error) {
    logError('db.camp', error, { action: 'createCampSeason' });
    return null;
  }
}

export async function updateCampSeason(
  seasonId: string,
  input: Partial<CampSeasonInput>
): Promise<boolean> {
  const data = sanitizeSeasonInput(input);
  if (!isUuidLike(seasonId) || !data) return false;

  try {
    const result = await query(
      `
        UPDATE camp_seasons
        SET
          slug = $2,
          name = $3,
          year = $4,
          is_active = $5,
          registration_open_at = $6,
          registration_close_at = $7
        WHERE id = $1
      `,
      [
        seasonId,
        data.slug,
        data.name,
        data.year,
        data.isActive,
        data.registrationOpenAt,
        data.registrationCloseAt
      ]
    );

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    logError('db.camp', error, { action: 'updateCampSeason', seasonId });
    return false;
  }
}

export async function createCampWeek(input: Partial<CampWeekInput>): Promise<string | null> {
  const data = sanitizeWeekInput(input);
  if (!data) return null;

  try {
    const row = await queryFirst<{ id: string }>(
      `
        INSERT INTO camp_weeks (
          season_id,
          slug,
          theme_title,
          summary,
          description,
          start_date,
          end_date,
          age_range_label,
          hours_label,
          price_label,
          capacity_total,
          seats_confirmed,
          seats_held,
          waitlist_enabled,
          limited_threshold,
          enrollment_url,
          waitlist_url,
          is_published,
          display_order,
          registration_open_at,
          registration_close_at,
          sync_source
        )
        VALUES (
          $1, $2, $3, $4, $5, $6::date, $7::date, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, 'manual'
        )
        RETURNING id
      `,
      [
        data.seasonId,
        data.slug,
        data.themeTitle,
        data.summary,
        data.description,
        data.startDate,
        data.endDate,
        data.ageRangeLabel,
        data.hoursLabel,
        data.priceLabel,
        data.capacityTotal,
        data.seatsConfirmed,
        data.seatsHeld,
        data.waitlistEnabled,
        data.limitedThreshold,
        data.enrollmentUrl,
        data.waitlistUrl,
        data.isPublished,
        data.displayOrder,
        data.registrationOpenAt,
        data.registrationCloseAt
      ]
    );

    return row?.id ?? null;
  } catch (error) {
    logError('db.camp', error, { action: 'createCampWeek' });
    return null;
  }
}

export async function updateCampWeek(
  weekId: string,
  input: Partial<CampWeekInput>
): Promise<boolean> {
  const data = sanitizeWeekInput(input);
  if (!isUuidLike(weekId) || !data) return false;

  try {
    const result = await query(
      `
        UPDATE camp_weeks
        SET
          season_id = $2,
          slug = $3,
          theme_title = $4,
          summary = $5,
          description = $6,
          start_date = $7::date,
          end_date = $8::date,
          age_range_label = $9,
          hours_label = $10,
          price_label = $11,
          capacity_total = $12,
          seats_confirmed = $13,
          seats_held = $14,
          waitlist_enabled = $15,
          limited_threshold = $16,
          enrollment_url = $17,
          waitlist_url = $18,
          is_published = $19,
          display_order = $20,
          registration_open_at = $21,
          registration_close_at = $22,
          sync_source = 'manual'
        WHERE id = $1
      `,
      [
        weekId,
        data.seasonId,
        data.slug,
        data.themeTitle,
        data.summary,
        data.description,
        data.startDate,
        data.endDate,
        data.ageRangeLabel,
        data.hoursLabel,
        data.priceLabel,
        data.capacityTotal,
        data.seatsConfirmed,
        data.seatsHeld,
        data.waitlistEnabled,
        data.limitedThreshold,
        data.enrollmentUrl,
        data.waitlistUrl,
        data.isPublished,
        data.displayOrder,
        data.registrationOpenAt,
        data.registrationCloseAt
      ]
    );

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    logError('db.camp', error, { action: 'updateCampWeek', weekId });
    return false;
  }
}

export async function deleteCampWeek(weekId: string): Promise<boolean> {
  if (!isUuidLike(weekId)) return false;

  try {
    const result = await query(
      `
        DELETE FROM camp_weeks
        WHERE id = $1
      `,
      [weekId]
    );

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    logError('db.camp', error, { action: 'deleteCampWeek', weekId });
    return false;
  }
}

export interface CampSeatAdjustmentInput {
  weekId: string;
  deltaConfirmed: number;
  deltaHeld: number;
  deltaCapacity: number;
  note?: string;
  actorEmail?: string | null;
}

export async function adjustCampWeekSeats(input: CampSeatAdjustmentInput): Promise<boolean> {
  if (!isUuidLike(input.weekId)) return false;

  const deltaConfirmed = Math.trunc(input.deltaConfirmed);
  const deltaHeld = Math.trunc(input.deltaHeld);
  const deltaCapacity = Math.trunc(input.deltaCapacity);
  const note = asString(input.note).slice(0, 500) || null;
  const actorEmail = asString(input.actorEmail ?? '').slice(0, 320) || null;

  if (deltaConfirmed === 0 && deltaHeld === 0 && deltaCapacity === 0) return false;

  try {
    return await withTransaction<boolean>(async client => {
      const rowResult = await client.query<{
        id: string;
        seats_confirmed: number;
        seats_held: number;
        capacity_total: number;
      }>(
        `
          SELECT id, seats_confirmed, seats_held, capacity_total
          FROM camp_weeks
          WHERE id = $1
          FOR UPDATE
        `,
        [input.weekId]
      );

      const current = rowResult.rows[0];
      if (!current) return false;

      const nextConfirmed = Math.max(0, current.seats_confirmed + deltaConfirmed);
      const nextHeld = Math.max(0, current.seats_held + deltaHeld);
      const nextCapacity = Math.max(0, current.capacity_total + deltaCapacity);

      await client.query(
        `
          UPDATE camp_weeks
          SET
            seats_confirmed = $2,
            seats_held = $3,
            capacity_total = $4,
            sync_source = 'manual'
          WHERE id = $1
        `,
        [input.weekId, nextConfirmed, nextHeld, nextCapacity]
      );

      await client.query(
        `
          INSERT INTO camp_seat_adjustments (
            camp_week_id,
            action,
            before_confirmed,
            after_confirmed,
            before_held,
            after_held,
            before_capacity,
            after_capacity,
            note,
            actor_email,
            metadata
          )
          VALUES ($1, 'manual_adjust', $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
        `,
        [
          input.weekId,
          current.seats_confirmed,
          nextConfirmed,
          current.seats_held,
          nextHeld,
          current.capacity_total,
          nextCapacity,
          note,
          actorEmail,
          JSON.stringify({
            deltaConfirmed,
            deltaHeld,
            deltaCapacity
          })
        ]
      );

      return true;
    });
  } catch (error) {
    logError('db.camp', error, { action: 'adjustCampWeekSeats', weekId: input.weekId });
    return false;
  }
}

export interface CampVariantInput {
  id?: string;
  label: string;
  ageRangeLabel?: string;
  hoursLabel?: string;
  priceLabel?: string;
  notes?: string;
  displayOrder?: number;
}

const parseVariantLines = (value: unknown): CampVariantInput[] => {
  if (typeof value !== 'string') return [];

  return value
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map((line, index) => {
      const [label = '', ageRangeLabel = '', hoursLabel = '', priceLabel = '', notes = ''] = line
        .split('|')
        .map(piece => piece.trim());

      return {
        label,
        ageRangeLabel,
        hoursLabel,
        priceLabel,
        notes,
        displayOrder: index
      };
    })
    .filter(variant => variant.label.length > 0);
};

export async function replaceCampWeekVariantsFromLines(
  weekId: string,
  variantLines: unknown
): Promise<boolean> {
  if (!isUuidLike(weekId)) return false;

  const variants = parseVariantLines(variantLines);

  try {
    return await withTransaction<boolean>(async client => {
      await client.query(
        `
          DELETE FROM camp_week_variants
          WHERE camp_week_id = $1
        `,
        [weekId]
      );

      for (const variant of variants) {
        await client.query(
          `
            INSERT INTO camp_week_variants (
              camp_week_id,
              label,
              age_range_label,
              hours_label,
              price_label,
              notes,
              display_order
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            weekId,
            variant.label.slice(0, 160),
            asString(variant.ageRangeLabel).slice(0, 120) || null,
            asString(variant.hoursLabel).slice(0, 120) || null,
            asString(variant.priceLabel).slice(0, 120) || null,
            asString(variant.notes).slice(0, 800) || null,
            Math.max(0, asInteger(variant.displayOrder, 0))
          ]
        );
      }

      return true;
    });
  } catch (error) {
    logError('db.camp', error, { action: 'replaceCampWeekVariantsFromLines', weekId });
    return false;
  }
}
