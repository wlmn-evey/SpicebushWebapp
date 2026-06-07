# Decision Log: Blog V2 (Full CMS Featureset onto Live V1) Planning Process

> **Status:** audit trail (closed after Round 4). **Date:** 2026-06-06.
> **Companion artifacts:** the V2 implementation plan, ADR-009 (storage/editor fork), and ADR-010 (AI subsystem) are the *designated, forthcoming* homes for the decisions recorded here. None of them exist yet — **this document is the first V2 artifact.** The prior cycle's record lives in `docs/plans/blog-decision-log.md` (V1, lean-MVP).
>
> This document is the audit trail for how the Blog V2 plan was produced: the owner's 2026-06-06 directive that bounded the design space, the seed ledger, the judge-panel selection of a base plan, the four adversarial stress rounds and what each accepted or deferred, and the final decision ledger. It is a factual record of the planning process — not a description of the feature and not a sales pitch.
>
> **Posture note (V2 inverts V1).** V1 was judged on adding the *least* durable maintenance surface that met the owner need (a Lean MVP). V2 is the deliberate opposite: the owner directed that the **full** `spec/blog-cms` featureset be brought onto the live V1 blog. The narrative below is therefore about safely *adding* a large featureset under hard invariants, not about minimizing surface area.

## 1. Owner Directive (2026-06-06)

On 2026-06-06 the owner directed that the full `spec/blog-cms` featureset be brought into the live V1 blog. This directive bounded every downstream choice; it is not a finding and was not subject to stress-round revision. Every accepted finding below was evaluated against it and against the V1 invariants it carries.

**IN scope (owner-directed):** TipTap editor; AI writing + voice system (selection toolbar, panel AI, SEO AI, voice corpus / style profile / anti-patterns / voice instructions / few-shot); ticker (homepage section + header strip + `/admin/ticker`); categories + tags with public filtering; staff + virtual authors with bio blocks; scheduled publishing; archived state; pagination; related posts; social share buttons; reading time; RSS feed; JSON-LD Article; analytics view tracking; dashboard filtering/sorting/bulk actions.

**OUT of scope (old plan's own exclusions + standing):** newsletter / email distribution (#34); comments; post versioning (#36); i18n; multi-author edit locking.

### Bounding decisions carried into the directive

- **Editor = TipTap.** The owner's prior pick, reaffirmed 2026-06-06 — **not revisitable.** The open question is *storage*, not the editor: TipTap HTML storage vs. TipTap-markdown round-trip preserving V1's pipeline. That **storage fork is OPEN** and must be resolved in Phase 1 + **ADR-009**, with a migration story for the 6 live markdown posts and explicit re-validation that V1's sanitizer security properties hold under the winner (no ids; fragments stripped; HTTPS-only body URLs; `ALLOW_DATA_ATTR`/`ALLOW_ARIA_ATTR` false).
- **AI subsystem is the LAST phase** and gets its own **ADR-010**. Key-optional by design: the school's Anthropic API key is configured via admin settings (encrypted at rest), and every AI affordance is hidden/disabled when no key is configured. Model selection per the current claude-api reference; per-action cost estimates required.
- **PHASING LAW.** The roadmap consists of independently-shippable phases, each leaving the live blog healthy, each with its own acceptance criteria + rollout/rollback, each built by a separate build workflow with a user checkpoint between phases. Storage/editor = Phase 1. AI = last phase.
- **V1 invariants (non-negotiable):** the 6 live posts keep their URLs and content; draft invisibility; sanitizer rigor equivalent or stronger; cache semantics (≤5 min staleness) preserved or improved with rationale; supervised rollout boundary (agents never mutate prod; merges supervised; every merge to main auto-deploys); per-step stacked PRs within a phase; gates green per PR (`lint --max-warnings=0`, typecheck, full vitest, `format:check`).
- **Field-name reality.** V1 data keys are `image`/`imageAlt`/`seoTitle`/`seoDescription`/`date`; the old spec used `featured_image`/`seo_title`/`og_image`/`published_at` and lacks `imageAlt`. The plan must define the canonical schema, map every conflict, and never break reads of the 6 live rows.
- **Prerequisite carried forward.** The owner's authenticated write-path verification (session task #8) must be complete before the FIRST build workflow launches. Planning is unblocked.

The full text of the directive, the bounding decisions, and the V1 invariants is reproduced verbatim as the Final Decision Ledger in §4 — because the directive *was* the ledger (see the note there).

## 2. Judge Panel: Base Plan Selection

Three candidate plans were authored independently and scored by a judge panel. The panel selected a single winner to serve as the base plan that the subsequent stress rounds revised.

| Candidate | Score | Outcome |
|---|---|---|
| **minimal-delta** | **126.5** | **Winner — adopted as base plan** |
| risk-first | 118.5 | Not adopted |
| owner-experience | 116 | Not adopted |

**Winner:** minimal-delta, by a +8.0-point margin over risk-first (2nd) and a +10.5-point margin over owner-experience (3rd).

Adopting minimal-delta set the plan's default posture toward changing the live V1 blog as little as possible while landing the directed featureset — the posture most aligned with the V1 invariants that the directive declared non-negotiable. (Only candidate names and scores were carried into the seed ledger; no candidate descriptions or per-judge rationale are recorded, so none is reconstructed here.)

## 3. Stress Rounds

Each round was an adversarial review pass across the concern domains used for V2: security, ai-security, cost-ops, v1-compat, scope, owner-ux, seo, a11y, testing. Findings were raised, then individually accepted (folded into the plan as a revision) or deferred (not actioned). Severity tags (critical / high / medium / low) and domain tags are preserved exactly as raised.

**Aggregate:**

| Round | Raised | Accepted | Substantive | Deferred |
|---|---|---|---|---|
| 1 | 39 | 35 | 32 | 4 |
| 2 | 31 | 29 | 26 | 2 |
| 3 | 28 | 27 | 23 | 1 |
| 4 | 23 | 23 | 20 | 0 |
| **Total** | **121** | **114** | **101** | **7** |

"Substantive" counts the accepted findings that changed plan content materially (versus minor clarifications). Deferred = Raised − Accepted. The descending raised/accepted counts across rounds (39 → 31 → 28 → 23) indicate convergence: each pass found fewer new defects, and Round 4 accepted every finding it raised with zero deferrals.

> **On deferred findings.** The seed ledger that this audit trail is built from enumerates **only the accepted findings** of each round. The deferred findings are known by **count only** (R1: 4, R2: 2, R3: 1, R4: 0 — total 7); their individual texts were **not carried into the seed ledger** and are not reconstructed here. They are recorded as a count so the gap between *raised* and *accepted* is an explicit, traceable number rather than a silent omission.

### Round 1 — 39 raised, 35 accepted (32 substantive), 4 deferred

**Accepted findings:**

- *(security, high)* scheduled→published cron flip bypasses `validateBlogData` publish gates (regresses invariant #4).
- *(security, high)* Ticker/author settings write-validation is bypassable via the generic `/api/admin/settings` endpoint → stored XSS on site-wide ticker.
- *(security, high)* Legacy categories/tags must be canonicalized on read, never charset-rejected, or invariant #1 breaks.
- *(security, medium)* AI key read path: `isAiConfigured`/`admin_settings` reader must return a boolean, never the key ciphertext or plaintext.
- *(ai-security, critical)* AI rate-limit / spend breaker is specified in-memory, but Netlify is serverless — the cost-blowout guard is unenforced and bypassable.
- *(ai-security, critical)* Corpus URL extraction: the named library (`@extractus/article-extractor`) does its own internal fetch, bypassing the plan's SSRF-hardened fetcher.
- *(ai-security, high)* Overbroad claim "AI output is sanitized by the unchanged pipeline, no privileged path" is false for AI-written SEO fields (`validateBlogData` only length-checks them).
- *(ai-security, high)* Voice corpus and style profile are stored in the public-content `settings` table, which is dumped wholesale by `GET /api/admin/settings` and shares a cache/read path with public pages.
- *(ai-security, medium)* Prompt-injection "delimited as data" has no defense against corpus/owner text that breaks the delimiter or rewrites SEO toward attacker goals.
- *(ai-security, medium)* Key-decryption logging hygiene and master-key handling are unspecified; the API key error path historically leaks via redirect query strings.
- *(cost-ops, high)* Opus 4.8 AI draft/voice calls can exceed Netlify's 60s synchronous-function cap and die at runtime.
- *(cost-ops, medium)* Per-action AI cost estimates are below the arithmetic floor and ignore the per-request voice prefix; the one caching lever that makes the budget real is never invoked.
- *(cost-ops, medium)* Phase 5's "GA4-only avoids a DB schema change" is factually false — the analytics DB surface already exists and the valuable dashboard-counts piece is wrongly deferred.
- *(cost-ops, low)* §4 misstates the Scheduled Function mechanism vs the repo's proven convention; verify against the 30s scheduled-function cap.
- *(v1-compat, critical)* The 6 live posts' categories/tags are silently destroyed by the V1 edit-save path; Phase 1 touches that path before Phase 2 restores round-trip — off-ramp is data loss.
- *(v1-compat, medium)* Scheduled-publish acceptance criterion claims the cron "invalidates the cache" — but the cache is per-process, so the cron's invalidate call is a no-op for live SSR instances.
- *(v1-compat, low)* Admin dashboard sorts scheduled posts by `date`, but a scheduled post may have empty `date` (`publishedAt` is the trigger) — they sort to the bottom under "undated-last".
- *(scope, high)* Editor drops the media-library image integration that the old featureset requires (the exact Phase-3 blocker the old plan flagged).
- *(scope, medium)* Tag filtering is gold-plated from a click-filter into standalone SEO-indexable routes added to the sitemap.
- *(owner-ux, high)* TipTap island mounting collides with V1's single-page accordion: N+1 editors hydrate at once, and the plan never reconciles it.
- *(owner-ux, medium)* Voice corpus reintroduces the exact inauthentic-content failure mode the original design rejected.
- *(owner-ux, medium)* New scheduled/archived states silently regress the status-aware save-confirmation that exists to stop owners mistaking a draft for live.
- *(owner-ux, low)* Scheduling promises a date but runs an hourly clock with no timezone semantics, so posts can surface on the wrong day.
- *(seo, high)* New taxonomy/pagination routes land in NO sitemap — the plan targets the wrong sitemap integration, defeating its own indexability rationale.
- *(seo, medium)* JSON-LD Article block will be corrupted: the plan reuses `escapeXml` on JSON, which entity-escapes quotes and produces invalid JSON.
- *(seo, medium)* RSS `pubDate` cannot validate as RSS 2.0 — only a `YYYY-MM-DD` date exists, but RSS 2.0 requires RFC-822 dates.
- *(seo, medium)* Thin/near-duplicate taxonomy pages will be indexed and sitemapped with only 6 posts — no `noindex` or minimum-count threshold is specified.
- *(a11y, high)* Ticker acceptance criteria omit a manual pause/stop control and a reduced-motion path for the header strip — WCAG 2.2.2 / 2.1.1 fail baked into the spec.
- *(a11y, medium)* Phase 1 editor acceptance criteria contain zero accessibility gate for the primary authoring surface (toolbar names, image-dialog focus/alt-label, source-toggle keyboard) — WCAG 4.1.2 / 2.1.1.
- *(a11y, medium)* AI selection ("floating"/Bubble) toolbar in §6 specifies no keyboard invocation, focus handling, or screen-reader announcement — WCAG 2.1.1 / 4.1.2 / 4.1.3.
- *(a11y, medium)* Drag-to-reorder (ticker items and AI voice instructions) is specified with no keyboard or pointer-alternative — WCAG 2.1.1 / 2.5.7.
- *(testing, high)* Phase-1 round-trip gate and editor island tests collide with the jsdom/ProseMirror layout wall — no test setup or precedent exists for either.
- *(testing, high)* Every phase's E2E acceptance criteria has no execution path: the harness has no authenticated-browser-UI capability and E2E is not in CI.
- *(testing, high)* Phase 7 AI-mode tests have no mock boundary defined — as specified they either get zero automated coverage or call the live API (secret-in-CI + spend).
- *(testing, medium)* Gate-mapping omits that V1 makes E2E a manual recorded gate, not CI — leaving per-phase E2E acceptance with no assigned runner, environment, or rollout sequencing.

**Deferred:** 4 findings were raised and not accepted. Their individual texts were not carried into the seed ledger; they are recorded here by count only.

### Round 2 — 31 raised, 29 accepted (26 substantive), 2 deferred

**Accepted findings:**

- *(security, high)* Plan attributes a CSRF/Origin check to `/api/admin/settings` that does not exist; ticker + AI-key writes routed there are CSRF-exposed.
- *(security, medium)* Phase 7 assumes an `admin_settings` write path that does not exist anywhere in the codebase.
- *(security, low)* R1-F15 data-loss finding cites the wrong file for the load-bearing upsert (right line, wrong path).
- *(ai-security, critical)* `crypto.ts` AES-256-GCM spec omits per-encryption random IV/nonce + auth-tag discipline — GCM nonce reuse would break the API key at rest.
- *(ai-security, high)* Corpus-URL SSRF defense is resolve-then-fetch — vulnerable to DNS-rebinding TOCTOU because the fetch re-resolves the hostname at connect time.
- *(ai-security, high)* AI spend/mutation endpoints will likely ship without Origin/Sec-Fetch CSRF — the in-repo AI POST precedent (`gemini-suggest.ts`) has none, contradicting §7's "reuse" claim.
- *(cost-ops, high)* The mechanism chosen to resolve R1-F11 (long Opus calls via "the repo's existing background-function job pattern") misidentifies the cited file: it is a 30s-capped scheduled cron drain, not an on-demand background function — the pattern the AI phase needs does not exist in the repo and must be built.
- *(cost-ops, medium)* The "60s synchronous cap" the latency split is designed against is wrong — Netlify synchronous functions cap at 10s (default), upgradable to 26s only on Pro/Enterprise; the existing 24s gemini timeout already proves a plan-tier dependency the plan never states.
- *(cost-ops, medium)* Model-tier escalation (old plan: Sonnet-for-generation ~$0.50/mo) to Opus 4.8 is the unacknowledged cause of the very latency that breaks the synchronous path — the tier choice and the async-infra cost are coupled, and the plan treats them as independent.
- *(v1-compat, high)* Phase 2 status-whitelist widening inverts an existing passing unit test the plan never flags — build goes red, and the user-facing error copy goes stale.
- *(v1-compat, high)* The load-bearing V1 E2E body-round-trip / draft-invisibility test depends on the inline `/admin/blog` textarea that Phase 1's default page-structure removes — the plan's R1-F37 covers the harness generically but never flags THIS test for migration.
- *(v1-compat, medium)* Canonical schema table mislabels `body` (and effectively `status`/`title`) as a "column" when `body` actually lives in the `data` JSONB; a build agent reading the plan as authoritative may add a nonexistent `body` column.
- *(scope, medium)* Resurrected `data.canonicalUrl` field duplicates the already-shipped per-path canonical-override mechanism.
- *(scope, low)* Phase 6 "parallel with 3/4/5" contradicts the PHASING LAW's required checkpoint between phases.
- *(owner-ux, high)* Faithful post preview silently dropped from the new editor surface — owner loses the only "what visitors will see" check.
- *(owner-ux, high)* A scheduled post whose auto-publish has lapsed shows the owner no failure signal and no self-service recovery.
- *(owner-ux, medium)* Style Profile shows the owner raw analytic jargon (Flesch-Kincaid grade, pronoun ratio, vocabulary range) with no plain-language translation.
- *(owner-ux, medium)* Two scheduling gestures, only one works: `status=Published` + future date silently publishes immediately.
- *(owner-ux, medium)* No unsaved-changes guard on the richer in-place editor invites whole-post loss on accidental navigation.
- *(owner-ux, low)* Ticker and the existing `AnnouncementBar` are two overlapping rotating-banner systems with no owner guidance on which to use.
- *(seo, high)* Per-route `noindex,follow` thresholds (R1-F31, R1-F21) are unbuildable against the live SEO architecture.
- *(seo, medium)* Per-post JSON-LD Article (Phase 4) needs a Layout head-injection path the plan does not budget.
- *(a11y, medium)* Public filter & pagination controls (Phase 3) have NO accessibility spec — the one in-lens surface no R1-F finding touches.
- *(a11y, medium)* R1-F34 still permits a 3s auto-dismissing AI error — contradicting V1's settled WCAG-2.2.1 convention at `blog.astro:67`.
- *(a11y, medium)* R1-F34 mandates "focus moves into the menu + selection intact," but a stock TipTap `BubbleMenu` (old plan F7.1) cannot deliver both — web-verified mechanism conflict.
- *(testing, high)* Editor/ticker/AI accessibility gates are assigned to verifiers (jsdom/axe) that cannot observe the properties they gate, while the only real verifier is left optional.
- *(testing, high)* The spend-breaker "two concurrent invocations" test cannot verify atomicity, the exact property guarding against cost blowout — and the cited precedent is a non-atomic read-only counter.
- *(testing, medium)* No gate verifies the Scheduled Function is actually registered and firing in production; a silently-dead cron is invisible to all-green CI.
- *(testing, medium)* The round-trip fidelity gate covers stored fixtures but not the live editor's input-rule/paste transforms, which can produce lossy markdown on NEW authoring.

**Deferred:** 2 findings were raised and not accepted. Texts not carried into the seed ledger; recorded by count only.

### Round 3 — 28 raised, 27 accepted (23 substantive), 1 deferred

**Accepted findings:**

- *(security, medium)* V1 body-sanitizer invariant is mis-stated as "HTTPS-only body URLs" — the actual `ALLOWED_URI_REGEXP` also permits `mailto:` and `tel:`.
- *(security, medium)* Scheduled-publish cron's unguarded `::timestamptz` cast lets one malformed row block ALL due posts from publishing.
- *(security, medium)* Phase 5 surfaces attacker-forgeable view counts as authoritative admin metrics; `page_path` is client-controlled on a public unauthenticated endpoint.
- *(security, low)* Ticker render-time href validation reuses `IMAGE_SCHEME_REGEX`, which forbids the `mailto:`/`tel:` and protocol-relative-image schemes a real link ticker may legitimately need — and is the wrong validator for link hrefs.
- *(ai-security, high)* AI subsystem has a daily spend cap but no request-rate limit — the old plan's per-session throttle was dropped, leaving budget-DoS and 429-storm vectors open.
- *(ai-security, low)* AI/spend routes inherit `content.ts`'s CSRF check, which by its own comment FAILS OPEN when both Origin and Sec-Fetch-Site headers are absent — higher-stakes for paid routes than for content writes.
- *(cost-ops, high)* Inline AI routed to Haiku 4.5 but the plan mandates an `effort` setting Haiku rejects with a 400.
- *(cost-ops, medium)* Per-action cost estimate omits Opus adaptive-thinking tokens, understating the "honest" UI figure.
- *(cost-ops, medium)* Mandated 5-minute ephemeral prompt cache is counterproductive at human authoring cadence.
- *(v1-compat, high)* Phase 1/2 omit migrating `blog-admin-client.ts` — the live client-side publish-required guard binds to the `data.body_raw` textarea and the `'published'` literal.
- *(v1-compat, low)* R2-F16 option (a) prescribes a `.prose` preview container that does not match the public `.blog-body` rendering and resolves to no styling.
- *(scope, medium)* Scheduled-publish recovery sub-cascade (Overdue state + Publish-now + canary firing-gate + runbook) is excess scaffolding the hourly-cron choice creates for itself.
- *(scope, medium)* The async AI subsystem (second new `ai_jobs` table + new background-function type + poll endpoint + admin polling UI) is built as the DEFAULT path, when the ledger-permitted Sonnet-synchronous approach the old plan used eliminates it entirely.
- *(owner-ux, medium)* Dashboard keeps V1's accordion-per-post list; the old spec's scannable table (the structure that makes filter/sort/bulk-select usable) is never committed to.
- *(owner-ux, medium)* Scheduling a not-yet-finished post fails with a raw validation 400 because R1-F1 now requires the full publish gate at save, but no scheduling UI tells the owner "a scheduled post must be publish-ready".
- *(seo, high)* `noindex,follow` category pages will still emit `googlebot:noindex,nofollow` (`Layout:66`) — kills the link equity the policy exists to preserve.
- *(seo, medium)* JSON-LD Article omits `dateModified` (and publisher) required by old spec §6; the data is discarded by shared infra, so it is not the budgeted "pure additive reuse".
- *(seo, medium)* Pagination introduces `/blog` and `/blog/page/1` as duplicate self-canonical URLs with no `n=1` handling specified.
- *(a11y, medium)* R1-F32's prescribed ticker `aria-live="polite"` is itself an a11y defect for an auto-rotating ticker (announcement spam).
- *(a11y, medium)* New public blog surfaces inject headings into an outline anchored at the page h1, with no specified heading level — breaks SR document navigation.
- *(a11y, medium)* R1-F33 names every editor control EXCEPT the `contenteditable` editing surface itself — the primary authoring region has no accessible name.
- *(a11y, low)* Social share anchors (Facebook, X, email) have no specified accessible name — only the copy-link control is covered.
- *(testing, high)* Required Phase-1 a11y/focus/island gates are routed to a CI layer that cannot run them, and the repo has zero precedent for testing a React component at all.
- *(testing, high)* Phase-2 status-whitelist test promised as "CI-automated" but the cron schedule-firing path it depends on has no CI home, and the handler unit test cannot exercise the cast predicate against a real timestamptz.
- *(testing, medium)* "Typography/smart-quote input rules asserted off" is listed as a CI unit test but input rules are unobservable via the view-less serializer.
- *(testing, medium)* The REQUIRED local-webServer Playwright fixture never sources a database, yet every editor/ticker/AI a11y gate that creates posts depends on it.
- *(testing, medium)* Phase-7 "no AI message auto-hides on a timer" and BubbleMenu-focus gates are listed as CI unit tests but depend on timer/focus/visibility behavior that jsdom cannot faithfully exercise.

**Deferred:** 1 finding was raised and not accepted. Text not carried into the seed ledger; recorded by count only.

### Round 4 — 23 raised, 23 accepted (20 substantive), 0 deferred

Round 4 accepted every finding it raised; there were no deferrals.

**Accepted findings:**

- *(security, medium)* Scheduled-publish input `publishedAt` has no specified write-time format/range validation (only a cron-read regex guard).
- *(security, low)* New `scheduled`/`archived` blog states rely solely on application-level status validation; `content.status` has no DB CHECK constraint.
- *(ai-security, high)* Corpus URL-extraction fetch has no committed read-timeout or response-size cap — SSRF criteria only cover the connection target.
- *(ai-security, medium)* Per-window request-rate limiter is scoped to "before any Anthropic call" and does not gate the corpus-ingestion fetch — the SSRF/cost primitive is reachable at full rate.
- *(ai-security, medium)* Key-rotation runbook does not distinguish rotating the Anthropic key from rotating the AES master key — master-key rotation silently fails-closed all AI and orphans the stored ciphertext.
- *(cost-ops, high)* "Default Sonnet completes synchronously" is unverified for the draft action and contradicts the plan's own ≤10s fallback.
- *(cost-ops, medium)* 1-hour prompt-cache TTL is a net cost INCREASE for this bursty single-author workload, not a saving.
- *(cost-ops, medium)* No per-action `max_tokens` ceiling makes the "honest" per-action cost figure an estimate, not a bound.
- *(v1-compat, high)* Phase 2/3 author model has no defined legacy `data.author` byline fallback — the 6 live rows risk losing their bylines.
- *(v1-compat, medium)* Phase 3 pagination never pins a page size; a size <6 regresses live E2E `blog.spec.ts` test 18's `>=6 post links` assertion.
- *(v1-compat, medium)* Ticker and virtual-author bios live in the `settings` table (30-min TTL), contradicting the plan's repeatedly-invoked ≤5-min staleness invariant.
- *(owner-ux, high)* Archived is a roach motel: no owner-facing way back out, and "Archived" is invisible in the editor status model.
- *(owner-ux, high)* Anti-pattern "detect and rewrite" is unspecified as in-prompt vs. a second Claude call — if it is a second call, every AI action silently costs ~2x and the surfaced cost estimate is wrong.
- *(owner-ux, medium)* Bulk delete inherits no confirmation, while single delete carries an explicit "cannot be undone" prompt — an asymmetric data-loss footgun on the new table.
- *(seo, high)* Category route URL shape is unpinned; a query-param shape silently collapses every category canonical to `/blog` and breaks the entire ≥2-member index/noindex/sitemap design.
- *(seo, medium)* Shared-Layout robots/googlebot third-state refactor is sitewide but only blog routes are regression-gated; existing hard-noindex pages could silently gain "follow".
- *(seo, low)* Article JSON-LD CI omits `image` and a headline-length guard; the only catch is the post-deploy manual Rich Results gate.
- *(a11y, medium)* Header ticker strip adds tab-stops to global chrome above the nav with no skip link (WCAG 2.4.1 Bypass Blocks).
- *(a11y, medium)* TipTap toolbar toggle buttons have no enumerated pressed/current state (WCAG 4.1.2 Name, Role, Value).
- *(a11y, low)* Public ticker per-item "type" indicator may convey meaning by color alone (WCAG 1.4.1 Use of Color).
- *(testing, high)* Per-phase gate mapping puts Astro render-time assertions in the CI-unit tier with no render harness — Phase 4 `<head>` emission and Phase 5 `page_path` auto-escaping both.
- *(testing, medium)* Required authenticated-browser Playwright fixture: page-level cookie bootstrapping is unspecified and unproven by the one spike that gates it.
- *(testing, medium)* PR2 spike exercises the `EditorView` path but the per-PR CI round-trip invariant rides the view-less serializer — no headless go/no-go before PR3 adopts it.

**Deferred:** none.

## 4. Final Decision Ledger

The Blog V2 ledger is the owner directive of 2026-06-06 as given — **it is identical to the seed ledger.** This is a deliberate, meaningful outcome, not an omission: the owner-locked directive and the V1 invariants *bounded* the four stress rounds rather than being revised by them, and the rounds' 114 accepted findings landed in the **phased implementation plan** (each finding maps to the phase whose acceptance criteria, rollout, or rollback it corrects), not in new top-level ledger decisions. The V2 ledger therefore has the structure of a constraint set, not the V1-style list of round-derived resolutions (V1's L-1…L-18). The one item the ledger explicitly leaves OPEN — and the only ledger-level decision still to be made — is the **TipTap storage fork**, to be resolved in Phase 1 + ADR-009.

The ledger is reproduced verbatim below.

- **Owner decision 2026-06-06:** bring the FULL `spec/blog-cms` featureset into the live blog — IN: TipTap editor, AI writing + voice system (selection toolbar, panel AI, SEO AI, voice corpus/style profile/anti-patterns/voice instructions/few-shot), ticker (homepage section + header strip + `/admin/ticker`), categories + tags with public filtering, staff + virtual authors with bio blocks, scheduled publishing, archived state, pagination, related posts, social share buttons, reading time, RSS feed, JSON-LD Article, analytics view tracking, dashboard filtering/sorting/bulk actions.
- **OUT** (old plan's own exclusions + standing): newsletter / email distribution (#34), comments, post versioning (#36), i18n, multi-author edit locking.
- **Editor = TipTap** (the owner's prior pick, reaffirmed 2026-06-06 — not revisitable). The STORAGE fork (TipTap HTML storage vs TipTap-markdown round-trip preserving V1's pipeline) is OPEN and must be resolved in Phase 1 + ADR-009, with a migration story for the 6 live markdown posts and explicit re-validation that V1's sanitizer security properties (no ids, fragments stripped, HTTPS-only body URLs, `ALLOW_DATA_ATTR`/`ALLOW_ARIA_ATTR` false) hold under the winner.
- **AI subsystem is the LAST phase** and gets its own ADR-010. Key-optional by design: the school's Anthropic API key is configured via admin settings (encrypted at rest), and every AI affordance is hidden/disabled when no key is configured. Model selection per the current claude-api reference; per-action cost estimates required.
- **PHASING LAW:** the roadmap consists of independently-shippable phases, each leaving the live blog healthy, each with its own acceptance criteria + rollout/rollback, each built by a separate build workflow with a user checkpoint between phases. Storage/editor = Phase 1. AI = last phase.
- **V1 invariants (non-negotiable):** the 6 live posts keep their URLs and content; draft invisibility; sanitizer rigor equivalent or stronger; cache semantics (≤5 min staleness) preserved or improved with rationale; supervised rollout boundary (agents never mutate prod; merges supervised; every merge to main auto-deploys); per-step stacked PRs within a phase; gates green per PR (`lint --max-warnings=0`, typecheck, full vitest, `format:check`).
- **Field-name reality:** V1 data keys are `image`/`imageAlt`/`seoTitle`/`seoDescription`/`date`; the old spec used `featured_image`/`seo_title`/`og_image`/`published_at` and lacks `imageAlt`. The plan must define the canonical schema, map every conflict, and never break reads of the 6 live rows.
- **Prerequisite carried forward:** the owner's authenticated write-path verification (session task #8) must be complete before the FIRST build workflow launches. Planning is unblocked.

## 5. Open Item (carried into the build phases)

- **TipTap storage fork (OPEN).** HTML storage vs. TipTap-markdown round-trip preserving V1's pipeline. To be resolved in Phase 1 and recorded in ADR-009, with the 6-live-post migration story and explicit re-validation of V1's sanitizer security properties under the chosen storage. This is the only ledger-level decision the four rounds left unmade.

## 6. Deferred Findings (carried out of the rounds)

Across the four rounds, 7 findings were raised and not accepted (R1: 4, R2: 2, R3: 1, R4: 0). The seed ledger that this audit trail is built from enumerates only the accepted findings; the **individual texts of the deferred findings were not carried into it.** They are recorded here by count so the raised-minus-accepted gap is an explicit, traceable number rather than a silent omission. Their specifics are not reconstructed because no source for them exists in the planning record available to this log.

## 7. Owner Overrides (2026-06-07)

Two owner directives, given after the four stress rounds and after ADR-009/ADR-010 were drafted, reverse two earlier decisions. They are owner directives, not new stress-round findings; the verbatim ledger in §4 is unchanged (the owner's IN/OUT scope, the V1 invariants, and the PHASING LAW all stand). What changed is the storage winner of the previously-OPEN fork (§5) and the AI execution model. Both are settled, not re-openable. The implementation plan §§0–17, ADR-009, and ADR-010 are revised in place to reflect them.

- **Override 1 — STORAGE = TipTap HTML (closes the §5 OPEN fork; reverses ADR-009's Markdown round-trip / Option B).** Owner: *"fix the plan to produce the fully functional html data like tiptap wants. I would rather have it correct."* `data.body` now stores TipTap HTML; underline, text-align, and TABLES are first-class WYSIWYG (the markdown-source-toggle deferral for tables is dropped). The security guarantee is preserved by keeping **render-time sanitization as the trust boundary** — every render re-sanitizes stored HTML through a bounded `DOMPurify` V2 config (the V1 properties plus a few tags + an enumerated `class` allowlist + enumerated `target`/`rel` + numeric table attributes; **the `style` attribute stays banned** via a class-based custom TextAlign and `resizable:false` tables — the owner's class-based-not-style-based preference). The 6 live posts are converted once markdown→HTML, gated by **rendered-output equivalence** (the public render is byte/normalization-equal pre/post), with the original markdown recoverable from git history and a migration rollback. The previously-latent markdown-only alt gate (R2-F4) is now ACTIVE — replaced by an HTML-aware alt gate before the editor is adopted. This closes the §5 "Open Item" above: the fork is resolved to HTML storage, not markdown round-trip.
- **Override 2 — ASYNC AI DRAFTING by default.** Owner: *"Let's not worry about synchronous drafting."* Long AI actions (draft/voice) run as a background job by DEFAULT (202 → poll → **the job persists its result into the draft**); short actions stay synchronous. **Model defaults are UNCHANGED — Sonnet 4.6 default, Opus 4.8 opt-in:** async removes the infrastructure penalty from choosing async but does not promote Opus to default (the cost/quality choice stays the owner's). The synchronous-timeout constraint no longer shapes the design. The daily spend breaker, rate limiter, and per-action `max_tokens` EXPLICITLY cover the background-job path with **enqueue-time counting** — a queued burst trips the breaker before fan-out.
- **Reviser decision recorded:** AI output format = constrained HTML, sanitized at insertion (no privileged write path; same render-time `DOMPurify` V2 boundary as human content). Markdown-emitted-then-converted is the documented fallback.
- **Flagged for owner review (recorded, not built):** client-side localStorage autosave — interpreted as already satisfied by job-result-persists-into-draft; reviving client autosave (cut in V1) is a separate owner decision.
- **Flagged for the security critic:** any future un-banning of the `style` attribute (only if class-based TextAlign proves unworkable; bounded to enumerated text-align values; must be explicitly accepted before shipping).

## Owner Overrides — 2026-06-07 (HTML storage + async AI)

> **Relationship to §7.** §7 above records the override *decisions* (the two quotes, the storage winner, the async execution model, the unchanged model defaults, the autosave flag). This section records the **delta-revision process** that produced the revised artifacts (implementation plan §§0–17, ADR-009, ADR-010) in response to those decisions — the recon/revision/stress-round work that §7 does not capture, in the same audit register as the §2 judge panel and §3 stress-round counts. The two overrides themselves are settled and not re-openable; §4's verbatim ledger is unchanged.

### The two owner overrides (verbatim)

Both directives were given on 2026-06-07, after the four stress rounds (§3) and after ADR-009/ADR-010 had been drafted. They reverse two earlier decisions.

- **Override 1 — STORAGE = TipTap HTML.** Owner: *"fix the plan to produce the fully functional html data like tiptap wants. I would rather have it correct."*
- **Override 2 — ASYNC AI DRAFTING.** Owner: *"Let's not worry about synchronous drafting."*

### Why ADR-009 was reversed (fidelity-first)

ADR-009 had recorded the **TipTap-markdown round-trip (Option B) as Accepted**, closing the §5 OPEN storage fork in favor of preserving V1's marked→sanitize markdown pipeline. The owner reversed this in favor of **storing TipTap HTML directly**, and the reversal is the better engineering choice, not merely an owner preference:

- **Fidelity-first.** The round-trip could not carry the featureset losslessly — underline, text-align, and especially TABLES are not expressible in V1's markdown pipeline without lossy or bolted-on handling (the round-trip plan had to *defer* tables behind a markdown-source toggle). HTML storage makes all three first-class WYSIWYG. The owner's "I would rather have it correct" is a fidelity-over-convenience call.
- **TipTap is HTML-native.** TipTap's document model serializes to HTML as its natural grain; markdown was an *added* serialization layer on top. Storing HTML removes a translation step rather than adding one.
- **The round-trip was the fragile bolt-on.** It was the option whose own ADR had to carry a fallback escape hatch — an admission that the markdown↔HTML conversion was the brittle, failure-prone seam. Reversing to HTML storage removes that seam instead of hardening it. The remaining work is to do the bounded HTML adoption *correctly*, with render-time sanitization (a tightened, class-based `DOMPurify` V2 config) kept as the trust boundary so the security properties are preserved or strengthened, not relaxed.

### Delta-revision process

The revision was scoped as a bounded delta against the already-stress-tested base plan, not a re-plan. The process was:

- **2 recon slices** — fact-gathering passes over the affected artifacts (the storage/sanitizer path for Override 1; the AI execution/abuse-control path for Override 2) to establish exactly what the HTML-storage and async-job changes touch before any edit.
- **Surgical revision** — the implementation plan, ADR-009, and ADR-010 were edited in place to adopt HTML storage and async-by-default AI, rather than regenerated.
- **1 focused stress round** — a single adversarial pass over the revised artifacts. **11 findings raised, 10 accepted and fixed, 1 not accepted** (raised − accepted = 1; the lone non-accepted finding is recorded as a count here, consistent with §3/§6's treatment of non-accepted findings — its individual text was not carried into this log). The 10:11 acceptance ratio on a single delta-focused round, versus the four full rounds in §3, reflects that the change surface was bounded and already sat on a converged base plan.

### Pinned interpretations and unchanged decisions

- **Autosave interpretation (pinned, recorded for owner review — not silently built).** The owner's "auto-save or something" is interpreted as already satisfied by the async pattern's **job-result-persists-into-the-draft** behavior. Client-side localStorage autosave remains on the V1 OUT list (it was cut deliberately in V1); reviving it would be a separate owner decision. This interpretation is recorded for owner review, not built.
- **Model defaults UNCHANGED.** Sonnet 4.6 stays the default; Opus 4.8 stays opt-in. Async removes the infrastructure penalty that the synchronous-timeout constraint had attached to long Opus calls, but it does **not** promote Opus to default — that remains a pure cost/quality decision left with the owner.
- **Non-negotiables preserved.** Render-time sanitization stays the guard (every render re-sanitizes; sanitize-on-write is additional hygiene only); the sanitizer remains class-based, not style-based (the `style` attribute stays banned); the 6-post markdown→HTML conversion is gated by rendered-output equivalence with markdown recoverable from git history and a migration rollback; AI output has no privileged write path and passes through the same sanitizer as human content; and the async abuse controls (daily spend breaker, rate limiter, per-action `max_tokens`) explicitly cover the background-job path with enqueue-time counting.
