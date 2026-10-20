import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryRowsMock, logErrorMock } = vi.hoisted(() => ({
  queryRowsMock: vi.fn(),
  logErrorMock: vi.fn()
}));

vi.mock('../client', () => ({
  query: vi.fn(),
  queryFirst: vi.fn(),
  queryRows: queryRowsMock,
  withTransaction: vi.fn()
}));

vi.mock('@lib/error-logger', () => ({
  logError: logErrorMock
}));

import { getCampAdminData } from '../camp';

const SEASON_ID = '33333333-3333-4333-8333-333333333333';
const WEEK_ID = '44444444-4444-4444-8444-444444444444';

const seasonRow = {
  id: SEASON_ID,
  slug: 'summer-2027',
  name: 'Summer 2027',
  year: 2027,
  is_active: true,
  registration_open_at: new Date('2027-01-15T14:00:00.000Z'),
  registration_close_at: new Date('2027-07-31T21:00:00.000Z'),
  created_at: new Date('2026-10-01T12:00:00.000Z'),
  updated_at: new Date('2026-10-01T12:00:00.000Z')
};

const weekRow = (overrides: Record<string, unknown> = {}) => ({
  id: WEEK_ID,
  season_id: SEASON_ID,
  season_slug: 'summer-2027',
  season_name: 'Summer 2027',
  season_year: 2027,
  slug: 'week-1',
  theme_title: 'Bugs',
  summary: '',
  description: '',
  start_date: '2027-06-14',
  end_date: '2027-06-18',
  age_range_label: '',
  hours_label: '',
  price_label: '',
  capacity_total: 12,
  seats_confirmed: 2,
  seats_held: 0,
  waitlist_enabled: true,
  limited_threshold: 4,
  enrollment_url: '',
  waitlist_url: null,
  is_published: true,
  display_order: 0,
  hero_media_slug: null,
  // Week has no override; effective values come from the season via COALESCE.
  registration_open_at: null,
  registration_close_at: null,
  registration_open_at_effective: new Date('2027-01-15T14:00:00.000Z'),
  registration_close_at_effective: new Date('2027-07-31T21:00:00.000Z'),
  last_synced_at: null,
  sync_source: null,
  created_at: new Date('2026-10-01T12:00:00.000Z'),
  updated_at: new Date('2026-10-02T12:00:00.000Z'),
  ...overrides
});

const mockAdminQueries = (week: Record<string, unknown>) => {
  queryRowsMock
    .mockResolvedValueOnce([seasonRow])
    .mockResolvedValueOnce([week])
    .mockResolvedValueOnce([
      {
        id: 'adj-1',
        week_id: WEEK_ID,
        week_slug: 'week-1',
        week_title: 'Bugs',
        action: 'confirm',
        before_confirmed: 1,
        after_confirmed: 2,
        before_held: 0,
        after_held: 0,
        before_capacity: 12,
        after_capacity: 12,
        note: null,
        actor_email: null,
        created_at: new Date('2026-10-03T12:00:00.000Z')
      }
    ])
    .mockResolvedValueOnce([]); // variants
};

describe('db.camp getCampAdminData', () => {
  beforeEach(() => {
    queryRowsMock.mockReset();
    logErrorMock.mockReset();
  });

  it('exposes the raw week window separately so an inherited window stays inherited', async () => {
    mockAdminQueries(weekRow());

    const data = await getCampAdminData();
    const week = data.weeks[0];

    // Effective (season fallback) for status/display...
    expect(week.registrationOpenAt).toBe('2027-01-15T14:00:00.000Z');
    expect(week.registrationCloseAt).toBe('2027-07-31T21:00:00.000Z');
    // ...but the week's own values stay null, so the edit form pre-fills blank (inherit).
    expect(week.weekRegistrationOpenAt).toBeNull();
    expect(week.weekRegistrationCloseAt).toBeNull();

    const weekSql = String(queryRowsMock.mock.calls[1][0]);
    expect(weekSql).toContain('cw.registration_open_at,');
    expect(weekSql).toContain(
      'COALESCE(cw.registration_open_at, cs.registration_open_at) AS registration_open_at_effective'
    );
  });

  it('returns the week override when the week has its own window', async () => {
    mockAdminQueries(
      weekRow({
        registration_open_at: new Date('2027-02-01T14:00:00.000Z'),
        registration_open_at_effective: new Date('2027-02-01T14:00:00.000Z')
      })
    );

    const week = (await getCampAdminData()).weeks[0];
    expect(week.weekRegistrationOpenAt).toBe('2027-02-01T14:00:00.000Z');
    expect(week.registrationOpenAt).toBe('2027-02-01T14:00:00.000Z');
    expect(week.weekRegistrationCloseAt).toBeNull();
  });

  it('normalizes Date-valued timestamps to ISO strings', async () => {
    mockAdminQueries(weekRow());

    const data = await getCampAdminData();
    expect(data.seasons[0]).toMatchObject({
      registrationOpenAt: '2027-01-15T14:00:00.000Z',
      createdAt: '2026-10-01T12:00:00.000Z'
    });
    expect(data.weeks[0].updatedAt).toBe('2026-10-02T12:00:00.000Z');
    expect(data.recentAdjustments[0].createdAt).toBe('2026-10-03T12:00:00.000Z');
  });
});
