import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, queryRowsMock, logErrorMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryRowsMock: vi.fn(),
  logErrorMock: vi.fn()
}));

vi.mock('../client', () => ({
  query: queryMock,
  queryRows: queryRowsMock
}));

vi.mock('@lib/error-logger', () => ({
  logError: logErrorMock
}));

import {
  createSchoolAnnouncement,
  getAnnouncementAdminData,
  getScheduleExceptionsInRange,
  updateScheduleException,
  updateSchoolAnnouncement
} from '../announcements';

const ANNOUNCEMENT_ID = '11111111-1111-4111-8111-111111111111';

// What `pg` really returns without custom type parsers: Date objects for DATE/TIMESTAMPTZ.
const announcementRowWithDates = {
  id: ANNOUNCEMENT_ID,
  title: 'Picture day',
  message: 'Wear a smile',
  severity: 'reminder',
  audience: 'families',
  placement: 'global',
  cta_label: null,
  cta_url: null,
  starts_at: new Date('2026-10-20T12:00:00.000Z'),
  ends_at: new Date('2026-10-21T21:00:00.000Z'),
  is_published: true,
  created_by: 'admin@example.com',
  created_at: new Date('2026-10-01T15:30:00.000Z'),
  updated_at: new Date('2026-10-02T15:30:00.000Z')
};

const exceptionRowWithDates = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'Teacher work day',
  reason: null,
  // pg builds DATE values at LOCAL midnight.
  start_date: new Date(2026, 10, 3),
  end_date: new Date(2026, 10, 4),
  exception_type: 'closed',
  open_time_decimal: null,
  close_time_decimal: null,
  before_care_offset: null,
  after_care_offset: null,
  linked_announcement_id: null,
  linked_announcement_title: null,
  is_published: true,
  created_by: null,
  created_at: new Date('2026-10-01T15:30:00.000Z'),
  updated_at: new Date('2026-10-01T15:30:00.000Z')
};

describe('db.announcements date handling', () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryRowsMock.mockReset();
    logErrorMock.mockReset();
  });

  it('casts DATE columns to text and TIMESTAMPTZ columns to ISO strings in SQL', async () => {
    queryRowsMock.mockResolvedValue([]);
    await getAnnouncementAdminData();
    await getScheduleExceptionsInRange('2026-10-01', '2026-10-31');

    const sqls = queryRowsMock.mock.calls.map(call => String(call[0]));
    const announcementSql = sqls.find(sql => sql.includes('FROM school_announcements\n'))!;
    expect(announcementSql).toContain(
      `to_char(starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS starts_at`
    );
    expect(announcementSql).toContain('AS ends_at');

    for (const sql of sqls.filter(text => text.includes('FROM school_schedule_exceptions'))) {
      expect(sql).toContain('se.start_date::text AS start_date');
      expect(sql).toContain('se.end_date::text AS end_date');
    }
  });

  it('maps Date-valued rows to strings instead of blanking them', async () => {
    queryRowsMock
      .mockResolvedValueOnce([announcementRowWithDates])
      .mockResolvedValueOnce([exceptionRowWithDates]);

    const data = await getAnnouncementAdminData();

    expect(data.announcements[0]).toMatchObject({
      startsAt: '2026-10-20T12:00:00.000Z',
      endsAt: '2026-10-21T21:00:00.000Z',
      createdAt: '2026-10-01T15:30:00.000Z',
      updatedAt: '2026-10-02T15:30:00.000Z'
    });
    expect(data.scheduleExceptions[0]).toMatchObject({
      startDate: '2026-11-03',
      endDate: '2026-11-04',
      createdAt: '2026-10-01T15:30:00.000Z'
    });
  });

  it('passes text-cast rows (the production path) through unchanged', async () => {
    queryRowsMock
      .mockResolvedValueOnce([
        {
          ...announcementRowWithDates,
          starts_at: '2026-10-20T12:00:00.000Z',
          ends_at: null,
          created_at: '2026-10-01T15:30:00.000Z',
          updated_at: '2026-10-01T15:30:00.000Z'
        }
      ])
      .mockResolvedValueOnce([
        { ...exceptionRowWithDates, start_date: '2026-11-03', end_date: '2026-11-04' }
      ]);

    const data = await getAnnouncementAdminData();
    expect(data.announcements[0].startsAt).toBe('2026-10-20T12:00:00.000Z');
    expect(data.announcements[0].endsAt).toBeNull();
    expect(data.scheduleExceptions[0].startDate).toBe('2026-11-03');
  });

  it('interprets datetime-local input as Eastern time when saving (not UTC)', async () => {
    queryMock.mockResolvedValue({ rowCount: 1, rows: [{ id: ANNOUNCEMENT_ID }] });

    await updateSchoolAnnouncement(ANNOUNCEMENT_ID, {
      title: 'Picture day',
      message: 'Wear a smile',
      startsAt: '2026-10-20T08:00', // 8:00 AM EDT
      endsAt: '2026-12-01T17:00' // 5:00 PM EST
    });

    const values = queryMock.mock.calls[0][1] as unknown[];
    expect(values[8]).toBe('2026-10-20T12:00:00.000Z');
    expect(values[9]).toBe('2026-12-01T22:00:00.000Z');
  });

  it('keeps an already-zoned ISO timestamp as the same instant and never NULLs a Date', async () => {
    queryMock.mockResolvedValue({ rowCount: 1, rows: [{ id: ANNOUNCEMENT_ID }] });

    await createSchoolAnnouncement({
      title: 'Picture day',
      message: 'Wear a smile',
      startsAt: '2026-10-20T12:00:00.000Z',
      endsAt: new Date('2026-10-21T21:00:00.000Z') as unknown as string
    });

    const values = queryMock.mock.calls[0][1] as unknown[];
    expect(values[7]).toBe('2026-10-20T12:00:00.000Z');
    expect(values[8]).toBe('2026-10-21T21:00:00.000Z');
  });

  it('re-saving a schedule exception from loaded data succeeds', async () => {
    queryRowsMock.mockResolvedValueOnce([]).mockResolvedValueOnce([exceptionRowWithDates]);
    queryMock.mockResolvedValue({ rowCount: 1, rows: [] });

    const { scheduleExceptions } = await getAnnouncementAdminData();
    const loaded = scheduleExceptions[0];
    const ok = await updateScheduleException(loaded.id, {
      title: loaded.title,
      startDate: loaded.startDate,
      endDate: loaded.endDate,
      exceptionType: loaded.exceptionType
    });

    expect(ok).toBe(true);
    const values = queryMock.mock.calls[0][1] as unknown[];
    expect(values[3]).toBe('2026-11-03');
    expect(values[4]).toBe('2026-11-04');
  });
});
