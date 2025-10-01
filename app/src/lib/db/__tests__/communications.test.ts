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
  getCommunicationStats,
  getRecentMessages,
  getTemplates
} from '../communications';

describe('db.communications facade', () => {
  beforeEach(() => {
    logErrorMock.mockClear();
    serviceClientMock.reset();
  });

  it('returns recent messages ordered by creation date and limited by the requested amount', async () => {
    serviceClientMock.setTableResponses('communications_messages', [
      {
        data: [
          { id: '1', created_at: '2024-02-01', sent_at: null },
          { id: '2', created_at: '2024-01-01', sent_at: '2024-01-02' }
        ],
        error: null
      }
    ]);

    const messages = await getRecentMessages(5);
    expect(messages).toHaveLength(2);
    expect(serviceClientMock.client.from).toHaveBeenCalledWith('communications_messages');

    const operations = serviceClientMock.getTableExecutions('communications_messages')[0]?.operations ?? [];
    expect(operations.map((op) => op.method)).toEqual(['select', 'order', 'limit']);
    expect(operations[2]?.args[0]).toBe(5);
  });

  it('computes communication stats from the last 30 days', async () => {
    serviceClientMock.setTableResponses('communications_messages', [
      {
        data: [
          {
            id: '1',
            status: 'sent',
            delivery_stats: { open_rate: 0.73, total_recipients: 30 },
            recipient_count: 28,
            sent_at: '2024-02-01T00:00:00Z',
            scheduled_for: null,
            created_at: '2024-02-01T00:00:00Z'
          },
          {
            id: '2',
            status: 'scheduled',
            delivery_stats: { openRate: 0.95, total_recipients: 20 },
            recipient_count: null,
            sent_at: null,
            scheduled_for: '2024-02-05T00:00:00Z',
            created_at: '2024-02-04T00:00:00Z'
          }
        ],
        error: null
      }
    ]);

    const stats = await getCommunicationStats();

    expect(stats).toEqual({
      families_reached: 48,
      messages_sent: 1,
      avg_open_rate: 0.84,
      active_campaigns: 1
    });

    const operations = serviceClientMock.getTableExecutions('communications_messages')[0]?.operations ?? [];
    expect(operations.map((op) => op.method)).toEqual(['select', 'gte']);
  });

  it('falls back to safe defaults when the query fails', async () => {
    serviceClientMock.setTableResponses('communications_messages', [
      { data: null, error: new Error('db unavailable') }
    ]);

    const stats = await getCommunicationStats();
    expect(stats).toEqual({
      families_reached: 47,
      messages_sent: 12,
      avg_open_rate: 89,
      active_campaigns: 3
    });
    expect(logErrorMock).toHaveBeenCalledTimes(1);
  });

  it('retrieves templates ordered by usage and name', async () => {
    serviceClientMock.setTableResponses('communications_templates', [
      {
        data: [
          { id: 'a', name: 'Update', usage_count: 5 },
          { id: 'b', name: 'Reminder', usage_count: 3 }
        ],
        error: null
      }
    ]);

    const templates = await getTemplates();
    expect(templates).toHaveLength(2);
    expect(serviceClientMock.client.from).toHaveBeenCalledWith('communications_templates');

    const operations = serviceClientMock.getTableExecutions('communications_templates')[0]?.operations ?? [];
    expect(operations.map((op) => op.method)).toEqual(['select', 'order', 'order']);
  });
});
