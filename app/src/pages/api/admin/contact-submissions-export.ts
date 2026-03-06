import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { db } from '@lib/db';

/** Escape a value for CSV: neutralize formula-injection prefixes, then RFC 4180 quote. */
const csvEscape = (value: string): string => {
  // Prefix formula-trigger characters to prevent spreadsheet formula injection (CWE-1236)
  let safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
};

const CSV_HEADERS = [
  'Submitted',
  'Name',
  'Email',
  'Phone',
  'Subject',
  'Message',
  'Child Age',
  'Tour Interest',
  'UTM Source',
  'UTM Medium',
  'UTM Campaign',
  'Landing Page',
  'Referrer'
];

export const GET: APIRoute = async ({ locals, url }) => {
  const { isAuthenticated, isAdmin } = await checkAdminAuth({ locals });
  if (!isAuthenticated || !isAdmin) {
    return new Response('Admin access required', { status: 403 });
  }

  const search = url.searchParams.get('q')?.trim() ?? '';
  const tourParam = url.searchParams.get('tour');
  const tourInterest =
    tourParam === 'yes' ? true : tourParam === 'no' ? false : undefined;

  // Fetch all matching submissions (hard cap 500 for safety)
  const result = await db.contact.getContactSubmissions({
    page: 1,
    pageSize: 500,
    search,
    tourInterest
  });

  const asRecord = (value: unknown): Record<string, unknown> => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  };

  const rows = result.items.map((item) => {
    const attr = asRecord(item.attribution);
    const utmSource =
      typeof attr.utm_source === 'string' ? attr.utm_source : '';
    const utmMedium =
      typeof attr.utm_medium === 'string' ? attr.utm_medium : '';
    const utmCampaign =
      typeof attr.utm_campaign === 'string' ? attr.utm_campaign : '';

    return [
      item.submitted_at,
      item.name,
      item.email,
      item.phone ?? '',
      item.subject,
      item.message,
      item.child_age ?? '',
      item.tour_interest ? 'Yes' : 'No',
      utmSource,
      utmMedium,
      utmCampaign,
      item.landing_page ?? '',
      item.referrer_url ?? ''
    ].map(csvEscape);
  });

  const csvContent = [CSV_HEADERS.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `contact-submissions-${dateStamp}.csv`;

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
};
