import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('OptimizedImage.astro — photo picker fetch URL (F-02 P1 fix)', () => {
  const componentSource = readFileSync(
    resolve(__dirname, 'OptimizedImage.astro'),
    'utf-8'
  );

  it('fetches photos with pageSize=500 to retrieve all entries', () => {
    // The old URL was '/api/cms/entries?collection=photos' which used server default (50).
    // The fix adds pageSize=500 to ensure all photos are returned.
    expect(componentSource).toContain('collection=photos&pageSize=500');
  });

  it('does NOT use the old URL without pageSize', () => {
    // The fetch call should not have the old URL pattern that omits pageSize
    // We check that the exact old pattern is gone
    const oldPattern = /fetch\(['"]\/api\/cms\/entries\?collection=photos['"],/;
    expect(componentSource).not.toMatch(oldPattern);
  });
});
