import { logError } from '@lib/error-logger';
import { query, queryRows } from './client';

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const asAmount = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return Number.NaN;
};

const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

export interface AdSpendInput {
  spendDate: string;
  channel: string;
  campaign: string;
  amount: number;
  currency?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
}

export interface AdSpendEntryView {
  id: string;
  spendDate: string;
  channel: string;
  campaign: string;
  amount: number;
  currency: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface AdSpendSummary {
  windowDays: number;
  totalSpend: number;
  entryCount: number;
  byChannel: Array<{ channel: string; spend: number }>;
}

export interface CampaignValueRow {
  campaign: string;
  spend: number;
  leads: number;
  costPerLead: number | null;
}

const normalizeCurrency = (value: unknown): string => {
  const raw = asString(value, 'USD').toUpperCase();
  return raw.slice(0, 8) || 'USD';
};

const normalizeInput = (input: AdSpendInput): AdSpendInput | null => {
  const spendDate = asString(input.spendDate);
  const channel = asString(input.channel);
  const campaign = asString(input.campaign);
  const amount = asAmount(input.amount);
  const currency = normalizeCurrency(input.currency);
  const notes = asString(input.notes ?? '', '');

  if (!isIsoDate(spendDate)) return null;
  if (channel.length < 2) return null;
  if (campaign.length < 2) return null;
  if (!Number.isFinite(amount) || amount < 0) return null;

  return {
    spendDate,
    channel: channel.slice(0, 120),
    campaign: campaign.slice(0, 160),
    amount: Math.round(amount * 100) / 100,
    currency,
    notes: notes ? notes.slice(0, 1200) : '',
    metadata: input.metadata ?? {},
    createdBy: asString(input.createdBy ?? '', '') || null
  };
};

export async function insertAdSpendEntries(entries: AdSpendInput[]): Promise<number> {
  if (!Array.isArray(entries) || entries.length === 0) return 0;

  let insertedCount = 0;

  for (const rawEntry of entries) {
    const entry = normalizeInput(rawEntry);
    if (!entry) continue;

    try {
      await query(
        `
          INSERT INTO ad_spend_entries (
            spend_date,
            channel,
            campaign,
            amount,
            currency,
            notes,
            metadata,
            created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
        `,
        [
          entry.spendDate,
          entry.channel,
          entry.campaign,
          entry.amount,
          entry.currency,
          entry.notes || null,
          JSON.stringify(entry.metadata ?? {}),
          entry.createdBy
        ]
      );
      insertedCount += 1;
    } catch (error) {
      logError('db.ad-spend', error, {
        action: 'insertAdSpendEntries',
        campaign: entry.campaign
      });
    }
  }

  return insertedCount;
}

export async function deleteAdSpendEntry(id: string): Promise<boolean> {
  const trimmedId = asString(id);
  if (!trimmedId) return false;

  try {
    const result = await query(
      `
        DELETE FROM ad_spend_entries
        WHERE id = $1
      `,
      [trimmedId]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    logError('db.ad-spend', error, { action: 'deleteAdSpendEntry' });
    return false;
  }
}

export async function getRecentAdSpendEntries(limit = 30): Promise<AdSpendEntryView[]> {
  const safeLimit = clamp(Math.trunc(limit), 1, 200);

  try {
    const rows = await queryRows<{
      id: string;
      spend_date: string;
      channel: string;
      campaign: string;
      amount: number | string;
      currency: string;
      notes: string | null;
      created_by: string | null;
      created_at: string;
    }>(
      `
        SELECT
          id,
          spend_date::text AS spend_date,
          channel,
          campaign,
          amount::text AS amount,
          currency,
          notes,
          created_by,
          created_at
        FROM ad_spend_entries
        ORDER BY spend_date DESC, created_at DESC
        LIMIT $1
      `,
      [safeLimit]
    );

    return rows.map((row) => ({
      id: row.id,
      spendDate: row.spend_date,
      channel: row.channel,
      campaign: row.campaign,
      amount: asAmount(row.amount),
      currency: row.currency,
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at
    }));
  } catch (error) {
    logError('db.ad-spend', error, { action: 'getRecentAdSpendEntries' });
    return [];
  }
}

export async function getAdSpendSummary(windowDays = 30): Promise<AdSpendSummary> {
  const safeWindowDays = clamp(Math.trunc(windowDays), 1, 365);
  const defaultSummary: AdSpendSummary = {
    windowDays: safeWindowDays,
    totalSpend: 0,
    entryCount: 0,
    byChannel: []
  };

  try {
    const totalRows = await queryRows<{ total_spend: number | string; entry_count: number | string }>(
      `
        SELECT
          COALESCE(SUM(amount), 0)::text AS total_spend,
          COUNT(*)::int AS entry_count
        FROM ad_spend_entries
        WHERE spend_date >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
      `,
      [safeWindowDays]
    );

    const channelRows = await queryRows<{ channel: string; spend: number | string }>(
      `
        SELECT
          channel,
          COALESCE(SUM(amount), 0)::text AS spend
        FROM ad_spend_entries
        WHERE spend_date >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
        GROUP BY channel
        ORDER BY SUM(amount) DESC, channel ASC
      `,
      [safeWindowDays]
    );

    const totalRow = totalRows[0];
    return {
      windowDays: safeWindowDays,
      totalSpend: asAmount(totalRow?.total_spend),
      entryCount: Number.parseInt(String(totalRow?.entry_count ?? 0), 10) || 0,
      byChannel: channelRows.map((row) => ({
        channel: row.channel,
        spend: asAmount(row.spend)
      }))
    };
  } catch (error) {
    logError('db.ad-spend', error, { action: 'getAdSpendSummary', windowDays: safeWindowDays });
    return defaultSummary;
  }
}

export async function getCampaignValueRows(windowDays = 30): Promise<CampaignValueRow[]> {
  const safeWindowDays = clamp(Math.trunc(windowDays), 1, 365);

  try {
    const rows = await queryRows<{
      campaign: string;
      spend: number | string;
      leads: number | string;
      cost_per_lead: number | string | null;
    }>(
      `
        WITH spend AS (
          SELECT
            COALESCE(NULLIF(TRIM(campaign), ''), '(direct / none)') AS campaign,
            COALESCE(SUM(amount), 0)::numeric AS spend
          FROM ad_spend_entries
          WHERE spend_date >= CURRENT_DATE - (($1::int - 1) * INTERVAL '1 day')
          GROUP BY 1
        ),
        leads AS (
          SELECT
            COALESCE(NULLIF(TRIM(attribution ->> 'utm_campaign'), ''), '(direct / none)') AS campaign,
            COUNT(*)::int AS leads
          FROM contact_form_submissions
          WHERE submitted_at >= NOW() - ($1::int * INTERVAL '1 day')
          GROUP BY 1
        )
        SELECT
          COALESCE(spend.campaign, leads.campaign) AS campaign,
          COALESCE(spend.spend, 0)::text AS spend,
          COALESCE(leads.leads, 0)::int AS leads,
          CASE
            WHEN COALESCE(leads.leads, 0) > 0 THEN ROUND(COALESCE(spend.spend, 0) / leads.leads, 2)::text
            ELSE NULL
          END AS cost_per_lead
        FROM spend
        FULL OUTER JOIN leads ON spend.campaign = leads.campaign
        ORDER BY COALESCE(spend.spend, 0) DESC, COALESCE(leads.leads, 0) DESC, campaign ASC
        LIMIT 24
      `,
      [safeWindowDays]
    );

    return rows.map((row) => ({
      campaign: row.campaign,
      spend: asAmount(row.spend),
      leads: Number.parseInt(String(row.leads), 10) || 0,
      costPerLead: row.cost_per_lead === null ? null : asAmount(row.cost_per_lead)
    }));
  } catch (error) {
    logError('db.ad-spend', error, { action: 'getCampaignValueRows', windowDays: safeWindowDays });
    return [];
  }
}
