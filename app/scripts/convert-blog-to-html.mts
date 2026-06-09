#!/usr/bin/env tsx
/**
 * Blog V2 cutover — one-time markdown→HTML body conversion (ADR-009 §5.4).
 *
 * For each `type='blog'` row whose body is still markdown:
 *   1. compute the steady-state HTML via `convertMarkdownBodyToHtml` (V2 render of the V1 markdown
 *      render) and verify rendered-output equivalence;
 *   2. snapshot the original markdown into `data.bodyMarkdownBackup` (keyed by slug + updated_at);
 *   3. overwrite `data.body` with the converted HTML.
 * Any row that fails equivalence is SKIPPED (reported, not converted) — the gate never launders
 * content loss. Idempotent: rows already converted (already HTML, or carrying a backup) are skipped.
 *
 * Usage:
 *   --self-test     convert a fixture string and print the result (no DB); for CI/sanity
 *   --dry-run       connect + report what WOULD change, write nothing
 *   (default)       connect + convert + write
 *
 * Run against the target DB:  NETLIFY_DATABASE_URL=… npx tsx scripts/convert-blog-to-html.mts --dry-run
 * Rollback:                   scripts/revert-blog-to-markdown.mts
 * See docs/runbooks/blog-html-conversion.md.
 */
import { Client } from 'pg';
import { convertMarkdownBodyToHtml } from '../src/lib/blog-conversion.ts';

const SELF_TEST = process.argv.includes('--self-test');
const DRY_RUN = process.argv.includes('--dry-run');

const isAlreadyHtml = (body: string): boolean => /^\s*<[a-z]/i.test(body ?? '');

async function selfTest(): Promise<void> {
  const sample = '# Welcome\n\nA **warm** hello with a [link](mailto:hi@spicebush.org).';
  const { html, equivalent } = convertMarkdownBodyToHtml(sample);
  console.log('[self-test] equivalent:', equivalent);
  console.log('[self-test] html:', html);
  if (!equivalent) process.exit(1);
}

async function run(): Promise<void> {
  const url = process.env.NETLIFY_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error('Set NETLIFY_DATABASE_URL (or DATABASE_URL). Refusing to run without a target.');
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query<{ id: string; slug: string; data: Record<string, unknown> }>(
      "SELECT id, slug, data FROM content WHERE type = 'blog' ORDER BY slug"
    );
    let converted = 0;
    let skipped = 0;
    let failed = 0;
    for (const row of rows) {
      const data = row.data ?? {};
      const body = typeof data.body === 'string' ? data.body : '';
      if (!body) {
        console.log(`  skip ${row.slug}: empty body`);
        skipped++;
        continue;
      }
      if (data.bodyMarkdownBackup || isAlreadyHtml(body)) {
        console.log(`  skip ${row.slug}: already converted`);
        skipped++;
        continue;
      }
      const { html, equivalent, markdownRender } = convertMarkdownBodyToHtml(body);
      if (!equivalent) {
        console.error(`  FAIL ${row.slug}: not rendered-output-equivalent — NOT converted`);
        console.error(`    V1: ${markdownRender.slice(0, 200)}`);
        console.error(`    V2: ${html.slice(0, 200)}`);
        failed++;
        continue;
      }
      const nextData = {
        ...data,
        body: html,
        bodyMarkdownBackup: { snapshot: body, slug: row.slug }
      };
      if (DRY_RUN) {
        console.log(`  would convert ${row.slug} (${body.length}→${html.length} chars)`);
      } else {
        await client.query('UPDATE content SET data = $1 WHERE id = $2', [
          JSON.stringify(nextData),
          row.id
        ]);
        console.log(`  converted ${row.slug}`);
      }
      converted++;
    }
    console.log(
      `\n${DRY_RUN ? '[dry-run] ' : ''}done: ${converted} converted, ${skipped} skipped, ${failed} failed`
    );
    if (failed > 0) process.exit(1);
  } finally {
    await client.end();
  }
}

await (SELF_TEST ? selfTest() : run());
process.exit(0);
