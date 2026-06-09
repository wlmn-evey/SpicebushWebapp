import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryRowsMock, queryMock } = vi.hoisted(() => ({
  queryRowsMock: vi.fn(),
  queryMock: vi.fn()
}));

vi.mock('@lib/db/client', () => ({
  queryRows: queryRowsMock,
  query: queryMock
}));

import { publishDueScheduledPosts } from './blog-scheduled-publish';

const NOW = Date.parse('2024-06-01T12:00:00Z');
const DUE = '2024-06-01T09:00:00Z'; // before NOW
const FUTURE = '2024-12-31T09:00:00Z'; // after NOW

beforeEach(() => {
  queryRowsMock.mockReset();
  queryMock.mockReset();
  queryMock.mockResolvedValue({ rowCount: 1 });
});

describe('publishDueScheduledPosts', () => {
  it('flips only DUE rows and reports a per-bucket summary', async () => {
    queryRowsMock.mockResolvedValueOnce([
      { slug: 'due-one', published_at: DUE },
      { slug: 'future-one', published_at: FUTURE },
      { slug: 'due-two', published_at: '2024-06-01T11:59:59Z' }
    ]);

    const summary = await publishDueScheduledPosts({ now: NOW });

    expect(summary.scannedScheduled).toBe(3);
    expect(summary.published.sort()).toEqual(['due-one', 'due-two']);
    expect(summary.notYetDue).toBe(1);
    expect(summary.skippedMalformed).toBe(0);

    // Only the two due rows are UPDATEd; the future row is never touched.
    expect(queryMock).toHaveBeenCalledTimes(2);
    const updatedSlugs = queryMock.mock.calls.map(call => call[1][0]).sort();
    expect(updatedSlugs).toEqual(['due-one', 'due-two']);
    // The UPDATE re-asserts status='scheduled' so a concurrent edit is not double-flipped.
    expect(queryMock.mock.calls[0][0]).toMatch(/status = 'scheduled'/);
    expect(queryMock.mock.calls[0][0]).toMatch(/SET status = 'published'/);
  });

  it('skips a missing/malformed publishedAt WITHOUT throwing and WITHOUT publishing (R3-F2)', async () => {
    queryRowsMock.mockResolvedValueOnce([
      { slug: 'garbage', published_at: 'not-a-date' },
      { slug: 'zoneless', published_at: '2024-06-01T09:00' }, // no zone → rejected by the shared contract
      { slug: 'missing', published_at: null },
      { slug: 'good', published_at: DUE }
    ]);

    const summary = await publishDueScheduledPosts({ now: NOW });

    expect(summary.skippedMalformed).toBe(3);
    expect(summary.published).toEqual(['good']);
    // Exactly one UPDATE — the bad rows neither fire nor abort the batch.
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][1][0]).toBe('good');
  });

  it('is a clean no-op when there are no scheduled rows', async () => {
    queryRowsMock.mockResolvedValueOnce([]);
    const summary = await publishDueScheduledPosts({ now: NOW });
    expect(summary).toEqual({
      scannedScheduled: 0,
      published: [],
      notYetDue: 0,
      skippedMalformed: 0
    });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('treats an exactly-now publishedAt as due (boundary)', async () => {
    queryRowsMock.mockResolvedValueOnce([{ slug: 'edge', published_at: '2024-06-01T12:00:00Z' }]);
    const summary = await publishDueScheduledPosts({ now: NOW });
    expect(summary.published).toEqual(['edge']);
  });

  it('queries only scheduled blog rows', async () => {
    queryRowsMock.mockResolvedValueOnce([]);
    await publishDueScheduledPosts({ now: NOW });
    const sql = queryRowsMock.mock.calls[0][0] as string;
    expect(sql).toMatch(/type = 'blog'/);
    expect(sql).toMatch(/status = 'scheduled'/);
    expect(sql).toMatch(/publishedAt/);
  });
});
