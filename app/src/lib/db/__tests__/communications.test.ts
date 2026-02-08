import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logErrorMock, queryRowsMock } = vi.hoisted(() => ({
  logErrorMock: vi.fn(),
  queryRowsMock: vi.fn()
}));

vi.mock('../client', () => ({
  queryRows: queryRowsMock
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
    queryRowsMock.mockReset();
  });

  it('returns recent messages ordered by creation date and limited by the requested amount', async () => {
    queryRowsMock.mockResolvedValueOnce([
      { id: '1', created_at: '2024-02-01', sent_at: null },
      { id: '2', created_at: '2024-01-01', sent_at: '2024-01-02' }
    ]);

    const messages = await getRecentMessages(5);
    expect(messages).toHaveLength(2);
    expect(queryRowsMock).toHaveBeenCalledWith(expect.stringContaining('FROM communications_messages'), [5]);
  });

  it('computes communication stats from the last 30 days', async () => {
    queryRowsMock.mockResolvedValueOnce([
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
    ]);

    const stats = await getCommunicationStats();

    expect(stats).toEqual({
      families_reached: 48,
      messages_sent: 1,
      avg_open_rate: 0.84,
      active_campaigns: 1
    });
    expect(queryRowsMock).toHaveBeenCalledWith(
      expect.stringContaining('WHERE created_at >= $1'),
      expect.any(Array)
    );
  });

  it('falls back to safe defaults when the query fails', async () => {
    queryRowsMock.mockRejectedValueOnce(new Error('db unavailable'));

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
    queryRowsMock.mockResolvedValueOnce([
      { id: 'a', name: 'Update', usage_count: 5 },
      { id: 'b', name: 'Reminder', usage_count: 3 }
    ]);

    const templates = await getTemplates();
    expect(templates).toHaveLength(2);
    expect(queryRowsMock).toHaveBeenCalledWith(expect.stringContaining('FROM communications_templates'));
  });
});
