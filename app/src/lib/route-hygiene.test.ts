import { readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Astro turns every .ts/.js file under src/pages into a public route unless its name starts
// with `_`. A colocated `health.test.ts` therefore became a live `/api/health.test` endpoint that
// shipped vitest in the SSR function and 500'd on request. Tests next to pages must be `_*.test.ts`.
const PAGES_DIR = resolve(process.cwd(), 'src/pages');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

describe('src/pages route hygiene', () => {
  it('prefixes every test file under src/pages with `_` so Astro does not route it', () => {
    const routedTests = walk(PAGES_DIR)
      .filter(file => /\.(test|spec)\.[cm]?[jt]sx?$/.test(file))
      .filter(file => !file.split('/').pop()!.startsWith('_'))
      .map(file => relative(PAGES_DIR, file));
    expect(routedTests).toEqual([]);
  });
});
