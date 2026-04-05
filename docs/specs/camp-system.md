# Camp System Specification

## Overview

The camp system manages seasonal summer camp visibility, weekly seat availability, and sitewide promotions. Enrollment checkout happens externally via Transparent Classroom — this application manages discovery, availability display, and enrollment link routing.

## Camp Mode State Machine

Mode is controlled by settings in the `settings` table and evaluated via `@lib/camp-mode.ts`:

```typescript
import { evaluateCampMode, parseCampModeSettings } from '@lib/camp-mode';
const campMode = evaluateCampMode(parseCampModeSettings(settings));
```

### Mode Settings (stored as key/value rows in `settings` table)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `camp_mode_override` | `"auto" \| "prep" \| "on" \| "off"` | `"off"` | Primary mode control |
| `camp_mode_start_at` | ISO datetime string | empty | Auto-mode window start |
| `camp_mode_end_at` | ISO datetime string | empty | Auto-mode window end |
| `camp_mode_timezone` | IANA timezone | `"America/New_York"` | Timezone for window evaluation |
| `camp_promotions_enabled` | boolean | `false` | Controls CampPromoModule visibility |

### Mode Evaluation Rules

Evaluation is performed by `evaluateCampMode()` in `app/src/lib/camp-mode.ts`. The override value is checked first, and `"auto"` falls through to time-window logic:

1. `override = "on"` — `active = true`, `prepMode = false`, reason: `forced_on`
2. `override = "off"` — `active = false`, `prepMode = false`, reason: `forced_off`
3. `override = "prep"` — `active = false`, `prepMode = true`, `activeForAdmin = true`, reason: `forced_prep`
4. `override = "auto"`:
   - Both start and end are missing — `active = false`, reason: `window_missing`
   - Current time is before start — `active = false`, reason: `before_window`
   - Current time is after end — `active = false`, reason: `after_window`
   - Current time is inside window — `active = true`, reason: `within_window`

### Evaluation Result (`CampModeEvaluation`)

```typescript
interface CampModeEvaluation {
  activeForAdmin: boolean;   // admin-visible (true for forced_on, forced_prep, within_window)
  prepMode: boolean;         // admin-only preview (true only for forced_prep)
  active: boolean;           // public visibility
  reason: 'forced_on' | 'forced_off' | 'forced_prep'
        | 'within_window' | 'before_window' | 'after_window' | 'window_missing';
  nowIso: string;
  settings: CampModeSettings;
}
```

## Redirect Rules

Enforced in `app/src/middleware.ts` via `handleCampMode()`. The middleware runs after auth and coming-soon checks.

### Public users

| Condition | Action |
|-----------|--------|
| Request starts with `/camp` AND `active = false` | Redirect to `/camp-coming-soon` |
| Request is `/camp-coming-soon` AND `active = true` | Redirect to `/camp` |

### Admin users

| Condition | Action |
|-----------|--------|
| Request starts with `/camp` AND `activeForAdmin = false` | Redirect to `/camp-coming-soon` |
| All other camp requests | Pass through (admins see camp pages in prep mode) |

### Shared behavior

- Query parameters (UTM, gclid, etc.) are preserved on redirect via `redirectWithSearch()`.
- Camp mode evaluation is cached in-memory with a 30-second TTL (`SETTINGS_CACHE_TTL_MS = 30000`).
- On DB errors, camp mode defaults to `override = "off"` (camp inactive).

## Seat Availability Logic

### Availability Calculation

Per camp week:

```
available = capacity_total - seats_confirmed - seats_held
```

The `availableSeats` field is computed during data mapping in `app/src/lib/db/camp.ts`.

### Week Status

Computed by `computeWeekStatus()` in `app/src/lib/db/camp.ts`. Status precedence (highest priority first):

| Status | Condition |
|--------|-----------|
| `draft` | `is_published = false` (never shown to public) |
| `closed` | Current time is outside the week's `registration_open_at` / `registration_close_at` window |
| `waitlist` | `available <= 0` AND `waitlist_enabled = true` |
| `full` | `available <= 0` AND `waitlist_enabled = false` |
| `limited` | `available > 0` AND `available <= limited_threshold` |
| `open` | `available > 0` AND above threshold |

The `limited_threshold` defaults to 4 when creating a week (set in the admin API).

Type: `CampWeekStatus = 'draft' | 'open' | 'limited' | 'full' | 'waitlist' | 'closed'`

## Data Model

Key tables (full row types in `app/src/lib/db/types.ts`):

### `camp_seasons`

Season definitions with activation flag. Fields include `slug`, `name`, `year`, `is_active`, `registration_open_at`, `registration_close_at`.

### `camp_weeks`

Weekly seat pools with capacity tracking. Key fields:

- `season_id` — FK to `camp_seasons`
- `slug`, `theme_title`, `summary`, `description` — display content
- `start_date`, `end_date` — week date range
- `age_range_label`, `hours_label`, `price_label` — display labels
- `capacity_total`, `seats_confirmed`, `seats_held` — seat pool
- `waitlist_enabled`, `limited_threshold` — status thresholds
- `enrollment_url`, `waitlist_url` — external action URLs
- `is_published`, `display_order` — visibility and ordering
- `hero_media_slug` — optional media reference
- `registration_open_at`, `registration_close_at` — per-week registration window
- `last_synced_at`, `sync_source` — sync metadata

### `camp_week_variants`

Display-only detail variants for a week (e.g., Half Day, Full Day). Fields include `camp_week_id`, `label`, `age_range_label`, `hours_label`, `price_label`, `notes`, `display_order`.

### `camp_seat_adjustments`

Audit trail for all seat changes. Records `before_*` and `after_*` values for `confirmed`, `held`, and `capacity`, along with `action`, `note`, `actor_email`, and `metadata`.

## Public Routes

| Route | Description |
|-------|-------------|
| `/camp` | Main camp landing page — week cards, status chips, enrollment links. File: `app/src/pages/camp.astro` |
| `/camp-coming-soon` | Placeholder shown when camp is inactive. File: `app/src/pages/camp-coming-soon.astro` |

## Admin Routes

| Route | Description |
|-------|-------------|
| `/admin/camp` | Camp management dashboard. File: `app/src/pages/admin/camp.astro` |
| `POST /api/admin/camp` | Camp CRUD API. File: `app/src/pages/api/admin/camp.ts` |

### Admin API Actions (via `POST /api/admin/camp`)

All actions require admin authentication. The `action` field determines behavior:

| Action | Description |
|--------|-------------|
| `create-season` | Create a new camp season |
| `save-season` | Update an existing season |
| `create-week` | Create a new camp week (with optional variant lines) |
| `save-week` | Update an existing week (with optional variant lines) |
| `delete-week` | Delete a camp week |
| `adjust-seats` | Adjust seat counts with delta values and audit trail |
| `save-variants` | Replace variants for a week from line input |

The `adjust-seats` action supports quick-action presets:
- `availablePreset = "increase"` — decreases `seats_confirmed` by 1 (frees a seat)
- `availablePreset = "decrease"` — increases `seats_confirmed` by 1 (fills a seat)

## Sitewide Promotions

When `camp_promotions_enabled` is true and camp is not `forced_off`, the `CampPromoModule` component renders promotional content.

### Placement locations

The module is used on three pages with placement-specific styling and copy:

| Page | Placement key | File |
|------|---------------|------|
| Homepage | `homepage` | `app/src/pages/index.astro` |
| Programs | `programs` | `app/src/pages/programs.astro` |
| Contact | `contact` | `app/src/pages/contact.astro` |

Component file: `app/src/components/CampPromoModule.astro`

### Dynamic behavior

- **Camp active**: promo links to `/camp`, status line shows live seat data from `CampPromotionSummary` (open/limited/waitlist/full/closed week counts), next available week is highlighted.
- **Camp inactive (not forced_off)**: promo links to `/camp-coming-soon`, shows configurable inactive message and expected opening date.
- **Camp forced_off**: promo module is hidden entirely.
- **Prep mode**: promo visible only to admins.
- Status copy is derived from week data — no hardcoded urgency language.

### Promotion summary data (`CampPromotionSummary`)

```typescript
interface CampPromotionSummary {
  available: boolean;
  totalPublishedWeeks: number;
  openWeeks: number;
  limitedWeeks: number;
  waitlistWeeks: number;
  fullWeeks: number;
  closedWeeks: number;
  nextOpenWeek: CampPromotionWeekSummary | null;
  errorMessage: string | null;
}
```

### Configurable settings for promo copy

| Setting key | Default | Purpose |
|-------------|---------|---------|
| `camp_current_season_label` | `"Summer Camp"` | Season name in heading |
| `camp_open_date_label` | empty | Expected opening date shown when inactive |
| `camp_promo_active_message` | `"Summer camp is open with weekly themes and live seat updates."` | Fallback when no summary data |
| `camp_promo_inactive_message` | `"Summer camp details are coming soon. See updates and opening windows."` | Message when camp inactive |

## Components

| Component | Path | Description |
|-----------|------|-------------|
| `CampPromoModule.astro` | `app/src/components/CampPromoModule.astro` | Sitewide promotion module |
| `CampAskAdmissionsModal.astro` | `app/src/components/camp/CampAskAdmissionsModal.astro` | Contact modal on camp page |

Page files:

| Page | Path |
|------|------|
| Camp landing | `app/src/pages/camp.astro` |
| Camp coming soon | `app/src/pages/camp-coming-soon.astro` |
| Admin camp dashboard | `app/src/pages/admin/camp.astro` |

## Analytics Events

Events are tracked via `data-analytics-event` attributes on interactive elements. The camp page (`camp.astro`) defines three event names:

| Event | Trigger |
|-------|---------|
| `camp_enroll_click` | User clicks enrollment link on a week card or hero CTA |
| `camp_waitlist_click` | User clicks waitlist link on a week card |
| `camp_contact_click` | User clicks contact/question link on a week card, hero, or footer |

The `CampPromoModule` tracks `camp_promo_click` with placement-specific labels (e.g., `homepage-active`, `programs-inactive`).

Additional `data-analytics-location` values identify click source: `camp-hero`, `camp-hero-side`, `camp-week-card`, `camp-footer`, `camp-mobile-sticky-cta`, `camp-promo-{placement}`.

Note: The `camp_week_variants` table includes `last_synced_at` and `sync_source` fields on weeks, supporting future sync integrations. No CSV sync endpoint currently exists in the camp admin API.

## SEO

- `/camp` should be indexed only when camp mode is active and the page is published.
- `/camp-coming-soon` uses conservative metadata — no stale enrollment claims.
- Managed SEO override entries for both camp routes (via the admin SEO panel).

## Accessibility and Performance

- WCAG AA contrast for status chips and CTA text.
- All interactive elements (buttons, links) have minimum 44px tap targets.
- Camp page uses `prefers-reduced-motion` media query to respect animation preferences.
- Responsive images via `OptimizedImage` component, no layout shifts in week cards.
- Mobile-first: single-column card flow on small screens.
- Keyboard-accessible admin quick actions.
