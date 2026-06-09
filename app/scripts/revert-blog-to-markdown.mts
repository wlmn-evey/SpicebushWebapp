#!/usr/bin/env tsx
/**
 * Blog V2 cutover ROLLBACK — restore each converted post's markdown from its `data.bodyMarkdownBackup`
 * snapshot and remove the backup key (ADR-009 §5.4). Run TOGETHER with a code-revert of the cutover
 * PR (the transitional `renderPostBody` already serves markdown, so order is forgiving, but the
 * editor mount must be reverted to the textarea for authoring). Code-revert ALONE is NOT a rollback.
 *
 * Usage:
 *   --dry-run    connect + report what WOULD be restored, write nothing
 *   (default)    connect + restore + remove the backup key
 *
 *   NETLIFY_DATABASE_URL=… npx tsx scripts/revert-blog-to-markdown.mts --dry-run
 * See docs/runbooks/blog-html-conversion.md.
 */
import { Client } from 'pg';

const DRY_RUN = process.argv.includes('--dry-run');

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
      "SELECT id, slug, data FROM content WHERE type = 'blog' AND data ? 'bodyMarkdownBackup' ORDER BY slug"
    );
    let restored = 0;
    for (const row of rows) {
      const data = row.data ?? {};
      const backup = data.bodyMarkdownBackup as { snapshot?: string } | undefined;
      const snapshot = typeof backup?.snapshot === 'string' ? backup.snapshot : null;
      if (!snapshot) {
        console.error(`  skip ${row.slug}: backup present but snapshot missing/invalid`);
        continue;
      }
      const nextData = { ...data, body: snapshot };
      delete (nextData as Record<string, unknown>).bodyMarkdownBackup;
      if (DRY_RUN) {
        console.log(`  would restore ${row.slug} (→ ${snapshot.length} chars of markdown)`);
      } else {
        await client.query('UPDATE content SET data = $1 WHERE id = $2', [
          JSON.stringify(nextData),
          row.id
        ]);
        console.log(`  restored ${row.slug}`);
      }
      restored++;
    }
    console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}done: ${restored} restored`);
  } finally {
    await client.end();
  }
}

await run();
process.exit(0);
