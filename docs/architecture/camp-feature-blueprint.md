# Summer Camp Feature Blueprint

## Purpose

Implement a summer camp system that:

- promotes camp across the site,
- manages weekly seat availability,
- supports manual + scheduled camp mode,
- redirects users to a camp-specific coming soon experience when camp is not active,
- keeps Transparent Classroom as the enrollment system of record.

## Product Constraints

- Enrollment checkout remains outside this app (Transparent Classroom links).
- One seat pool per camp week.
- Camp mode must support `auto`, `prep`, `on`, and `off`.
- Admins must bypass mode redirects.
- Parent experience must be mobile-first and fast to scan.

## Route & Mode Architecture

### Public Routes

- `/camp` (main camp landing page)
- `/camp/[weekSlug]` (optional week detail page if needed)
- `/camp-coming-soon` (camp unavailable page)

### Mode Settings (in `settings` table)

- `camp_mode_override`: `"auto" | "prep" | "on" | "off"`
- `camp_mode_start_at`: ISO datetime
- `camp_mode_end_at`: ISO datetime
- `camp_mode_timezone`: IANA timezone string (default `America/New_York`)
- `camp_promotions_enabled`: boolean

### Mode Evaluation

1. If override = `on`: camp active for everyone.
2. If override = `off`: camp inactive for everyone.
3. If override = `prep`: camp inactive for public, active for admin preview.
4. If override = `auto`: active only when current time is inside start/end window.

### Redirect Rules

- Camp inactive + request starts with `/camp` -> redirect to `/camp-coming-soon`.
- Camp active + request is `/camp-coming-soon` -> redirect to `/camp`.
- Preserve query parameters (UTM, gclid, etc.) on redirect.
- Admin bypass should follow existing preview/admin middleware behavior.

## Data Model (Merged Weekly Seat Model)

### `camp_seasons`

- `id` (uuid, pk)
- `slug` (text unique; e.g., `summer-2027`)
- `name` (text)
- `year` (int)
- `is_active` (bool)
- `registration_open_at` (timestamptz, nullable)
- `registration_close_at` (timestamptz, nullable)
- `created_at`, `updated_at`

### `camp_weeks` (seat pool lives here)

- `id` (uuid, pk)
- `season_id` (uuid, fk -> camp_seasons)
- `slug` (text unique)
- `theme_title` (text)
- `summary` (text)
- `description` (text)
- `start_date` (date)
- `end_date` (date)
- `age_range_label` (text)
- `hours_label` (text)
- `price_label` (text)
- `capacity_total` (int)
- `seats_confirmed` (int)
- `seats_held` (int)
- `waitlist_enabled` (bool)
- `limited_threshold` (int default 4)
- `enrollment_url` (text)
- `waitlist_url` (text nullable)
- `is_published` (bool)
- `display_order` (int)
- `hero_media_slug` (text nullable)
- `last_synced_at` (timestamptz nullable)
- `sync_source` (text nullable; `manual` or `transparent_classroom_csv`)
- `created_at`, `updated_at`

### `camp_week_variants` (display-only details)

- `id` (uuid, pk)
- `camp_week_id` (uuid, fk -> camp_weeks)
- `label` (text; e.g., `Half Day`)
- `age_range_label` (text nullable)
- `hours_label` (text nullable)
- `price_label` (text nullable)
- `notes` (text nullable)
- `display_order` (int)
- `created_at`, `updated_at`

### `camp_seat_adjustments` (audit)

- `id` (uuid, pk)
- `camp_week_id` (uuid, fk -> camp_weeks)
- `action` (text; `manual_adjust`, `csv_sync`, `mark_full`, `toggle_waitlist`, etc.)
- `before_confirmed`, `after_confirmed` (int)
- `before_held`, `after_held` (int)
- `before_capacity`, `after_capacity` (int)
- `note` (text nullable)
- `actor_email` (text nullable)
- `created_at`

## Seat Status Logic

For each week:

- `available = capacity_total - seats_confirmed - seats_held`

Status precedence:

1. `closed` if outside registration window (season or week-level override).
2. `waitlist` if `available <= 0` and `waitlist_enabled = true`.
3. `full` if `available <= 0` and waitlist disabled.
4. `limited` if `available > 0` and `available <= limited_threshold`.
5. `open` otherwise.

## Parent-Facing UX Blueprint (Mobile-First)

## `/camp` layout

1. Hero block:

- season title,
- short parent-friendly promise,
- primary CTA (`View Weeks` / `Enroll`),
- secondary CTA (`Join Waitlist`) only when relevant.

2. Quick facts strip (always visible near top):

- age range,
- hours,
- pricing approach,
- location,
- status summary.

3. Week cards (core conversion section):

- theme title + date range,
- status chip (`Open`, `Limited`, `Full`, `Waitlist`, `Closed`),
- seats left text when available,
- one primary action button that changes by status,
- optional variant details list (display-only).

4. FAQ + policy essentials:

- what to bring,
- drop-off/pickup basics,
- cancellation/high-level policy,
- waitlist behavior.

5. Trust section:

- staff safety note,
- licensing/supervision summary,
- optional photo highlights.

### Mobile behavior requirements

- Single-column card flow first.
- Sticky bottom CTA on mobile for the selected/visible week.
- Status chips and CTA always above fold in each week card.
- Tap targets >= 44px.
- Avoid side-by-side dense form fields.

### Copy style

- Parent-first, plain language.
- Avoid ambiguous scarcity language.
- Show freshness with "Last updated" timestamp when seat counts are shown.

## `/camp-coming-soon` layout

1. Header with seasonal message (e.g., "Summer Camp 2027 details coming soon").
2. Optional open date countdown or clear date text.
3. Interest CTA (contact/waitlist/info request).
4. Lightweight preview of what camp includes (not availability claims).

## Sitewide Promotions (Option 2)

Promotion zones:

- Announcement bar,
- Homepage promo card,
- contextual promo modules on `/programs`, `/tuition`, `/contact`.

Dynamic behavior:

- Camp inactive: message routes to `/camp-coming-soon`.
- Camp active: message routes to `/camp` and can mention limited weeks.
- Pull status copy from week data (no hardcoded urgency).

## Admin UX Blueprint (`/admin/camp`)

## Top section

- Camp mode control card:
- Override select (`auto/prep/on/off`)
- schedule fields (start/end/timezone)
- live computed status preview

## Season section

- season list with `active` flag
- quick create/edit season

## Week management section

- table/cards with:
- week name + dates
- published state
- status chip
- capacity/confirmed/held/available
- last synced timestamp + source

Quick actions per week:

- adjust confirmed seats (`+/-`)
- adjust held seats (`+/-`)
- set capacity
- toggle waitlist
- mark full

## Sync section

- CSV import area for Transparent Classroom export mapping
- preview parser results before apply
- validation errors surfaced per row
- write audit log entries on apply

## Audit section

- recent seat adjustments feed with actor + before/after values

## Analytics & Tracking

Emit analytics events:

- `camp_page_view`
- `camp_week_card_view`
- `camp_enroll_click`
- `camp_waitlist_click`
- `camp_redirect_to_coming_soon`
- `camp_mode_change`
- `camp_csv_sync_applied`

Core dashboard metrics:

- total visits to camp page
- enroll click-through rate
- waitlist click rate
- week-level interest distribution

## SEO Plan

- Index `/camp` only when camp mode active and page published.
- Use `/camp-coming-soon` with conservative metadata (no stale enrollment claims).
- Add managed SEO override entries for `/camp` and `/camp-coming-soon`.
- Ensure canonical URLs and social cards are season-aware where helpful.

## Accessibility & Performance Requirements

- WCAG AA contrast for all status chips and CTA text.
- Keyboard-accessible controls for accordions, filters, and admin quick actions.
- Use responsive images and avoid layout shifts in week cards.
- Keep initial mobile payload light; defer non-critical media.

## Implementation Phases

1. Data + settings foundation (migrations + mode settings).
2. Middleware redirect behavior for camp mode.
3. Admin camp mode + week management UI.
4. Public `/camp` and `/camp-coming-soon` pages.
5. Sitewide dynamic promotions.
6. CSV sync + audit trail.
7. Analytics + SEO finalization.

## Release Acceptance Criteria

- Camp mode correctly handles manual and scheduled states.
- Redirect logic works with no loops and preserves UTM params.
- Seat status is correct and visibly updates in admin/public views.
- Transparent Classroom links are week-specific and functioning.
- Mobile UX is clean, readable, and easy to act on.
- Typecheck, lint, and build pass before deploy.
