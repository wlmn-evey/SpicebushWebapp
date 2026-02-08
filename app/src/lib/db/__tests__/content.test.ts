import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logErrorMock, queryRowsMock, queryFirstMock } = vi.hoisted(() => ({
  logErrorMock: vi.fn(),
  queryRowsMock: vi.fn(),
  queryFirstMock: vi.fn()
}));

vi.mock('../client', () => ({
  queryRows: queryRowsMock,
  queryFirst: queryFirstMock
}));

vi.mock('@lib/error-logger', () => ({
  logError: logErrorMock
}));

import {
  cacheUtils,
  getAllSettings,
  getCollection,
  getEntry,
  getSetting
} from '../content';

describe('db.content facade', () => {
  beforeEach(() => {
    logErrorMock.mockClear();
    queryRowsMock.mockReset();
    queryFirstMock.mockReset();
    cacheUtils.clearAll();
    cacheUtils.resetMetrics();
  });

  it('fetches published collection entries and caches results', async () => {
    const firstRow = {
      slug: 'welcome',
      type: 'blog',
      title: 'Welcome Override',
      data: {
        title: 'Welcome From Data',
        body: 'Hello world'
      },
      status: 'published',
      created_at: '2024-01-01T00:00:00.000Z'
    };

    const secondRow = {
      slug: 'update',
      type: 'blog',
      title: 'New Update',
      data: {
        body: 'Fresh news'
      },
      status: 'published',
      created_at: '2024-02-01T00:00:00.000Z'
    };

    queryRowsMock
      .mockResolvedValueOnce([firstRow])
      .mockResolvedValueOnce([secondRow]);

    const initial = await getCollection('blog');
    expect(initial).toEqual([
      {
        id: 'welcome',
        slug: 'welcome',
        collection: 'blog',
        data: {
          title: 'Welcome Override',
          body: 'Hello world'
        },
        body: 'Hello world'
      }
    ]);

    expect(queryRowsMock).toHaveBeenCalledTimes(1);
    expect(queryRowsMock).toHaveBeenNthCalledWith(1, expect.stringContaining('FROM content'), ['blog']);

    // Second call uses cached value
    const cached = await getCollection('blog');
    expect(cached).toEqual(initial);
    expect(queryRowsMock).toHaveBeenCalledTimes(1);

    cacheUtils.invalidateCollection('blog');
    const refreshed = await getCollection('blog');
    expect(queryRowsMock).toHaveBeenCalledTimes(2);
    expect(refreshed[0]?.id).toBe('update');
  });

  it('returns empty array for unknown collections without hitting the database', async () => {
    const entries = await getCollection('non-existent');
    expect(entries).toEqual([]);
    expect(queryRowsMock).not.toHaveBeenCalled();
  });

  it('fetches a single entry and falls back to merged data title', async () => {
    const row = {
      slug: 'welcome',
      type: 'blog',
      title: null,
      data: {
        title: 'Title From Data',
        body: 'Entry body'
      },
      status: 'published',
      created_at: '2024-01-01T00:00:00.000Z'
    };

    queryFirstMock.mockResolvedValueOnce(row);

    const entry = await getEntry('blog', 'welcome');
    expect(entry?.data.title).toBe('Title From Data');
    expect(entry?.body).toBe('Entry body');

    expect(queryFirstMock).toHaveBeenCalledWith(
      expect.stringContaining('WHERE type = $1 AND slug = $2 AND status = \'published\''),
      ['blog', 'welcome']
    );
  });

  it('parses and caches settings values from the service client', async () => {
    queryFirstMock.mockResolvedValueOnce({ key: 'homepage', value: '{"cta":"Join"}' });

    const value = await getSetting('homepage');
    expect(value).toEqual({ cta: 'Join' });
    expect(queryFirstMock).toHaveBeenCalledTimes(1);

    const cachedValue = await getSetting('homepage');
    expect(cachedValue).toEqual({ cta: 'Join' });
    expect(queryFirstMock).toHaveBeenCalledTimes(1);
  });

  it('merges all settings into a keyed object and caches the result', async () => {
    queryRowsMock.mockResolvedValueOnce([
      { key: 'hero', value: '{"headline":"Welcome"}' },
      { key: 'hours', value: '{"weekday":"9-5"}' }
    ]);

    const settings = await getAllSettings();
    expect(settings).toEqual({
      hero: { headline: 'Welcome' },
      hours: { weekday: '9-5' }
    });

    expect(queryRowsMock).toHaveBeenCalledTimes(1);

    const cached = await getAllSettings();
    expect(cached).toEqual(settings);
    expect(queryRowsMock).toHaveBeenCalledTimes(1);
  });

  it('logs errors and returns safe defaults on query failures', async () => {
    queryRowsMock.mockRejectedValueOnce(new Error('boom'));
    queryFirstMock
      .mockRejectedValueOnce(new Error('still missing'))
      .mockRejectedValueOnce(new Error('fail'));

    const [collection, entry, setting] = await Promise.all([
      getCollection('blog'),
      getEntry('blog', 'missing'),
      getSetting('missing')
    ]);

    expect(collection).toEqual([]);
    expect(entry).toBeNull();
    expect(setting).toBeNull();
    expect(logErrorMock).toHaveBeenCalledTimes(3);
  });
});
