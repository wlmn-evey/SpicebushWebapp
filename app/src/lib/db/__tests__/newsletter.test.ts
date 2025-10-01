import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockSupabaseClient } from '@/test/utils/mockSupabaseClient';

const logErrorMock = vi.fn();
const serviceClientMock = createMockSupabaseClient();

vi.mock('../client', () => ({
  getServiceClient: () => serviceClientMock.client,
  withServiceClient: async (callback: (client: unknown) => Promise<unknown>) => callback(serviceClientMock.client),
  getPublicClient: vi.fn()
}));

vi.mock('@lib/error-logger', () => ({
  logError: logErrorMock
}));

import {
  getNewsletterStats,
  getNewsletterSubscribers
} from '../newsletter';

describe('db.newsletter facade', () => {
  beforeEach(() => {
    logErrorMock.mockClear();
    serviceClientMock.reset();
  });

  it('applies filters and pagination when fetching subscribers', async () => {
    serviceClientMock.setTableResponses('newsletter_subscribers', [
      {
        data: [
          { id: '1', email: 'first@example.com' }
        ],
        error: null
      }
    ]);

    const subscribers = await getNewsletterSubscribers({
      status: 'active',
      type: 'general',
      limit: 25,
      offset: 50
    });

    expect(subscribers).toHaveLength(1);
    const calls = serviceClientMock.getTableExecutions('newsletter_subscribers')[0]?.operations ?? [];
    expect(calls.map((op) => op.method)).toEqual(['select', 'eq', 'eq', 'limit', 'range']);
    expect(calls[4]?.args).toEqual([50, 74]);
  });

  it('combines aggregate stats and active breakdown for newsletter analytics', async () => {
    serviceClientMock.setRpcResponses('get_newsletter_stats', [
      {
        data: [
          {
            total_subscribers: 120,
            active_subscribers: 95,
            unsubscribed_count: 10,
            recent_signups: 8
          }
        ],
        error: null
      }
    ]);

    serviceClientMock.setTableResponses('newsletter_subscribers', [
      {
        data: [
          { subscription_type: 'general', subscription_status: 'active' },
          { subscription_type: null, subscription_status: 'active' },
          { subscription_type: 'staff', subscription_status: 'inactive' }
        ],
        error: null
      }
    ]);

    const stats = await getNewsletterStats();

    expect(stats).toEqual({
      total_subscribers: 120,
      active_subscribers: 95,
      unsubscribed_count: 10,
      recent_signups: 8,
      types_breakdown: {
        general: 2
      }
    });

    expect(serviceClientMock.getRpcExecutions('get_newsletter_stats')).toHaveLength(1);
    const breakdownOps = serviceClientMock.getTableExecutions('newsletter_subscribers')[0]?.operations ?? [];
    expect(breakdownOps.map((op) => op.method)).toEqual(['select']);
  });

  it('logs errors and returns zeroed stats when both queries fail', async () => {
    serviceClientMock.setRpcResponses('get_newsletter_stats', [
      { data: null, error: new Error('rpc failure') }
    ]);

    serviceClientMock.setTableResponses('newsletter_subscribers', [
      { data: null, error: new Error('select failure') }
    ]);

    const stats = await getNewsletterStats();

    expect(stats).toEqual({
      total_subscribers: 0,
      active_subscribers: 0,
      unsubscribed_count: 0,
      types_breakdown: {},
      recent_signups: 0
    });

    expect(logErrorMock).toHaveBeenCalledTimes(2);
  });

  it('returns an empty list when the subscriber query errors', async () => {
    serviceClientMock.setTableResponses('newsletter_subscribers', [
      { data: null, error: new Error('read failure') }
    ]);

    const subscribers = await getNewsletterSubscribers();
    expect(subscribers).toEqual([]);
    expect(logErrorMock).toHaveBeenCalledTimes(1);
  });
});
