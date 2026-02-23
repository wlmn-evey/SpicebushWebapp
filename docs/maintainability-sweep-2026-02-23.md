# Maintainability Sweep (February 23, 2026)

## Executive Summary
This codebase is functional and shipping reliably, but long-term maintainability is at risk from very large files, uneven test coverage, and duplicated request-parsing patterns.

Overall maintainability score: **6.8 / 10**

## Rubric
| Area | Score | Notes |
|---|---:|---|
| Build Stability | 9.0 | `lint`, `typecheck`, `build`, and current unit tests pass. |
| Test Safety Net | 3.5 | Coverage is low (~9.5% statements), including most API routes. |
| Readability | 6.0 | Clear naming in many modules, but several files are too large to reason about quickly. |
| Modularity | 6.0 | Good domain separation exists (`lib/db`, `lib/*`), but route handlers still mix many concerns. |
| Operational Observability | 7.5 | Donation + contact email logging now exists in `communications_messages`. |
| Documentation Hygiene | 7.0 | Useful docs exist, but historical debug/journal files can still distract future work. |
| Security-by-Default | 8.5 | Form anti-bot stack now includes honeypot, Turnstile, timing trap, and rate limit checks. |

## High-Priority Findings
1. Large files are hard to maintain and onboard into quickly.
   - `app/src/pages/coming-soon.astro` (~2284 lines)
   - `app/src/components/OptimizedImage.astro` (~1950 lines)
   - `app/src/lib/donation-thank-you.ts` (~1732 lines)
   - `app/src/pages/admin/seo.astro` (~1608 lines)
   - `app/src/pages/camp.astro` (~1564 lines)

2. Coverage is too low for safe refactors.
   - Latest `npm run test:coverage` total: ~9.5% statements.
   - Many API routes and admin handlers remain untested.

3. API request parsing/validation patterns are duplicated.
   - Repeated `parseString`, `asString`, `parseRedirectPath`, `parseBoolean` helpers across many API files.
   - Increases drift risk and inconsistent behavior over time.

## Medium-Priority Findings
1. Route handlers can still be overloaded.
   - Example: `app/src/pages/api/contact/submit.ts` handles anti-bot checks, validation, DB write, analytics, email orchestration, and response flow in one file.

2. Legacy docs can dilute signal.
   - `debug/` and `journal/` contain valuable history, but not all files are relevant to current scope.

## What Was Improved During This Sweep
1. Added a guard to skip contact-email delivery log writes when DB credentials are intentionally absent (such as isolated unit tests), reducing noisy warnings while preserving production behavior.
   - Updated: `app/src/lib/contact-email.ts`

## 2-Week Refactor Plan (Recommended)
1. Split oversized files (top 5 above) into feature modules.
   - Target: no single `page`/`lib` file above ~900 lines.
   - Keep behavior identical; avoid visual redesign during this pass.

2. Expand tests around critical workflows.
   - Add API tests for:
     - `/api/contact/submit`
     - `/api/admin/donations`
     - `/api/admin/seo/config`
     - `/api/webhooks/stripe`
   - Goal: bring statement coverage above 25% without brittle tests.

3. Introduce shared API parsing utilities.
   - Consolidate request coercion helpers into one module.
   - Apply first to `api/contact/submit`, `api/schedule-tour`, and `api/admin/*` routes.

4. Archive low-signal docs.
   - Keep `docs/README.md` + `docs/DOCUMENTATION_INDEX.md` as canonical map.
   - Move low-relevance historical notes into an `archive/` subtree.

## Guardrails Going Forward
1. Require `lint`, `typecheck`, `build`, and `test` in PR checks.
2. Add a CI warning when files exceed 1200 lines.
3. Add a “refactor budget” checklist item to each feature PR:
   - Did we reduce duplication?
   - Did we add/adjust tests?
   - Did we update docs for new behavior?
