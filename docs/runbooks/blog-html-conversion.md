# Runbook: Blog V2 markdown→HTML cutover

The Blog V2 cutover switches post bodies from **markdown** to **TipTap HTML** and mounts the WYSIWYG
editor. It is designed so the **code deploy is safe on its own** and the **data conversion is a
separate, reversible, owner-supervised step** — there is no moment where the editor and the public
render are out of step.

## What ships in the cutover PR (code)

- `renderPostBody` becomes **transitional**: HTML bodies render through the V2 sanitizer
  (`renderBodyHtml`), legacy **markdown bodies keep the V1 `marked` path**. So deploying this changes
  nothing for the still-markdown 6 posts — they render byte-identically.
- The TipTap editor island is **mounted** in the admin add/edit forms (replacing the textarea). The
  edit form passes `initialHtml = renderPostBody(post.body)`, so a post loads as HTML whether its
  stored body is markdown or HTML — editing it saves HTML (it converts on first edit even before the
  batch script runs).
- The "Write in Markdown" helptext / Markdown guide are removed; the publish "body required" guard
  moves to a submit-time check (the server `validateBlogData` stays the source of truth).

Because the render is transitional, **merging the PR is safe** — the live blog is unchanged until a
post is edited or the batch conversion is run.

## The batch conversion (data) — run AFTER the PR is merged + deployed

Converts all 6 posts to HTML proactively (so the steady state is uniform), self-verifying each row.

```bash
# From app/, against the TARGET database. Dry-run first — writes nothing, reports what would change:
NETLIFY_DATABASE_URL="<neon pooler url>" npx tsx scripts/convert-blog-to-html.mts --dry-run

# Then for real:
NETLIFY_DATABASE_URL="<neon pooler url>" npx tsx scripts/convert-blog-to-html.mts
```

Per row it: computes the steady-state HTML (`renderBodyHtml(renderMarkdownToHtml(markdown))`),
**verifies rendered-output equivalence** (V2 render byte-equals the V1 markdown render after the
bounded §5.4 normalization), snapshots the original markdown into `data.bodyMarkdownBackup`, then
overwrites `data.body`. A row that is **not equivalent is SKIPPED, not converted** (reported) — the
gate never launders content loss; handle such a post by hand. Already-converted rows (already HTML or
carrying a backup) are skipped, so the script is idempotent.

> Get the Neon pooler URL from the **repo root**: `npx netlify env:get NETLIFY_DATABASE_URL`
> (`apply-migrations.sh` echoes the host — confirm it is the Neon pooler, not localhost).

### Verify after converting

1. Public blog renders correctly — open 2–3 of the 6 posts at `/blog/<slug>`; no literal `##`/`<h2>`
   text, links/images intact, all 6 URLs unchanged (≤5-min cache lag).
2. The editor works — at `/admin/blog`, open a post; the TipTap editor loads its content; make a
   trivial edit, save, confirm it renders.

## Rollback

Code-revert alone is **NOT** a rollback — converted HTML left in `data.body` would otherwise be
served by the reverted (markdown-only) renderer as literal tags. Restore the data, then revert the code:

```bash
# 1. Restore each converted post's markdown from its snapshot, removing the backup key:
NETLIFY_DATABASE_URL="<neon pooler url>" npx tsx scripts/revert-blog-to-markdown.mts --dry-run
NETLIFY_DATABASE_URL="<neon pooler url>" npx tsx scripts/revert-blog-to-markdown.mts

# 2. Revert the cutover PR (restores the textarea editor + the markdown helptext).
```

The transitional render is forgiving (it serves both formats), so even a partial rollback never
serves literal markup; but the editor mount must be reverted to the textarea for markdown authoring.
The pre-migration snapshot in `data.bodyMarkdownBackup`, **not git history**, is the authoritative
source — migration 015 (`ON CONFLICT DO NOTHING`) never clobbered owner-edited rows, so it is stale.

## After the conversion is ratified (follow-up, not part of the cutover)

Once all 6 posts are converted and stable, a follow-up removes the transitional markdown branch from
`renderPostBody` (single HTML render path) and clears the transient `data.bodyMarkdownBackup` keys.
