import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockSupabaseClient } from '@/test/utils/mockSupabaseClient';

const logErrorMock = vi.fn();
const publicClientMock = createMockSupabaseClient();
const serviceClientMock = createMockSupabaseClient();

vi.mock('../client', () => ({
  getPublicClient: () => publicClientMock.client,
  getServiceClient: () => serviceClientMock.client,
  withServiceClient: async (callback: (client: unknown) => Promise<unknown>) => callback(serviceClientMock.client)
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
    publicClientMock.reset();
    serviceClientMock.reset();
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

    publicClientMock.setTableResponses('content', [
      { data: [firstRow], error: null },
      { data: [secondRow], error: null }
    ]);

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

    expect(publicClientMock.client.from).toHaveBeenCalledTimes(1);
    const operations = publicClientMock.getTableExecutions('content')[0]?.operations ?? [];
    expect(operations.map((op) => op.method)).toEqual(['select', 'eq', 'eq', 'order']);

    // Second call uses cached value
    const cached = await getCollection('blog');
    expect(cached).toEqual(initial);
    expect(publicClientMock.client.from).toHaveBeenCalledTimes(1);

    cacheUtils.invalidateCollection('blog');
    const refreshed = await getCollection('blog');
    expect(publicClientMock.client.from).toHaveBeenCalledTimes(2);
    expect(refreshed[0]?.id).toBe('update');
  });

  it('returns empty array for unknown collections without hitting the database', async () => {
    const entries = await getCollection('non-existent');
    expect(entries).toEqual([]);
    expect(publicClientMock.client.from).not.toHaveBeenCalled();
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

    publicClientMock.setTableResponses('content', [{ data: row, error: null }]);

    const entry = await getEntry('blog', 'welcome');
    expect(entry?.data.title).toBe('Title From Data');
    expect(entry?.body).toBe('Entry body');

    const operations = publicClientMock.getTableExecutions('content')[0]?.operations ?? [];
    expect(operations.map((op) => op.method)).toEqual(['select', 'eq', 'eq', 'maybeSingle']);
  });

  it('parses and caches settings values from the service client', async () => {
    serviceClientMock.setTableResponses('settings', [
      { data: { key: 'homepage', value: '{"cta":"Join"}' }, error: null }
    ]);

    const value = await getSetting('homepage');
    expect(value).toEqual({ cta: 'Join' });
    expect(serviceClientMock.client.from).toHaveBeenCalledTimes(1);

    const cachedValue = await getSetting('homepage');
    expect(cachedValue).toEqual({ cta: 'Join' });
    expect(serviceClientMock.client.from).toHaveBeenCalledTimes(1);
  });

  it('merges all settings into a keyed object and caches the result', async () => {
    serviceClientMock.setTableResponses('settings', [
      {
        data: [
          { key: 'hero', value: '{"headline":"Welcome"}' },
          { key: 'hours', value: '{"weekday":"9-5"}' }
        ],
        error: null
      }
    ]);

    const settings = await getAllSettings();
    expect(settings).toEqual({
      hero: { headline: 'Welcome' },
      hours: { weekday: '9-5' }
    });

    expect(serviceClientMock.client.from).toHaveBeenCalledTimes(1);

    const cached = await getAllSettings();
    expect(cached).toEqual(settings);
    expect(serviceClientMock.client.from).toHaveBeenCalledTimes(1);
  });

  it('logs errors and returns safe defaults on query failures', async () => {
    publicClientMock.setTableResponses('content', [
      { data: null, error: new Error('boom') },
      { data: null, error: new Error('still missing') }
    ]);
    serviceClientMock.setTableResponses('settings', [{ data: null, error: new Error('fail') }]);

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
