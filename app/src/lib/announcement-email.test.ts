import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, queryFirstMock, queryRowsMock, sendMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryFirstMock: vi.fn(),
  queryRowsMock: vi.fn(),
  sendMock: vi.fn()
}));

vi.mock('@lib/db/client', () => ({
  query: queryMock,
  queryFirst: queryFirstMock,
  queryRows: queryRowsMock
}));

vi.mock('@lib/db', () => ({
  db: {
    content: {
      getAllSettings: async () => ({
        announcement_email_recipients: 'a@example.com, b@example.com'
      })
    },
    cache: { invalidateSettings: () => undefined }
  }
}));

vi.mock('@lib/email-service', () => ({
  emailService: { send: sendMock }
}));

vi.mock('@lib/server-logger', () => ({
  logServerWarn: vi.fn()
}));

import {
  processDueAnnouncementEmailJobs,
  scheduleAnnouncementEmailReminder,
  sendAnnouncementEmailNow
} from './announcement-email';

const ANNOUNCEMENT_ID = '11111111-1111-4111-8111-111111111111';
const JOB_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const JOB_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const announcementRow = {
  id: ANNOUNCEMENT_ID,
  title: 'Picture day',
  message: 'Wear a smile',
  severity: 'info',
  placement: 'global',
  cta_label: null,
  cta_url: null,
  starts_at: '2026-10-20T12:00:00.000Z', // 8:00 AM EDT
  ends_at: null,
  is_published: true
};

const jobRow = (id: string) => ({
  id,
  announcement_id: ANNOUNCEMENT_ID,
  announcement_title: 'Picture day',
  job_kind: 'reminder',
  template_key: 'auto',
  recipients: ['a@example.com', 'b@example.com'],
  // Real pg output: a Date, not a string.
  scheduled_for: new Date('2026-10-20T12:00:00.000Z'),
  status: 'processing',
  attempt_count: 1,
  sent_count: 0,
  sent_at: null,
  last_error: null,
  created_by: null,
  created_at: new Date('2026-10-19T12:00:00.000Z'),
  updated_at: new Date('2026-10-20T12:00:00.000Z')
});

describe('announcement email delivery', () => {
  beforeEach(() => {
    queryMock.mockReset().mockResolvedValue({ rows: [], rowCount: 1 });
    queryFirstMock.mockReset();
    queryRowsMock.mockReset().mockResolvedValue([]);
    sendMock.mockReset().mockResolvedValue({ success: true, provider: 'SendGrid' });
  });

  it('sends one copy per recipient and shows times in Eastern', async () => {
    queryFirstMock.mockResolvedValue(announcementRow);

    const result = await sendAnnouncementEmailNow({ announcementId: ANNOUNCEMENT_ID });

    expect(result.success).toBe(true);
    const message = sendMock.mock.calls[0][0];
    expect(message.individualRecipients).toBe(true);
    expect(message.to).toEqual(['a@example.com', 'b@example.com']);
    // 12:00Z is 8:00 AM EDT — not "12:00 PM" (UTC).
    expect(message.text).toContain('Tuesday, October 20, 2026 at 8:00');
    expect(message.text).not.toContain('12:00');

    const loadSql = String(queryFirstMock.mock.calls[0][0]);
    expect(loadSql).toContain(`to_char(starts_at AT TIME ZONE 'UTC'`);
  });

  it('schedules reminders from datetime-local input as Eastern time', async () => {
    queryFirstMock.mockResolvedValue(announcementRow);
    queryMock.mockResolvedValueOnce({ rows: [{ id: JOB_A }], rowCount: 1 });

    await scheduleAnnouncementEmailReminder({
      announcementId: ANNOUNCEMENT_ID,
      scheduledFor: '2026-11-02T09:00' // 9:00 AM EST (day after fall-back)
    });

    const insertValues = queryMock.mock.calls[0][1] as unknown[];
    expect(insertValues[4]).toBe('2026-11-02T14:00:00.000Z');
  });

  it('claims stale processing and retryable failed jobs, and sweeps abandoned ones', async () => {
    await processDueAnnouncementEmailJobs();

    const sweepSql = String(queryMock.mock.calls[0][0]);
    expect(sweepSql).toContain('UPDATE announcement_email_jobs');
    expect(sweepSql).toContain("WHERE status = 'processing'");
    expect(queryMock.mock.calls[0][1]).toEqual([3, 15, 24]);

    const [claimSql, claimValues] = queryRowsMock.mock.calls[0] as [string, unknown[]];
    expect(claimSql).toContain("status = 'scheduled' AND scheduled_for <= NOW()");
    expect(claimSql).toContain("status IN ('processing', 'failed')");
    expect(claimSql).toContain('attempt_count < $2::int');
    expect(claimSql).toContain("updated_at <= NOW() - ($3::int * INTERVAL '1 minute')");
    expect(claimSql).toContain('FOR UPDATE SKIP LOCKED');
    expect(claimValues).toEqual([20, 3, 15, 24]);
  });

  it('keeps processing the batch when one job throws, marking it failed', async () => {
    queryRowsMock.mockResolvedValueOnce([jobRow(JOB_A), jobRow(JOB_B)]);
    queryFirstMock
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce(announcementRow);

    const result = await processDueAnnouncementEmailJobs();

    expect(result).toEqual({ claimed: 2, processed: 2, sent: 1, failed: 1 });

    const jobUpdates = queryMock.mock.calls.filter(
      ([sql]) =>
        String(sql).includes('UPDATE announcement_email_jobs') && String(sql).includes('$5')
    );
    expect(jobUpdates.map(([, values]) => (values as unknown[]).slice(0, 2))).toEqual([
      [JOB_A, 'failed'],
      [JOB_B, 'sent']
    ]);
    expect((jobUpdates[0][1] as unknown[])[4]).toBe('connection reset');

    // The Date-valued scheduled_for survived as an ISO string into the message log.
    const logInsert = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO communications_messages')
    );
    expect((logInsert?.[1] as unknown[])[3]).toBe('2026-10-20T12:00:00.000Z');
  });
});
