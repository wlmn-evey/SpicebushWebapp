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
    content: { getAllSettings: async () => ({}) },
    cache: { invalidateSettings: () => undefined }
  }
}));

vi.mock('@lib/email-service', () => ({
  emailService: { send: sendMock }
}));

vi.mock('@lib/server-logger', () => ({
  logServerWarn: () => undefined
}));

import { processDueDonationEmailJobs, scheduleDonationEmailReminder } from './donation-thank-you';

const EVENT_ID = '55555555-5555-4555-8555-555555555555';
const JOB_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const JOB_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const jobRow = (id: string) => ({
  id,
  donation_event_id: EVENT_ID,
  job_kind: 'retry',
  template_key: 'auto',
  scheduled_for: new Date('2026-10-20T12:00:00.000Z'),
  status: 'processing',
  attempt_count: 1,
  sent_at: null,
  last_error: null,
  created_by: null,
  created_at: new Date('2026-10-20T11:00:00.000Z'),
  updated_at: new Date('2026-10-20T12:00:00.000Z'),
  donation_stripe_event_id: 'evt_1',
  donor_email: 'donor@example.com',
  donor_name: 'Pat Donor',
  donation_kind: 'one-time',
  amount_cents: 5000,
  currency: 'usd'
});

const eventRow = {
  id: EVENT_ID,
  stripe_event_id: 'evt_1',
  stripe_event_type: 'checkout.session.completed',
  stripe_object_id: 'cs_1',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  donor_name: 'Pat Donor',
  donor_email: 'donor@example.com',
  amount_cents: 5000,
  currency: 'usd',
  donation_kind: 'one-time',
  source: 'stripe',
  event_created_at: new Date('2026-10-20T01:30:00.000Z'), // Oct 19, 9:30 PM EDT
  metadata: {},
  thank_you_email_status: 'pending',
  thank_you_email_sent_at: null,
  thank_you_email_error: null,
  created_at: new Date('2026-10-20T01:30:00.000Z'),
  updated_at: new Date('2026-10-20T01:30:00.000Z')
};

describe('donation email jobs', () => {
  beforeEach(() => {
    queryMock.mockReset().mockResolvedValue({ rows: [], rowCount: 1 });
    queryFirstMock.mockReset();
    queryRowsMock.mockReset().mockResolvedValue([]);
    sendMock.mockReset().mockResolvedValue({ success: true, provider: 'SendGrid' });
  });

  it('sweeps abandoned jobs and claims stale processing / retryable failed jobs', async () => {
    await processDueDonationEmailJobs();

    expect(String(queryMock.mock.calls[0][0])).toContain('UPDATE donation_email_jobs');
    const [claimSql, claimValues] = queryRowsMock.mock.calls[0] as [string, unknown[]];
    expect(claimSql).toContain("status IN ('processing', 'failed')");
    expect(claimSql).toContain('attempt_count < $2::int');
    expect(claimValues).toEqual([20, 3, 15, 24]);
  });

  it('marks a throwing job failed and still processes the rest of the batch', async () => {
    queryRowsMock.mockImplementation(async (sql: string) =>
      sql.includes('WITH due AS') ? [jobRow(JOB_A), jobRow(JOB_B)] : []
    );
    queryFirstMock
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce(eventRow);

    const result = await processDueDonationEmailJobs();

    expect(result).toEqual({ claimed: 2, processed: 2, sent: 1, failed: 1 });
    const jobUpdates = queryMock.mock.calls
      .filter(
        ([sql]) =>
          String(sql).includes('UPDATE donation_email_jobs') &&
          String(sql).includes('last_error = $4')
      )
      .map(([, values]) => (values as unknown[]).slice(0, 2));
    expect(jobUpdates).toEqual([
      [JOB_A, 'failed'],
      [JOB_B, 'sent']
    ]);

    // Donation date rendered on the school's calendar (Oct 19 ET), not UTC (Oct 20).
    const message = sendMock.mock.calls[0][0];
    expect(message.text).toContain('October 19, 2026');
  });

  it('interprets a datetime-local reminder time as Eastern', async () => {
    queryFirstMock.mockResolvedValue(eventRow);
    queryMock.mockResolvedValueOnce({ rows: [{ id: JOB_A }], rowCount: 1 });

    await scheduleDonationEmailReminder({ eventId: EVENT_ID, scheduledFor: '2026-10-21T10:00' });

    const insertValues = queryMock.mock.calls[0][1] as unknown[];
    expect(insertValues[3]).toBe('2026-10-21T14:00:00.000Z');
  });
});
