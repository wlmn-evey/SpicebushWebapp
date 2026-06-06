# Decision Log: DB-Backed Blog (V1) Planning Process

> **Status:** audit trail (closed after Round 4). **Date:** 2026-06-05.
> **Companion artifacts:** implementation plan `docs/plans/blog-implementation-plan.md` (see §17 Revision History for the round-by-round diff), spec `docs/specs/blog.md`, ADR `docs/adr/008-db-backed-blog.md`.
>
> This document is the audit trail for how the blog plan was produced: the two owner-locked decisions that bounded the design space, the judge-panel selection of a base plan, the four adversarial stress rounds and what each accepted or deferred, and the final decision ledger. It is a factual record of the planning process, not a description of the feature and not a sales pitch. For *what the feature is*, read the spec; for *how it is built*, read the plan; for *how the plan got there*, read this.

## 1. Owner-Locked Decisions

Two decisions were locked by the owner on 2026-06-05 before any plan was authored. They are not findings, not subject to stress-round revision, and they bounded every downstream choice. Every accepted finding below was evaluated against these two constraints.

| # | Decision | Rationale (as locked) |
|---|---|---|
| OL-1 | **Authoring is DB-backed via the admin panel.** | Non-technical owners must self-publish without deploys. The existing `content` table and admin patterns already support this; no new table, endpoint, or architecture is required. |
| OL-2 | **V1 scope is a Lean MVP.** No categories/tags UI, RSS, pagination, scheduled publishing, related posts, search, comments, or newsletter. | The site published 6 posts in 2 years; demand does not justify the surface area. The ROADMAP gates this feature on *no maintainability regression*. Deferred items get an explicit rationale in the spec — they are recorded as deliberately out of scope, never silently omitted. |

OL-2 is the constraint the plan is *judged on*: not "does the blog work" but "does it add the least durable maintenance surface that still meets the owner need." This framing is why a large share of accepted findings across all four rounds are scope cuts (removing bespoke machinery) rather than feature additions.

## 2. Judge Panel: Base Plan Selection

Three candidate plans were authored independently and scored by a judge panel. The panel selected a single winner to serve as the base; the implementation plan then grafted verified fixes onto it (the "v1" baseline) before stress testing began.

| Candidate | Score | Outcome |
|---|---|---|
| **simplicity-first** | **123.5** | **Winner — adopted as base plan** |
| owner-ux-first | 118.5 | Not adopted |
| risk-first | 114 | Not adopted |

**Winner:** simplicity-first.

The simplicity-first plan won by a 5-point margin over owner-ux-first and a 9.5-point margin over risk-first. Adopting it as the base set the plan's default posture toward minimizing net new code and reusing the existing generic content pipeline end to end — consistent with OL-2's maintainability gate. The trade-off the panel accepted: a simplicity-first base under-weights owner-UX and risk concerns at the outset, which is precisely the gap the subsequent adversarial stress rounds were run to close. The high volume of accepted owner-ux and ops/security findings in Rounds 1–2 (below) is the direct, expected consequence of starting from the simplicity-first base rather than the owner-ux-first or risk-first candidates.

## 3. Stress Rounds

Each round was an adversarial review pass across eight concern domains: security, scope, owner-ux, seo, data, a11y, testing, ops. Findings were raised, then individually accepted (folded into the plan as a revision) or deferred (recorded as a known gap, not actioned in V1). Severity tags (critical / high / medium / low) are preserved as raised.

**Aggregate:**

| Round | Raised | Accepted | Substantive | Deferred |
|---|---|---|---|---|
| 1 | 53 | 45 | 34 | 2 |
| 2 | 41 | 34 | 25 | 1 |
| 3 | 32 | 24 | 19 | 3 |
| 4 | 32 | 29 | 20 | 1 |
| **Total** | **158** | **132** | **98** | **7** |

"Substantive" counts the accepted findings that changed plan content materially (versus minor clarifications). The descending raised/accepted counts across rounds (53 → 41 → 32 → 32) indicate convergence: each pass found fewer new defects, and Round 4 was dominated by scope cuts rather than newly discovered correctness defects.

### Round 1 — 53 raised, 45 accepted (34 substantive)

**Accepted findings:**

- *(security, medium)* Sitemap and normalized read path trust slug charset that only the write-path regex guarantees (XML injection via legacy/unaudited rows).
- *(security, medium)* Featured image URL (`data.image`) has no URI-scheme validation, contradicting the plan's single-enforcement-point sanitization policy.
- *(security, low)* CSRF posture rests on a single control, and the grafted form-POST delete removes the preflight barrier the JSON DELETE had.
- *(security, low)* PR-1 acceptance criterion "when unauthenticated, then 403" contradicts actual middleware behavior.
- *(security, low)* `responseByFormat` success path allows a backslash open-redirect; all new blog forms ride this helper.
- *(security, low)* No size caps on slug/title/excerpt/body — unbounded content flows into per-instance cache, cold-start preload, and the render pipeline.
- *(scope, high)* Sort tiebreak, `BlogPost.updatedAt`, and sitemap `lastmod` depend on `created_at`/`updated_at` that `ContentEntry` does not expose — invites scope creep into the shared DB layer.
- *(scope, medium)* Sitemap endpoint mandates a divergent origin-resolution precedence — a second resolver engineered around a bug the plan already fixes at Step 0.
- *(scope, medium)* `getManagedBlogPosts` status filter recreates the "invisible in admin" failure mode the plan's own rationale warns about, and adds a second sort implementation.
- *(scope, medium)* localStorage autosave + restore-banner machinery is the feature's largest bespoke client artifact, has zero precedent in the admin surface, and prevention costs ~10 lines.
- *(scope, low)* Slug-collision is protected three ways; the client-side warning requires serializing the full slug list into every page load.
- *(scope, low)* `normalizeBlogData`'s categories/tags shape-handling is scaffolding for the locked-OUT tags feature — the `baseDataJson` passthrough already preserves them with zero code.
- *(scope, low)* Admin page eagerly renders every post body through marked+DOMPurify on every `/admin/blog` load.
- *(owner-ux, high)* New-post `redirectTo '?saved={slug-via-js-or-server}'` references a server mechanism that does not exist; either builder interpretation produces wrong behavior.
- *(owner-ux, medium)* Failed saves show a green "Saved" banner alongside the error — a false success signal at the moment of publish.
- *(owner-ux, medium)* Uploaded featured-image URL is set programmatically — input-event autosave never captures it, and the "save to keep" warning was dropped.
- *(owner-ux, medium)* The most common owner link form, `[text](www.example.com)`, is silently stripped to a dead link; `#anchor` links break too.
- *(owner-ux, medium)* Body images: the help block teaches `![alt](url)` but the plan gives the owner no way to obtain a URL.
- *(owner-ux, low)* Slug typo on a published post has no recovery path, and the delete confirm actively deters the only fix.
- *(seo, high)* Blog launch ships cross-domain canonicals and `og:url` pointing at the testing domain; the `PUBLIC_SITE_URL` fix is only a soft dependency of PR-4.
- *(seo, medium)* Step 0's default assumption ("no prod blog rows") contradicts repo history, and the plan misses that existing rows are the ground truth for historically live slugs.
- *(seo, medium)* Legacy per-post URLs under `/resources/blog/<slug>` are unaddressed; open question 3 asks the wrong question.
- *(seo, low)* The browser-cached-301 risk narrative contradicts the plan's own verification; ADR-008 and the accepted-risk framing should match the actual mechanics.
- *(data, critical)* Prod DB almost certainly already has 6 `type='blog'` rows with date-prefixed slugs; migration 015 will *duplicate* them, not collide.
- *(data, high)* The plan leaves the duplicate-creation vector live: `db:seed` re-creates date-prefixed blog rows on every run, and the deploy runbook instructs running it against production.
- *(data, medium)* Step 0 audit query is too narrow to drive the decision it gates.
- *(a11y, high)* §11 "required attributes mirror server validation" is unimplementable and one reading breaks draft saving.
- *(a11y, medium)* The "existing AdminLayout alert region" does not exist — flash messages have no ARIA semantics and success flashes self-destruct after 6 seconds.
- *(a11y, medium)* Three JS-injected dynamic messages have no specified screen-reader announcement mechanism.
- *(a11y, medium)* "Brand link colors" for `.blog-body` is ambiguous — two of the plausible brand colors fail WCAG AA contrast.
- *(a11y, medium)* a11y E2E coverage: `/blog` is already hard-coded in the alt-text test list (gate auto-activates at PR-4), but the heading-hierarchy test excludes all blog routes — the plan's conditional must be resolved.
- *(a11y, medium)* Server alt-text validation accepts values the repo's own CI a11y standard rejects — an owner can break CI with a legal save.
- *(a11y, low)* `aria-describedby` pointing the body textarea at the full markdown cheat-sheet creates screen-reader verbosity on every focus.
- *(testing, high)* E2E gate has no execution point: CI never runs Playwright and the E2E target won't have PR-4's code.
- *(testing, high)* Draft invisibility — a named ROADMAP gate — has no deterministic automated proof; the only real test is conditional-skipped.
- *(testing, high)* Author→publish→public-view flow has zero composed coverage, and the plan's skip rationale rests on a false premise.
- *(testing, medium)* E2E #11 is vacuously written: an either/or assertion that can never fail.
- *(testing, medium)* Coverage-gate evidence is blind to the security-critical endpoint changes.
- *(testing, medium)* Pre-existing `app/e2e/content-db-direct.spec.ts` already asserts old blog behavior and is never reconciled by the plan.
- *(testing, medium)* XSS/URI matrix misses the cases the custom `ALLOWED_URI_REGEXP` silently breaks: fragment and relative links.
- *(ops, high)* Plan §9's origin hardening for `sitemap-blog.xml`/`robots.txt` emits the TESTING origin — runtime env is verifiably wrong.
- *(ops, high)* There is no separate testing site or DB — Step 0's open question is already answerable and the plan's staging buffer is illusory.
- *(ops, medium)* The deploy workflow the plan cites as "verified" is not on main — deploy mechanism and build provenance must be pinned.
- *(ops, medium)* Migration execution is underspecified: target-DB selection is implicit and the runner applies 015 without a transaction.
- *(ops, low)* §10's cold-start cache-warming claim is false — `preloadCommonData` has zero call sites.

**Deferred:**

- Autosave backup is cleared on validation-error redirects — the data-loss protection nullifies itself in the exact scenario it was grafted for. *(Subsumed: the autosave machinery was cut entirely, so the self-nullifying backup no longer exists; see Ledger L-1.)*
- Validation errors don't identify which form failed, and the failed form re-renders collapsed.

### Round 2 — 41 raised, 34 accepted (25 substantive)

**Accepted findings:**

- *(security, medium)* Backslash-as-slash bypasses both new URI validators (sanitizer `ALLOWED_URI_REGEXP` and featured-image regex) — the exact class the plan fixed in `parseRedirectPath`.
- *(security, medium)* Missing/empty status silently publishes: the endpoint defaults status to `'published'` BEFORE the planned blog hooks run, so "reject invalid status with 400" cannot catch omission.
- *(security, medium)* The "strict" DOMPurify allowlist silently admits arbitrary `data-*` and `aria-*` attributes (`ALLOW_DATA_ATTR`/`ALLOW_ARIA_ATTR` default true), and the sanitized output is injected into the admin page where scripts key off data attributes.
- *(security, low)* `E2E_ADMIN_SESSION` (a live prod admin session token) has no handling rules: nothing forbids recording it in the PR, requires fresh provisioning, or revokes it after the gate run.
- *(scope, medium)* Coverage include extension (R1-F44 resolution) is over-broad for unrelated code and still misses the feature's own new endpoint.
- *(scope, medium)* Test 17 (empty-state "unit test on the index page's data path") is unbuildable as specified — the R1-F43 resolution moved the assertion somewhere Vitest cannot reach.
- *(scope, low)* Page-level `ogImage` scheme re-check is redundant and incomplete — drop it (or centralize it in `normalizeBlogEntry`, not the template).
- *(owner-ux, critical)* Cloned textarea pattern + untrimmed `_raw` path silently corrupts markdown bodies on every edit-save.
- *(owner-ux, high)* Conditional-required toggle never runs at page load — edit forms of published posts have none of the promised protection.
- *(owner-ux, high)* Server-only validation rules have no client mirror — multiple state-losing 400s remain despite the plan declaring them closed, and the on-screen alt guidance contradicts the server rule.
- *(owner-ux, high)* The plan's own image instructions route the owner into same-tab navigation that discards the unsaved draft.
- *(owner-ux, high)* Accepted residual risk is mis-scoped: the dominant create-collision loss is the missed passive warning, not concurrency.
- *(owner-ux, medium)* The save-then-preview loop — the feature's only verification loop — collapses every `<details>` on each save.
- *(owner-ux, low)* Pin status-select placement explicitly — the cloned template buries it in a collapsed "Advanced Options" `<details>`.
- *(seo, medium)* Planned Layout `ogImage` change fixes `og:image` but leaves `twitter:image` (and other per-post social meta) on the global fallback.
- *(seo, medium)* Launch and E2E gates assert canonical origin but never assert indexability — a `noindex` on `/blog` or a post ships silently, and Step 0 audits content rows but not the SEO settings that control robots meta.
- *(seo, low)* `sitemap-blog.xml` URL form is never pinned, and E2E test 22 is a substring check that cannot detect a wrong form.
- *(seo, low)* Nothing stops owners from creating new slugs inside the legacy date-prefix redirect namespace.
- *(data, high)* Empty-string optional fields poison per-post SEO meta; plan never defines empty handling and the `??` fallbacks can't catch `''`.
- *(data, medium)* PR-2 exposes the live seed rows to admin edits that silently defeat migration 015's DELETE predicate — the reconciliation has an open window.
- *(data, low)* §3 row-shape claim "imported posts use `/images/blog/*.webp`" is false for file 6 — the plan self-contradicts and could mislead PR-3 verification.
- *(a11y, high)* Body markdown images have zero alt-text enforcement — unlabeled content images can ship (WCAG 1.1.1), and a legal owner save can break the pinned a11y E2E gate, violating the plan's own R1-F37 standard.
- *(a11y, medium)* The "existing contrast block" the plan extends for R1-F35 is vacuous and only visits `/` — the `.blog-body` assertion as instructed would silently pass on zero elements, shipping the flagship contrast pin unverified again.
- *(a11y, medium)* §5.5's claim that "the ARIA roles are what make them announce" is false for post-redirect flash content — alerts present in initial page markup are not reliably announced; the plan needs focus management, not just roles.
- *(a11y, medium)* Fragment links are pinned-allowed but structurally untargetable — marked v16 emits no heading ids and `id` is not in `ALLOWED_ATTR`, so the locked URI decision is half-implemented and owner in-page anchors are silently dead.
- *(a11y, low)* Dynamic-feedback announcement details under-specified: the slug-collision `role="alert"` re-announces on every keystroke, and the Copy-address affordance has no specified success announcement.
- *(testing, high)* Authoring-flow E2E (test 24) is unexecutable as specified under the real Playwright config and prod cache semantics.
- *(testing, high)* Test 12's 401/303 auth-semantics assertions cannot be produced where the plan places them (endpoint unit tests).
- *(testing, medium)* The "full test coverage for new code" gate has no automated evidence path — CI never runs coverage at all.
- *(testing, medium)* The autosave replacement (client-side conditional-required validation) ships with zero automated coverage; the authoring E2E never touches the admin UI.
- *(testing, low)* Date-prefix fallback path lacks regression pins for its miss and draft branches.
- *(ops, high)* Netlify git-connected CI is a live third deploy path the "pinned deploy mechanism" does not pin — it can silently overwrite the launch.
- *(ops, medium)* §15's migration command fetches the dev-context env var, and the runner prints no target host — the "pre-flight echo" hedge must become mandatory.
- *(ops, low)* "Set `PUBLIC_SITE_URL` in the production env" leaves the dev-context value broken; "both paths bake the right origin" is only true if all contexts are fixed.

**Deferred:**

- Post meta descriptions inherit untruncated excerpts (up to 1,000 chars) and the blog index gets a thin title plus the generic site-wide description. *(Meta-description length capping is recorded as deferred-to-V2 in the spec.)*

### Round 3 — 32 raised, 24 accepted (19 substantive)

**Accepted findings:**

- *(security, low)* Body markdown image/link URLs permit `http:` (and arbitrary https hosts) while the featured image is locked to site-relative-or-https — an inconsistent image trust boundary.
- *(security, low)* `id` in `ALLOWED_ATTR` enables author-controlled ids in the admin preview DOM; the plan's "SANITIZE_DOM guards clobbering" note understates the residual (`SANITIZE_NAMED_PROPS` is off by default).
- *(scope, low)* Site-wide `global.css` smooth-scroll reduced-motion fix is coupled into the blog launch PR (PR-4).
- *(owner-ux, high)* Body-markdown-image alt check is server-only with no client mirror — falsifies the plan's "concurrent-only" data-loss claim and routes single users into losing whole posts.
- *(seo, high)* Static `@astrojs/sitemap` will list `/blog/` (trailing slash) while the new blog sitemap and canonical use `/blog` (slashless) — self-inflicted duplicate/non-canonical sitemap URLs on the launch page.
- *(seo, high)* `/resources/blog/` (a 301) sits in the static sitemap; the plan unwinds the redirect but never removes the stale sitemap entry, so search engines keep being pointed at a redirect.
- *(seo, medium)* `robots.txt` will advertise two sitemaps on two different ORIGINS until the env fix lands — and the plan's Sitemap-line append doesn't reconcile the existing testing-origin sitemap-index line.
- *(seo, medium)* Legacy `/resources/blog/<slug>` recovery produces a DOUBLE 301 chain for the 5 date-prefixed seed-era posts, with no canonical-consolidation check.
- *(seo, medium)* Slug strategy changes the canonical URL for 5 of 6 posts away from their only-ever-live (date-prefixed) URLs, concentrating all historical link equity behind 301s rather than preserving the indexed URL.
- *(seo, low)* `article:published_time` uses the date-only `'YYYY-MM-DD'` string; Open Graph/structured-data consumers expect an ISO 8601 datetime.
- *(data, high)* New normalize-delete of empty optional keys creates an edit-time featured-image data-loss path the plan never pins shut.
- *(data, medium)* Migration 015 date normalization is unpinned; gray-matter parses `date:` to a JS `Date`, and the seed pipeline normalizes it via `.toISOString().slice(0,10)`.
- *(data, medium)* `ON CONFLICT DO NOTHING` makes 015 a silent no-op against any pre-existing CLEAN-slug row, so a stale/divergent clean-slug post is never reconciled.
- *(data, low)* Sitemap/admin ordering by `data->>'date'` relies on lexicographic ISO compare done in JS, but a row with a malformed/absent date sorts unpredictably and is not pinned.
- *(a11y, medium)* Copy-address and upload-status announcements depend on programmatic writes to an aria-live region, but the success/blocking states of the inline upload fetch are not specified for keyboard/SR users on failure.
- *(a11y, medium)* Error-flash focus-on-load can hijack focus on every benign reload and is not reconciled with the AdminLayout submit-button focus/loading behavior.
- *(testing, medium)* Handler-integration test (§12.16) mocks the wrong modules and cannot prove its claimed assertions — including the R2-F2 omitted-status security gate.
- *(testing, medium)* The a11y E2E "add both routes to both lists" instruction breaks the very gate-proof test if followed literally.
- *(testing, medium)* Renderer heading-clamp does not prevent the full-page h1→h3 skip the heading-hierarchy E2E asserts; the gate proves the pinned post only, not the general owner post.
- *(ops, high)* Option-B manual deploy says "plain `npm run build`" with no working directory — running it from the repo root fails and ships stale `app/dist`.
- *(ops, high)* CLI deploy `--dir=app/dist` ships only the static dir; the Astro SSR functions are written to `app/.netlify/` — function upload is unproven for the manual path, not just Option A.
- *(ops, medium)* `deploy.yml` auto-deploys prod on every push to main — merging PR-2 auto-publishes `/admin/blog` and exposes the seed rows, contradicting the staged "flip the switch last" rollout.
- *(ops, medium)* Form-path validation errors return 303+`?error=`, not 400 — the handler-integration test (test 16) builds FormData with `redirectTo` and asserts 400, so it fails as written and blocks the green gate.
- *(ops, medium)* `docs/runbooks/deploy.md` still asserts the false "netlify.toml has base=app" and the plan's §13 runbook-update list does not include correcting it.

**Deferred:**

- No dirty-state guard against navigation/refresh loss of an unsaved body — leaves a gap in the plan's own "prevention replaces recovery" philosophy.
- Markdown preview `<details>` is keyboard-reachable but the sanitized preview's own interactive links/anchors create a nested-disclosure tab-order the plan doesn't pin.
- Plain-language requirement for error messages is asserted but the validation copy includes regex-shaped/technical fragments that a basic-English or cognitively-impaired owner won't parse.

### Round 4 — 32 raised, 29 accepted (20 substantive; dominated by scope cuts)

**Accepted findings:**

- *(security, medium)* Author-controlled `id` reaches the PUBLIC post page, not just the admin preview — R3-F3 residual record is understated.
- *(security, medium)* XSS test matrix only exercises markdown-syntax vectors; raw inline HTML (the actual attack surface) is untested and undocumented as the trust boundary.
- *(security, low)* Plan modifies the public sitemap config but ignores that it already enumerates every `/admin/*` URL publicly.
- *(security, low)* Origin-check correctness on the Netlify adapter is unpinned, though `SameSite=Lax` already neutralizes the CSRF it defends.
- *(scope, high)* In-post heading-anchor support is unscoped gold-plating that drags a security residual + two deferrals behind it.
- *(scope, high)* `blog-admin-client.ts` has grown into a parallel validation engine with no admin-surface precedent; the body-image-alt scanner is the outright-cuttable part (outside the locked decision).
- *(scope, medium)* New `/resources/blog/[slug].astro` page exists only to save one 301 hop on URLs the plan admits are unverified to have ever existed.
- *(scope, low)* Coverage `include` change pulls the 559-line shared content endpoint under `all: true`, straining the gate for ~40 lines of new code.
- *(scope, low)* Per-post OG/Twitter meta has crept past the locked enumeration; a dedicated unit-tested helper wraps a one-line concat.
- *(owner-ux, high)* Edit-form status `<select>` not pinned to render `selected={post.status}`, so a routine edit silently *unpublishes* a live post.
- *(owner-ux, medium)* "Saved" flash cannot tell the owner whether the post is actually live (draft vs published).
- *(owner-ux, low)* §12.10 live-region test can pass while announcements are silently broken if the cloned node keeps staff's hidden class.
- *(seo, low)* Per-post social meta omits `twitter:image:alt`, so X/Twitter cards ship without image alt text despite the `og:image:alt` addition.
- *(data, low)* Migration 015 verification queries depend on a fragile body-length match against gray-matter's `sanitizeMarkdownBody`, not the file bytes.
- *(a11y, medium)* Non-link text contrast on the new public blog pages is unpinned and the a11y E2E that should catch it is vacuous.
- *(a11y, medium)* Allowlisted block elements (`blockquote`, `code`, `pre`, `table`) get no `.blog-body` styling under the explicit "no typography plugin" decision.
- *(testing, high)* The `/blog` index added to the heading-hierarchy E2E gate fails on its own empty-state, and the gate is coupled to live prod DB state.
- *(testing, medium)* `format:check` is a hard CI gate but is absent from every PR's stated acceptance criteria.
- *(testing, medium)* Heading-skip-clamp and heading-id renderer rely on per-call state that is untested for reuse within a single request (admin list renders many previews).
- *(testing, medium)* Both ROADMAP test gates (full coverage, E2E green) are manual-only with unfalsifiable evidence; the coverage paste cannot distinguish new-file coverage from pre-existing `src/lib` coverage.
- *(testing, medium)* The authoring-flow E2E writes a real published post to the production DB during the LOCAL pre-merge run, before `/blog` routes exist in prod — cleanup failure leaves a stray published row that goes public on PR-4 deploy.
- *(testing, low)* The flow-test cleanup-verification "authenticated admin read or SQL" path needs the prod DB URL wired into the runner, which §12 only specifies for the migration/gate export, not for an in-test SQL fallback.
- *(ops, critical)* The stated SSR-function-upload mechanism is false: committed `netlify.toml [functions]` directory points at a non-existent path, not `app/.netlify/functions` where `ssr.zip` lives — the CLI `--dir=app/dist` deploy ships static-only and the launch SSR routes 404.
- *(ops, high)* `deploy.yml` deploys with `--dir=app/dist` from repo root (no `cd app`), contradicting the plan's own pinned "cd app && build then cd .. && deploy from repo root" two-step, and Option A is presented as merge-ready when its function upload is the unproven path.
- *(ops, high)* `deploy.md` asserts "No Netlify git integration is used" while the plan's locked Step-0 requires setting `stop_builds=true` on git-connected CI — the runbook is left internally contradictory and the operator gets no authoritative instruction.
- *(ops, medium)* Removing `blogCollection` in PR-5 and deleting `app/src/content/blog/` has no migration-ordering safeguard against a build that still reads `getCollection('blog')` at build time — `content.ts` `preloadCommonData` and `DATABASE_COLLECTIONS` retain `'blog'`.
- *(ops, medium)* Migration 015 is applied manually "once, to prod" with no rollback-on-partial-apply story beyond BEGIN/COMMIT, and the `schema_migrations` bookkeeping is written by `apply-migrations.sh` in a SEPARATE psql call after the migration — a crash between the two leaves 015 applied but unrecorded.
- *(ops, medium)* The Astro `@astrojs/sitemap` integration has NO config object today — the plan's PR-4 "add a filter" edit must introduce `sitemap({filter})` and the plan does not account for build-time vs request-time origin divergence the filter cannot fix.
- *(ops, low)* Per-merge auto-deploy under Option A means PR-1 (which edits the shared generic content endpoint) auto-deploys to prod before any blog UI exists — the plan calls PR-1/2/3 "safe" but PR-1 changes a live endpoint used by 13 other admin collections.

**Deferred:**

- Featured-image field is a raw URL text box with no thumbnail — owner cannot visually confirm the right image is attached. *(Recorded as deferred-to-V2 in the spec: "featured-image thumbnail preview in the editor".)*

## 4. Final Decision Ledger

The ledger records the durable decisions that resulted from the rounds above. The two owner-locked decisions head the ledger; the remaining entries (L-1…L-15) are the consolidated resolutions adopted across the four rounds, each tracing back to the findings that drove it. "WHY" is recorded verbatim from the planning record so the rationale survives independent of this summary.

### Owner-locked (head of ledger)

- **Authoring is DB-backed via admin panel** (owner-locked 2026-06-05) — WHY: Non-technical owners must self-publish without deploys; existing content table + admin patterns support it.
- **V1 scope is Lean MVP** (owner-locked 2026-06-05): NO categories/tags UI, RSS, pagination, scheduled publishing, related posts, search, comments, newsletter — WHY: Site published 6 posts in 2 years; ROADMAP gates this feature on no maintainability regression; deferred items get rationale in the spec, not silent omission.

### Adopted resolutions

- **L-1 — Autosave removed; replaced by client-side conditional-required publish validation.** Static required on title/slug; dynamic required on excerpt/body/date/imageAlt driven by the status select and image input. WHY: R1-F10/F32/F14/F11 — the autosave graft was the feature's largest bespoke client artifact with zero admin-surface precedent, and self-nullified in its primary scenario (baked-in `?saved=` survives error redirects and clears the backup). ~12 lines of prevention block every state-losing validation 400 before the round trip; the slug-collision warning is the single retained client aid for the one remaining state-losing 400. Residual concurrent-create risk recorded as accepted in the spec.

- **L-2 — Migration 015 is reconcile-then-import in one transaction.** DELETE seed-created blog rows (`author_email='seed@spicebushmontessori.org'` AND date-prefixed slug) before the six `ON CONFLICT DO NOTHING` inserts; `'blog'` is removed from the seed script's `CONTENT_COLLECTIONS` in the same PR. WHY: R1-F27/F28/F30/F24 — `insert-critical-data.js` verifiably seeds 6 published blog rows with filename-derived (date-prefixed) slugs into prod, so a naive import would duplicate every post instead of colliding, and every future `db:seed` run would re-create the duplicates. Step 0 becomes confirmation (expanded audit query incl. `author_email` and JSONB shape) rather than discovery.

- **L-3 — Historical seed-era URLs are preserved.** `/blog/YYYY-MM-DD-slug` handled by a generic 301 strip-prefix fallback in `/blog/[slug].astro`, plus a 3-line `/resources/blog/[slug]` → `/blog/[slug]` 301. WHY: R1-F24/F25 — the live post URLs for ~6 months were the DB seed slugs, not the markdown frontmatter slugs; the fallback fires only when the stripped slug resolves to a published post (no loops), and the pattern is confirmed against the Step 0 audit before PR-4.

- **L-4 — `PUBLIC_SITE_URL` + pinned deploy mechanism are HARD blocking dependencies of PR-4.** `PUBLIC_SITE_URL=https://spicebushmontessori.org` (prod env); merge `deploy.yml` or forbid `netlify build` for prod artifacts; both new SEO endpoints reuse the existing site-first `resolveSiteOrigin` hoisted verbatim to a shared module. WHY: R1-F22/F47/F50/F8 — prod currently emits testing-domain canonicals because the single site's `PUBLIC_SITE_URL` is the testing origin and local netlify builds inject it; v1's runtime-env-first sitemap resolver would have reproduced the exact bug. One resolver everywhere + the env fix + post-deploy canonical/og origin curl assertions close it; E2E cannot catch it from the testing host.

- **L-5 — Deployment reality is single Netlify site + single Neon DB.** Migration 015 applies once directly to prod (safe pre-PR-4 because no public routes exist); the E2E gate is a documented manual step (local dev-server run pre-merge, prod run post-deploy via `E2E_BASE_URL`); the authoring-flow E2E writes a short-lived draft to prod with guaranteed cleanup. WHY: R1-F49/F39/F41/F42 — there is no staging buffer; one siteId serves both domains with one `NETLIFY_DATABASE_URL`, and CI runs no Playwright; pretending otherwise made the v1 gates unexecutable. Draft invisibility is proven deterministically by SQL-predicate pinning units plus an HTTP-level create→404→publish→200→delete flow test (the finding's mocked-draft unit test was unimplementable since the filter lives in SQL below the mock).

- **L-6 — `ContentEntry`/`toContentEntry` frozen for blog.** Ordering is `data.date` DESC with slug DESC tiebreak via one shared comparator (public and admin); sitemap omits `lastmod`; the admin query has no status filter; the import drops the 12:00/12:01 `created_at` trick. WHY: R1-F7/F9 — `ContentEntry` exposes no timestamps and widening the shared type for one blog nicety is exactly the maintainability-gate creep to avoid; one comparator eliminates ordering drift; a status filter in the admin query was the only thing capable of hiding a stray-status row from the owner.

- **L-7 — Sanitizer URI policy pinned by tests.** Fragment links stripped (`#` removed from `ALLOWED_URI_REGEXP` in round 4 — R4-F6 cut heading anchors, leaving fragments untargetable); body URLs HTTPS-only (R3-F2); `www.`-leading hrefs normalized to `https://` via marked `walkTokens` BEFORE sanitization; relative paths deliberately blocked and documented in the admin help; featured-image URLs validated to site-relative-or-https at write time; read-path slug charset enforced in `normalizeBlogEntry` with XML-escaping in the sitemap. *(The round-2 state of this entry allowed fragments; the final policy is the R4-F6 no-anchor config — `docs/specs/blog.md`'s sanitizer block, copied verbatim from impl-plan §8.)* WHY: R1-F19/F46/F2/F1 — the most common owner link form must not silently die (and `afterSanitizeAttributes` is too late — the regexp strips the href during sanitization); the image URL and legacy-row slugs were the two owner-content inputs outside the body pipeline's trust boundary.

- **L-8 — Accessibility pins.** `forest-canopy #3E6D51` underlined links in `.blog-body` (moss-green and sunlight-gold banned for body text on light backgrounds); error flash `role="alert"` and never auto-dismissed; saved flash `role="status"` with manual dismiss and suppressed when an error is present; `imageAlt` server validation aligned to the CI a11y standard (≥6 chars, no filename/generic values); `/blog` and a post route added unconditionally to both a11y E2E lists. WHY: R1-F35/F33/F16/F37/F36 — two of the three plausible brand colors fail AA; the cloned faq flash pattern auto-hides errors and shows false "Saved" signals; a legal owner save could otherwise break CI for every developer; and v1's flagship a11y enforcement shipped with zero automated verification on the page it protects.

- **L-9 — Backslash-aware URI policy applied uniformly at all three validators** (sanitizer `ALLOWED_URI_REGEXP`, write-path image scheme, read-path `normalizeBlogEntry`), with the read-path image check living once in `normalizeBlogEntry` (template re-check deleted) and `ALLOW_DATA_ATTR`/`ALLOW_ARIA_ATTR` pinned false in the verbatim-documented DOMPurify config. WHY: R2-F1/F3/F7 — `/\evil.com` passed both v2 validators while browsers parse `\` as `/` (the exact class R1-F5 fixed in `parseRedirectPath`), and DOMPurify default-allows `data-*`/`aria-*` before consulting `ALLOWED_ATTR` — admitting admin-page script triggers (`data-admin-alert`) and ARIA spoofing. One read-path check covers all three render sites (index img, post img, ogImage) instead of a partial template duplicate.

- **L-10 — Blog requires an explicit status.** `validateBlogData` inspects the raw pre-default `payload.status` and 400s on missing/empty-after-trim; the endpoint's `|| 'published'` default never applies to blog (untouched for other collections). WHY: R2-F2 — the default runs before the hooks at `content.ts:416`, so "reject invalid status" could never catch omission; a JSON client or form refactor omitting the field would silently PUBLISH a half-written draft — a default-allow pattern on the feature's single most security-relevant state bit.

- **L-11 — All client authoring aids live in one importable module** (`app/src/lib/blog-admin-client.ts`), unit-tested in jsdom, initialized once per form at `DOMContentLoaded`, with native mirrors of every server rule (maxlength/minlength attributes; scheme/alt-quality/collision via `setCustomValidity`); the slug-collision check BLOCKS submission via `setCustomValidity`. WHY: R2-F9/F10/F12/F36 — v2's event-only inline toggle left published-post edit forms with zero protection at load, mirrored only field presence (owners following the on-screen alt guidance still lost whole posts to server 400s), left the dominant single-user collision loss unblocked, and shipped the autosave replacement with zero automated coverage. Residual state-losing 400 is now genuinely concurrent-only, recorded as such in the spec.

- **L-12 — Tight textarea interpolation** (`<textarea>{post.body}</textarea>`, prettier-ignore guarded) pinned as a deliberate deviation from the faq clone, with `normalizeBlogData` trimming body/excerpt as backstop; proven by a no-op edit round-trip phase in the authoring-flow E2E (render-level unit test rejected — `.astro` cannot run under Vitest, no Container API). WHY: R2-F8 (+F6 constraint) — every existing admin textarea renders with template indentation, safe only because `parseSimpleValue` trims; the `_raw` path deliberately removes that trim, so the cloned pattern would prepend whitespace on every edit-save, turning the owner's first paragraph into a markdown code block, compounding per save; FormData-built tests structurally cannot catch it.

- **L-13 — Sitemap urlset building + `escapeXml` live in `blog-content.ts`** (endpoint is a thin shell); coverage include is exactly `['src/lib/**/*.ts','src/pages/api/admin/content.ts']`; the coverage gate is a recorded manual `test:coverage` step per PR with named branches; sitemap URLs are slashless matching the canonical form, asserted as exact `<loc>` strings. WHY: R2-F5/F35/F17 — v2's admin-API glob buried gate evidence under ~9 out-of-scope endpoints at 0% while the sitemap endpoint's inline logic sat outside every glob (no coverage evidence for one of two new endpoints); CI never runs coverage so an undocumented gate was unenforceable; substring sitemap tests could not detect a URL form mismatching the canonicals. *(Refined in R4-F9: coverage `include` kept at `src/lib/**` only; the round-3 "narrowed include" label was corrected — it was a widening.)*

- **L-14 — E2E gate command pinned to `--project=chromium`** with worker-unique flow-test slugs (`e2e-flow-${projectName}-${workerIndex}-${Date.now()}`) and a non-chromium `test.skip` guard; prod cleanup verified via the delete response + an uncached surface (authenticated admin read or SQL), never the public 404; `E2E_ADMIN_SESSION` handled as a secret (fresh per run, never recorded, revoked after); 401/303 auth assertions live in E2E request-context, the endpoint unit asserts only 403. WHY: R2-F31/F4/F32 — the 7-project `fullyParallel` config would run the prod-writing flow test 7x concurrently with colliding timestamp slugs; the public-404-after-delete check is cross-instance cache-flaky for the 5-min TTL; the session cookie grants full admin for 12h and must not leak via PR text or shell history; the 401/303 split lives exclusively in middleware that no unit harness executes.

- **L-15 — Owner content is normalized/validated to the CI a11y invariants end-to-end.** Body markdown images require publish-time alt quality (same bar as the featured image); the renderer clamps heading-level skips and emits NO heading ids (`id` is not in `ALLOWED_ATTR`, fragment hrefs are stripped — R4-F6); the `.blog-body` link pin is a concrete exact-value E2E assertion (count>0, `rgb(62,109,81)`, underline). WHY: R2-F26/F27/F29 — a legal `![](url)` publish was a live WCAG 1.1.1 failure that would break the pinned alt-text E2E route on the next owner edit (R1-F37's exact class); one legal `####` would break the heading-hierarchy gate; fragment links were pinned-allowed but structurally untargetable (marked v16 emits no ids, `ALLOWED_ATTR` stripped `id`); v2's contrast instruction pointed at a vacuous block that only visits `/`, shipping the flagship pin unverified. *(Note: R4-F6/R4-F7 later cut the in-post heading-anchor support and the body-image-alt client scanner as gold-plating outside the locked decision; the server-side alt quality bar and the heading-clamp renderer were retained.)*

- **L-16 — Empty-string optional fields normalized away.** `image`, `imageAlt`, `seoTitle`, `seoDescription`, `date` are deleted at normalize, treated as unset by validation (non-empty-after-trim), coerced to `undefined` on read; the post page's meta fallbacks use `||` not `??`; new owner slugs are barred from the `^\d{4}-\d{2}-\d{2}-` legacy-redirect namespace. WHY: R2-F20/F19 — the form always submits the optional keys and `''` is not nullish, so v2 would have shipped empty `<title>`/description for every post with blank SEO overrides (the default case), breaking an explicit V1 goal; date-shaped owner slugs would overlap the 301 fallback's input space, letting a draft's URL 301 to another post and then change meaning at publish.

- **L-17 — Netlify git-connected CI neutralized** (`build_settings.stop_builds=true`) as a Step-0 hard blocker for PR-4; migration runs pin `env:get --context production` with a mandatory target-host echo patched into `apply-migrations.sh`; `PUBLIC_SITE_URL` set across ALL deploy contexts; gate runs use `npm run dev`, never `netlify dev`; if `deploy.yml` is merged, one verification deploy must prove the SSR function uploads (`netlify.toml` has no `base` key — `base=app` is UI-only, CLAUDE.md gotcha corrected). WHY: R2-F38/F40/F41 — the site is git-connected to branch `testing` with builds armed and a proven historical prod deploy; any stray push would production-deploy stale code over the launch (removing the blog routes while DB rows and the submitted sitemap persist) or race a revert-PR rollback; `env:get` defaults to the dev context and the runner prints no host, so an empty fetch could silently migrate localhost; the dev-context testing origin would fail prod-origin canonical assertions confusingly under `netlify dev`.

- **L-18 — Per-post social meta complete and indexability asserted, not assumed.** `twitter:image` shares `resolvedOgImage` with `og:image`; `og:image:alt` and `article:published_time` emitted; `robots index,follow` (and absence of `googlebot-noindex`) asserted in E2E test 19 and the launch curls; Step 0 audits the settings rows behind `seo_global`/`seo_page_overrides`; the PR-2→015 window guarded by a freeze note + mandatory pre-flight re-audit + documented remediation. WHY: R2-F15/F16/F21 — Layout emits one value to both image tags today, so an og-only override ships wrong X/Slack/iMessage cards on every post with no check catching it; `noindex` is DB-stored state the platform supports flipping, and shipping the launch noindexed would be invisible to every planned canonical-origin check while Search Console submits noindexed URLs; a single pre-015 admin edit re-authors a seed row out of the DELETE predicate, producing the duplicated-post failure the reconciliation exists to prevent.

## 5. Standing Deferrals (carried out of V1)

These were raised, judged real, and explicitly NOT actioned in V1. They are recorded so the omission is a decision, not an oversight (per OL-2).

- **Meta-description length capping** — post meta descriptions inherit the untrimmed excerpt; deferred to V2. (R2 deferral.)
- **Featured-image thumbnail preview in the editor** — the field is a raw URL text box; owner cannot visually confirm the attached image. Deferred to V2. (R4 deferral.)
- **Dirty-state navigation/refresh guard** — no guard against losing an unsaved body to navigation or refresh; a recognized gap in the plan's "prevention replaces recovery" stance. (R3 deferral.)
- **Plain-language error copy** — validation messages still contain regex-shaped/technical fragments that a basic-English or cognitively-impaired owner may not parse. (R3 deferral.)
- **Nested-disclosure tab order in the markdown preview** — the sanitized preview's own interactive links inside the `<details>` create a tab order the plan does not pin. (R3 deferral.)
- **Failed-form identification** — validation errors do not name which form failed, and the failed form re-renders collapsed. (R1 deferral.)
- *(Subsumed)* Autosave-backup self-nullification (R1 deferral) — no longer applicable: the autosave machinery was cut in full (L-1).
