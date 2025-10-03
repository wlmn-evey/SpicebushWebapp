import { logError } from '@lib/error-logger';
import { getServiceClient } from './client';
import type { NewsletterSubscriberRow } from './types';

export interface NewsletterFilters {
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface NewsletterStats {
  total_subscribers: number;
  active_subscribers: number;
  unsubscribed_count: number;
  types_breakdown: Record<string, number>;
  recent_signups: number;
}

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export async function getNewsletterSubscribers(filters: NewsletterFilters = {}): Promise<NewsletterSubscriberRow[]> {
  const client = getServiceClient();
  let query = client
    .from('newsletter_subscribers')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('subscription_status', filters.status);
  }

  if (filters.type) {
    query = query.eq('subscription_type', filters.type);
  }

  if (typeof filters.limit === 'number') {
    query = query.limit(filters.limit);
  }

  if (typeof filters.offset === 'number') {
    const from = filters.offset;
    const to = filters.limit ? filters.offset + filters.limit - 1 : filters.offset + 99;
    query = query.range(from, to);
  }

  const { data, error } = await query;

  if (error) {
    logError('db.newsletter', error, { action: 'getNewsletterSubscribers', filters });
    return [];
  }

  return (data as NewsletterSubscriberRow[]) || [];
}

export async function getNewsletterStats(): Promise<NewsletterStats> {
  const client = getServiceClient();

  const [{ data: aggregate, error: aggregateError }, { data: breakdown, error: breakdownError }] = await Promise.all([
    client.rpc('get_newsletter_stats'),
    client
      .from('newsletter_subscribers')
      .select('subscription_type, subscription_status')
  ]);

  if (aggregateError) {
    logError('db.newsletter', aggregateError, { action: 'getNewsletterStats', stage: 'aggregate' });
  }

  if (breakdownError) {
    logError('db.newsletter', breakdownError, { action: 'getNewsletterStats', stage: 'breakdown' });
  }

  const statsRow = Array.isArray(aggregate) && aggregate.length > 0 ? (aggregate[0] as Record<string, unknown>) : {};

  const types_breakdown: Record<string, number> = {};
  (breakdown as { subscription_type: string | null; subscription_status: string }[] | null)?.forEach((row) => {
    if (row.subscription_status !== 'active') return;
    const key = row.subscription_type || 'general';
    types_breakdown[key] = (types_breakdown[key] || 0) + 1;
  });

  return {
    total_subscribers: toNumber(statsRow['total_subscribers'] ?? statsRow['total']),
    active_subscribers: toNumber(statsRow['active_subscribers'] ?? statsRow['active']),
    unsubscribed_count: toNumber(statsRow['unsubscribed_count'] ?? statsRow['unsubscribed']),
    types_breakdown,
    recent_signups: toNumber(statsRow['recent_signups'] ?? statsRow['recent'])
  };
}
