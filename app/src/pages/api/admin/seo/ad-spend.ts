import type { APIRoute } from 'astro';
import { parse } from 'csv-parse/sync';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { db } from '@lib/db';

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const parseRedirectPath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
};

const asString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const asAmount = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,\s]/g, '');
    const parsed = Number.parseFloat(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.NaN;
};

const parseCsvEntries = (csvText: string, createdBy: string | null) => {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as Array<Record<string, unknown>>;

  return records.map((row) => {
    const spendDate = asString(row.spend_date) || asString(row.date) || asString(row.spendDate);
    const channel = asString(row.channel) || asString(row.platform);
    const campaign = asString(row.campaign) || asString(row.campaign_name);
    const amount = asAmount(row.amount) || asAmount(row.spend);
    const currency = asString(row.currency) || 'USD';
    const notes = asString(row.notes);

    return {
      spendDate,
      channel,
      campaign,
      amount,
      currency,
      notes,
      metadata: {
        imported: true
      },
      createdBy
    };
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { isAuthenticated, isAdmin, user } = await checkAdminAuth({ locals });
  if (!isAuthenticated || !isAdmin) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const payload = await request.json() as Record<string, unknown>;
      const entries = Array.isArray(payload.entries) ? payload.entries : [];

      const normalized = entries.map((entry) => {
        const row = entry as Record<string, unknown>;
        return {
          spendDate: asString(row.spendDate),
          channel: asString(row.channel),
          campaign: asString(row.campaign),
          amount: asAmount(row.amount),
          currency: asString(row.currency) || 'USD',
          notes: asString(row.notes),
          metadata: {},
          createdBy: user?.email ?? null
        };
      });

      const inserted = await db.adSpend.insertAdSpendEntries(normalized);
      return jsonResponse({ success: true, inserted });
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }
  }

  try {
    const formData = await request.formData();
    const action = asString(formData.get('action'));
    const redirectTo = parseRedirectPath(formData.get('redirectTo'));
    const createdBy = user?.email ?? null;

    if (action === 'delete') {
      const entryId = asString(formData.get('entryId'));
      const deleted = await db.adSpend.deleteAdSpendEntry(entryId);
      if (!deleted) {
        const failureTarget = redirectTo ? `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}error=delete-failed` : null;
        if (failureTarget) {
          return new Response(null, { status: 303, headers: { Location: failureTarget } });
        }
        return jsonResponse({ error: 'Failed to delete entry' }, 500);
      }

      if (redirectTo) {
        const target = `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}saved=ad_spend_deleted`;
        return new Response(null, { status: 303, headers: { Location: target } });
      }
      return jsonResponse({ success: true, deleted: true });
    }

    const csvData = asString(formData.get('csvData'));
    if (csvData.length > 0) {
      const parsedEntries = parseCsvEntries(csvData, createdBy);
      const inserted = await db.adSpend.insertAdSpendEntries(parsedEntries);

      if (redirectTo) {
        const target = `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}saved=ad_spend_imported_${inserted}`;
        return new Response(null, { status: 303, headers: { Location: target } });
      }

      return jsonResponse({ success: true, inserted });
    }

    const singleEntry = {
      spendDate: asString(formData.get('spendDate')),
      channel: asString(formData.get('channel')),
      campaign: asString(formData.get('campaign')),
      amount: asAmount(formData.get('amount')),
      currency: asString(formData.get('currency')) || 'USD',
      notes: asString(formData.get('notes')),
      metadata: {},
      createdBy
    };

    const inserted = await db.adSpend.insertAdSpendEntries([singleEntry]);
    if (inserted === 0) {
      const failureTarget = redirectTo ? `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}error=ad_spend_invalid` : null;
      if (failureTarget) {
        return new Response(null, { status: 303, headers: { Location: failureTarget } });
      }
      return jsonResponse({ error: 'No valid ad spend entry submitted' }, 400);
    }

    if (redirectTo) {
      const target = `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}saved=ad_spend_added`;
      return new Response(null, { status: 303, headers: { Location: target } });
    }

    return jsonResponse({ success: true, inserted });
  } catch {
    return jsonResponse({ error: 'Failed to process ad spend update' }, 500);
  }
};

export const GET: APIRoute = async ({ locals, url }) => {
  const { isAuthenticated, isAdmin } = await checkAdminAuth({ locals });
  if (!isAuthenticated || !isAdmin) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  const rawWindow = url.searchParams.get('window');
  const parsedWindow = rawWindow ? Number.parseInt(rawWindow, 10) : 30;
  const windowDays = [7, 30, 90].includes(parsedWindow) ? parsedWindow : 30;

  const [summary, campaigns, recent] = await Promise.all([
    db.adSpend.getAdSpendSummary(windowDays),
    db.adSpend.getCampaignValueRows(windowDays),
    db.adSpend.getRecentAdSpendEntries(20)
  ]);

  return jsonResponse({
    summary,
    campaigns,
    recent
  });
};
