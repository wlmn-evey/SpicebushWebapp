# ADR-009: TipTap Editor with Markdown Round-Trip Storage over HTML Storage

**Date**: 2026-06-06
**Status**: Accepted

## Context

ADR-008 reintroduced the blog as DB-backed content authored at `/admin/blog`, with post bodies stored as raw markdown in the `data.body` JSONB key (not a column) and rendered through a single frozen pipeline: `marked` → `DOMPurify.sanitize(STRICT_CONFIG)` in `renderPostBody` (`app/src/lib/blog-content.ts`), surfaced through the hand-rolled `.blog-body` CSS in `app/src/pages/blog/[slug].astro`. V1's authoring surface is a plain `<textarea>` plus a server-rendered preview. Six legacy markdown posts are live with stable URLs.

Blog V2 brings the full `spec/blog-cms` featureset into this live V1. The owner has settled on TipTap as the rich-text editor (a prior pick, reaffirmed 2026-06-06, not revisitable). What ADR-008 did not decide, and what this ADR must, is how a TipTap editing surface persists into `data.body` — and the choice has security and migration consequences the V1 invariants constrain.

Two storage forks were considered:

- **TipTap HTML storage** — persist the editor's native HTML output into `data.body`. Full WYSIWYG fidelity for every TipTap construct (underline, text-align, tables), no serialization round-trip to lose information.
- **TipTap with Markdown round-trip storage (Option B)** — persist markdown. TipTap's `@tiptap/markdown` `MarkdownManager` parses stored markdown into the editor on load and serializes back to markdown on save; the existing `marked` → DOMPurify render pipeline is preserved unchanged. "No Markdown serialization" applies only to constructs that markdown cannot represent (underline, text-align), which are therefore dropped — not to body storage, which remains markdown.

The deciding constraints are the V1 invariants: the 6 live posts keep their URLs and content; sanitizer rigor must be equivalent or stronger; the faithful "Preview as visitor" must render through the real public pipeline, not the editor canvas. HTML storage would convert all 6 posts from markdown to HTML and introduce a new XSS trust boundary — TipTap's raw HTML output — forcing a full DOMPurify re-audit against that output. Markdown round-trip storage keeps `data.body` as markdown, changes nothing in the render pipeline, and leaves the sanitizer surface frozen.

## Decision

Adopt **TipTap as the editor (owner's pick) with Markdown round-trip storage**. Post bodies remain markdown in `data.body`. On load, `MarkdownManager.parse` hydrates the TipTap document from stored markdown; on save, `MarkdownManager.serialize` writes markdown back. The frozen `marked` → `DOMPurify.sanitize(STRICT_CONFIG)` → `.blog-body` render pipeline from ADR-008 is preserved verbatim. This ADR supersedes only ADR-008's `<textarea>` authoring surface; ADR-008's storage and render contract stands.

To keep the round-trip lossless by construction: the TipTap extension set is restricted to constructs `@tiptap/markdown` round-trips cleanly; markdown-non-serializable constructs (underline, text-align) are dropped from the toolbar; non-serializable typography input rules are disabled; tables, if their round-trip is not clean, stay authorable only via a markdown-source toggle. Because the TipTap canvas is not the source of truth, the faithful "Preview as visitor" renders through the real `.blog-body` pipeline (`renderPostBody`), not the editor canvas and not `.prose` (`@tailwindcss/typography` is not installed; `.prose` is unstyled here).

This choice is **adopted contingent on the Phase-1 PR2 headless round-trip spike**: one of the 6 live posts must pass `MarkdownManager.parse(md) → serialize()` byte-identical (or with documented normalization) in jsdom with **no** `EditorView`. PR3 adopts the view-less round-trip as the per-PR CI gate only after this spike passes. If the spike fails — a `@tiptap/markdown` v3 internal that cannot serialize without a live view, or irreducible round-trip loss on a live post — the fallback is to keep V1's markdown textarea as the body surface for V2 and layer TipTap's chrome (toolbar, AI affordances) onto it without taking over body persistence, rather than escalate to HTML storage; HTML storage would only be reconsidered through a new ADR that reopens the sanitizer audit.

### Migration of the 6 live posts

Under markdown storage there is **no format conversion**. The 6 posts' `data.body` stays markdown; their URLs and content are untouched. The only risk is round-trip fidelity when an owner opens and re-saves a post through TipTap — covered by the byte-identical canary gate above, with all 6 posts run through `parse → serialize` in CI. By contrast, HTML storage would require converting all 6 bodies to HTML up front and re-validating each conversion.

### Sanitizer re-validation

Because the render pipeline is unchanged under markdown storage, V1's `STRICT_CONFIG` security properties hold by construction. The four properties confirmed against `blog-content.ts` and re-asserted in CI are:

1. **No `id` attribute** — `ALLOWED_ATTR` is `href`, `src`, `alt`, `title` only.
2. **Fragments stripped** — DOMPurify returns a sanitized fragment; disallowed tags/attributes are removed.
3. **Body URI policy** — `ALLOWED_URI_REGEXP` permits `https:`, `mailto:`, `tel:`, and site-relative URLs. This is **not** "HTTPS-only"; tightening it would break the 6 live posts' `mailto:`/`tel:`/relative links and is forbidden. It is distinct from the featured-image `IMAGE_SCHEME_REGEX`.
4. **`ALLOW_DATA_ATTR` and `ALLOW_ARIA_ATTR` both `false`.**

HTML storage would reopen this audit against TipTap's raw HTML output — a new and broader trust boundary — violating the "sanitizer rigor equivalent-or-stronger" invariant.

## Consequences

- **Easier**: No format migration of the 6 live posts — `data.body` stays markdown, URLs and content untouched. The only fidelity risk is open-and-save round-trip, gated by the byte-identical canary.
- **Easier**: The XSS/sanitizer surface is frozen. The `marked` → DOMPurify → `.blog-body` pipeline and its four `STRICT_CONFIG` properties are unchanged, so the security re-audit is a re-assertion, not a new boundary against TipTap HTML.
- **Easier**: AI body output, the markdown-source toggle, and TipTap all emit the same markdown that V1, the importer, and the legacy posts already use, so one render path serves every author.
- **Harder**: Markdown-non-serializable constructs are lost — underline and text-align are dropped from the toolbar; non-serializable input rules must be disabled to keep the round-trip clean.
- **Harder**: Tables risk a lossy round-trip through `@tiptap/markdown`; the default is to keep them authorable only via the markdown-source toggle until a clean round-trip is proven, rather than ship a WYSIWYG table that breaks the round-trip gate.
- **Harder**: Round-trip fidelity depends on `@tiptap/markdown` (v3.24.0, CommonMark/MarkedJS-backed). Mitigated by the PR2 headless spike, a lossless-by-construction extension set, and the 6 live posts as a canary — but the dependency is a real fidelity surface to maintain.
- **Harder**: The TipTap canvas is not the source of truth, so the faithful preview cannot be the editor view; it must re-render through `renderPostBody`/`.blog-body`. A first-class admin React island (the repo has zero `.test.tsx` precedent) is introduced and must carry editor-region and toolbar a11y the textarea did not need.
- **Trade-off (HTML storage, rejected)**: HTML storage would give full WYSIWYG fidelity for every TipTap construct and eliminate round-trip risk — at the cost of converting all 6 live posts to HTML, introducing TipTap raw HTML as a new XSS boundary, and forcing a full DOMPurify re-audit against that output, which violates the "sanitizer rigor equivalent-or-stronger" and "6 posts keep content" invariants. Markdown round-trip accepts a bounded loss of non-markdown constructs to keep both invariants intact.
- **Trade-off**: TipTap is an admin-only island (~150–300 KB est., one per page) loaded behind auth and code-split, accepted for authoring ergonomics over the zero-JS textarea; bundle size is measured in Phase 1 before the checkpoint.
