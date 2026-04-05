# Spicebush Montessori Website -- Consolidated Roadmap

Last updated: April 5, 2026

This is the living roadmap for the Spicebush Montessori website (spicebushmontessori.org). It reflects actual project state, not aspirations.

---

## Current State

- **Phase 1 (Stabilize and Simplify)** -- mostly complete.
- **Security audit** completed March 17, 2026. All P0 and P1 findings resolved; P2 and P3 findings tracked in GitHub Issues.
- **Maintainability sweep** (Feb 23, 2026) scored the codebase at 6.8/10.
- **Test coverage** sits at approximately 9.5%.

Key merged work:

| Commit | Description |
|--------|-------------|
| `7a5d150` | P0+P1 re-audit fixes -- slug sort, photo picker, export cap, error display, SVG headers |
| `c6e13e5` | Merge of P0+P1 fixes branch |
| `4133012` | P1+P2 audit fixes |
| `d48ed0b` | Merge of P1+P2 fixes branch |

---

## Phase 1: Stabilize and Simplify (In Progress -- Nearly Complete)

**Goal:** Strip the codebase to what is actively used, fix critical issues, establish a stable baseline.

### Kept
- Hours widget
- Staff management
- Tuition calculator
- Coming soon mode with admin bypass
- Camp mode system

### Removed or Deferred
- Blog UI
- Newsletter
- Stripe / payments integration

### Completed
- Documentation consolidation
- Archive stale plans
- P0+P1 security fixes
- P1+P2 security fixes
- All open issues migrated to GitHub Issues

---

## Phase 2: Admin and Operations Hardening

**Goal:** Make the admin panel production-solid, expand test coverage, and close remaining security findings.

### Authentication
- [ ] Apply admin auth migration in all environments
- [ ] Verify production email delivery for admin login magic links
- [ ] Decide on magic-link auth long-term vs. Auth0

### Configuration-Driven Redirects
- [ ] Replace `/donate` redirect with DB-configured `donation_external_link`
- [ ] Replace `/enrollment` redirect with DB-configured `enrollment_external_link`

### Admin UX
- [ ] Improve admin UX for core modules (camp, content, media, settings)
- [ ] Remove remaining newsletter-specific references from admin UI and API routes

### Test Coverage
- [ ] Expand automated test coverage from 9.5% to 25%+ target
- [ ] Add tests for error branches in existing API routes
- [ ] Add E2E coverage for admin authentication flow

---

## Phase 3: Controlled Feature Reintroduction (Deferred)

**Goal:** Selectively re-add features that were stripped in Phase 1, only after they pass quality gates.

### Candidates (all optional, evaluated individually)
- Media management refactor
- Blog
- Newsletter
- Payments / Stripe

### Prerequisites
Each feature must pass before merge:
1. Security review (no new P1+ findings)
2. Maintainability review (no regression below current score)
3. Full test coverage for new code
4. Lint, typecheck, and E2E gates green

---

## Security Audit Remediation

Audit completed March 17, 2026.

| Severity | Count | Status |
|----------|-------|--------|
| P0 | 0 | N/A |
| P1 | 4 | All resolved (commits `7a5d150`, `4133012`) |
| P2 | 9 | Most resolved; remaining tracked in GitHub Issues |
| P3 | 16 | Tracked in GitHub Issues |

All findings are now tracked as GitHub Issues with `P0`--`P3` labels.

---

## Maintainability Priorities

From the Feb 23, 2026 sweep (score: 6.8/10):

- **Large files:** 5 files exceed 1,500 lines and need splitting.
- **Duplicated parsing:** API parsing patterns are duplicated across routes. Extract to shared utilities.
- **Test coverage:** 9.5% is below the 25% target. Focus on error branches and admin flows first.

---

## Quality Gates

Every PR must pass before merge:

```bash
npm run lint -- --max-warnings=0
npm run typecheck
npm run test
npm run test:e2e
```

---

## What's Next (Ordered Priorities)

1. **Finish Phase 2 auth hardening.** Apply the admin auth migration across all environments and verify production magic-link email delivery. This is the highest-risk item -- admin access depends on it.

2. **Close remaining P2 security findings.** Review open P2 GitHub Issues and resolve them. P3 items can wait but should not accumulate.

3. **Replace hardcoded redirects with DB configuration.** The `/donate` and `/enrollment` redirects should pull from the database so admins can change them without a deploy.

4. **Increase test coverage to 25%.** Prioritize: error branches in API routes, admin auth flow E2E, camp mode edge cases.

5. **Split large files.** Address the 5 files over 1,500 lines identified in the maintainability sweep.

6. **Extract duplicated API parsing.** Consolidate repeated parsing patterns into shared utilities.

7. **Remove newsletter remnants.** Clean up any remaining newsletter-specific code, routes, and UI references.

8. **Evaluate Phase 3 candidates.** Once Phase 2 is complete and the codebase scores above 7.5/10 on maintainability, evaluate which deferred features (media refactor, blog, newsletter, payments) are worth reintroducing.
