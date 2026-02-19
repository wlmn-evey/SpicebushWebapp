import { logError } from '@lib/error-logger';
import { query, queryFirst, queryRows } from './client';

type AnalyticsScalar = string | number | boolean | null;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const cleanString = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

const cleanNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const normalizeProperties = (value: unknown): Record<string, AnalyticsScalar> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const entries = Object.entries(source)
    .slice(0, 40)
    .map(([key, rawValue]) => {
      const normalizedKey = key.trim().slice(0, 64);
      if (!normalizedKey) return null;

      if (typeof rawValue === 'string') {
        return [normalizedKey, rawValue.slice(0, 800)] as const;
      }
      if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
        return [normalizedKey, rawValue] as const;
      }
      if (typeof rawValue === 'boolean' || rawValue === null) {
        return [normalizedKey, rawValue] as const;
      }

      return [normalizedKey, JSON.stringify(rawValue).slice(0, 800)] as const;
    })
    .filter((entry): entry is readonly [string, AnalyticsScalar] => Boolean(entry));

  return Object.fromEntries(entries);
};

export interface AnalyticsEventInput {
  eventName: string;
  eventCategory?: string | null;
  pagePath?: string | null;
  pageUrl?: string | null;
  referrerUrl?: string | null;
  sessionId?: string | null;
  clientId?: string | null;
  eventValue?: number | null;
  properties?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AnalyticsOverview {
  windowDays: number;
  totals: {
    trackedEvents: number;
    pageViews: number;
    outboundClicks: number;
    formSubmissions: number;
    leads: number;
    attributedLeads: number;
  };
  topPages: Array<{ pagePath: string; views: number }>;
  topEvents: Array<{ eventName: string; count: number }>;
  topCampaigns: Array<{ campaign: string; leads: number }>;
}

export interface RecentAnalyticsEvent {
  id: string;
  eventName: string;
  pagePath: string | null;
  pageUrl: string | null;
  createdAt: string;
  properties: Record<string, unknown>;
}

export async function recordAnalyticsEvent(input: AnalyticsEventInput): Promise<void> {
  const eventName = cleanString(input.eventName, 80);
  if (!eventName) return;

  const eventCategory = cleanString(input.eventCategory, 80);
  const pagePath = cleanString(input.pagePath, 280);
  const pageUrl = cleanString(input.pageUrl, 2048);
  const referrerUrl = cleanString(input.referrerUrl, 2048);
  const sessionId = cleanString(input.sessionId, 120);
  const clientId = cleanString(input.clientId, 120);
  const ipAddress = cleanString(input.ipAddress, 120);
  const userAgent = cleanString(input.userAgent, 800);
  const eventValue = cleanNumber(input.eventValue);
  const properties = normalizeProperties(input.properties);

  try {
    await query(
      `
        INSERT INTO analytics_events (
          event_name,
          event_category,
          page_path,
          page_url,
          referrer_url,
          session_id,
          client_id,
          event_value,
          properties,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)
      `,
      [
        eventName,
        eventCategory,
        pagePath,
        pageUrl,
        referrerUrl,
        sessionId,
        clientId,
        eventValue,
        JSON.stringify(properties),
        ipAddress,
        userAgent
      ]
    );
  } catch (error) {
    logError('db.analytics', error, {
      action: 'recordAnalyticsEvent',
      eventName
    });
  }
}

export async function getAnalyticsOverview(windowDays = 30): Promise<AnalyticsOverview> {
  const safeWindowDays = clamp(Math.trunc(windowDays), 1, 365);

  const defaultResult: AnalyticsOverview = {
    windowDays: safeWindowDays,
    totals: {
      trackedEvents: 0,
      pageViews: 0,
      outboundClicks: 0,
      formSubmissions: 0,
      leads: 0,
      attributedLeads: 0
    },
    topPages: [],
    topEvents: [],
    topCampaigns: []
  };

  try {
    const summaryRow = await queryFirst<{
      tracked_events: number | string;
      page_views: number | string;
      outbound_clicks: number | string;
      form_submissions: number | string;
      leads: number | string;
      attributed_leads: number | string;
    }>(
      `
        SELECT
          COUNT(*)::int AS tracked_events,
          COUNT(*) FILTER (WHERE event_name = 'page_view')::int AS page_views,
          COUNT(*) FILTER (
            WHERE event_name IN ('tour_click', 'application_click', 'enrollment_click', 'cta_click', 'outbound_click')
          )::int AS outbound_clicks,
          COUNT(*) FILTER (WHERE event_name IN ('contact_submit', 'coming_soon_submit', 'form_submit'))::int AS form_submissions,
          (
            SELECT COUNT(*)::int
            FROM contact_form_submissions
            WHERE submitted_at >= NOW() - ($1::int * INTERVAL '1 day')
          ) AS leads,
          (
            SELECT COUNT(*)::int
            FROM contact_form_submissions
            WHERE submitted_at >= NOW() - ($1::int * INTERVAL '1 day')
              AND (
                COALESCE(attribution ->> 'utm_source', '') <> ''
                OR COALESCE(attribution ->> 'utm_campaign', '') <> ''
                OR COALESCE(attribution ->> 'gclid', '') <> ''
                OR COALESCE(attribution ->> 'gbraid', '') <> ''
                OR COALESCE(attribution ->> 'wbraid', '') <> ''
              )
          ) AS attributed_leads
        FROM analytics_events
        WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
      `,
      [safeWindowDays]
    );

    const toInt = (value: number | string | null | undefined): number => {
      if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
      if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed)) return parsed;
      }
      return 0;
    };

    const topPagesRows = await queryRows<{ page_path: string | null; views: number | string }>(
      `
        SELECT
          COALESCE(NULLIF(TRIM(page_path), ''), '(unknown)') AS page_path,
          COUNT(*)::int AS views
        FROM analytics_events
        WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
          AND event_name = 'page_view'
        GROUP BY 1
        ORDER BY views DESC, page_path ASC
        LIMIT 8
      `,
      [safeWindowDays]
    );

    const topEventsRows = await queryRows<{ event_name: string; count: number | string }>(
      `
        SELECT event_name, COUNT(*)::int AS count
        FROM analytics_events
        WHERE created_at >= NOW() - ($1::int * INTERVAL '1 day')
        GROUP BY event_name
        ORDER BY count DESC, event_name ASC
        LIMIT 8
      `,
      [safeWindowDays]
    );

    const topCampaignRows = await queryRows<{ campaign: string; leads: number | string }>(
      `
        SELECT
          COALESCE(NULLIF(TRIM(attribution ->> 'utm_campaign'), ''), '(direct / none)') AS campaign,
          COUNT(*)::int AS leads
        FROM contact_form_submissions
        WHERE submitted_at >= NOW() - ($1::int * INTERVAL '1 day')
        GROUP BY 1
        ORDER BY leads DESC, campaign ASC
        LIMIT 8
      `,
      [safeWindowDays]
    );

    return {
      windowDays: safeWindowDays,
      totals: {
        trackedEvents: toInt(summaryRow?.tracked_events),
        pageViews: toInt(summaryRow?.page_views),
        outboundClicks: toInt(summaryRow?.outbound_clicks),
        formSubmissions: toInt(summaryRow?.form_submissions),
        leads: toInt(summaryRow?.leads),
        attributedLeads: toInt(summaryRow?.attributed_leads)
      },
      topPages: topPagesRows.map((row) => ({
        pagePath: row.page_path || '(unknown)',
        views: toInt(row.views)
      })),
      topEvents: topEventsRows.map((row) => ({
        eventName: row.event_name,
        count: toInt(row.count)
      })),
      topCampaigns: topCampaignRows.map((row) => ({
        campaign: row.campaign,
        leads: toInt(row.leads)
      }))
    };
  } catch (error) {
    logError('db.analytics', error, { action: 'getAnalyticsOverview', windowDays: safeWindowDays });
    return defaultResult;
  }
}

export async function getRecentAnalyticsEvents(limit = 25): Promise<RecentAnalyticsEvent[]> {
  const safeLimit = clamp(Math.trunc(limit), 1, 100);

  try {
    const rows = await queryRows<{
      id: string;
      event_name: string;
      page_path: string | null;
      page_url: string | null;
      properties: Record<string, unknown> | null;
      created_at: string;
    }>(
      `
        SELECT id, event_name, page_path, page_url, properties, created_at
        FROM analytics_events
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [safeLimit]
    );

    return rows.map((row) => ({
      id: row.id,
      eventName: row.event_name,
      pagePath: row.page_path,
      pageUrl: row.page_url,
      createdAt: row.created_at,
      properties: row.properties ?? {}
    }));
  } catch (error) {
    logError('db.analytics', error, { action: 'getRecentAnalyticsEvents', limit: safeLimit });
    return [];
  }
}
