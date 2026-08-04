# Data Model Specification

Database: **Neon PostgreSQL** via `NETLIFY_DATABASE_URL`
Migrations: `app/db/migrations/001` through `014`

---

## Utility Infrastructure

### Extension

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Provides `gen_random_uuid()` used as the default for all UUID primary keys.

### Trigger Function

```sql
set_updated_at_column()
```

A shared `BEFORE UPDATE` trigger function that sets `NEW.updated_at = NOW()`. Attached to every table that has an `updated_at` column.

---

## Tables

### content

CMS content entries (pages, FAQ items, blocks, etc.). Introduced in migration 001.

| Column         | Type          | Constraints                     |
| -------------- | ------------- | ------------------------------- |
| `id`           | `UUID`        | PK, DEFAULT `gen_random_uuid()` |
| `type`         | `TEXT`        | NOT NULL                        |
| `slug`         | `TEXT`        | NOT NULL                        |
| `title`        | `TEXT`        | nullable                        |
| `data`         | `JSONB`       | NOT NULL, DEFAULT `'{}'`        |
| `status`       | `TEXT`        | NOT NULL, DEFAULT `'published'` |
| `author_email` | `TEXT`        | nullable                        |
| `created_at`   | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`       |
| `updated_at`   | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`       |

**Constraints:** `UNIQUE(type, slug)`

**Indexes:**

- `idx_content_type` on `(type)`
- `idx_content_status` on `(status)`
- `idx_content_updated_at` on `(updated_at DESC)`

**Triggers:** `trigger_content_set_updated_at` -- auto-updates `updated_at`

---

### settings

Key-value site settings. Used for coming-soon mode, camp mode, email routing configuration, donation settings, and more. Introduced in migration 001; rows seeded across migrations 002, 006, 008, 009, 010, 011, 012.

| Column       | Type          | Constraints               |
| ------------ | ------------- | ------------------------- |
| `key`        | `TEXT`        | PK                        |
| `value`      | `JSONB`       | NOT NULL                  |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` |

**Triggers:** `trigger_settings_set_updated_at` -- auto-updates `updated_at`

**Notable keys (selected):**

| Key              | Value shape                                        | Notes                                                                                                                                                                                                                               |
| ---------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ticker_items`   | JSON array of `{ text, href?, expiresAt?, type? }` | Phase 6 news ticker. No dedicated table — the array order _is_ the display order. Value-level safety (href scheme, expiry, ≤5) is enforced at render in `getActiveTickerItems`, not on write (the endpoint validates the key only). |
| `ticker_enabled` | `boolean` (default absent → `false`)               | Master on/off. Absent/falsey → the ticker renders nothing. Read with a dedicated 5-min TTL (R4-F11), never via `getAllSettings()`.                                                                                                  |
| `current_school_year` | `string` (`"YYYY-YYYY"`)                      | Drives the school-year label on the public tuition calculator and admin tuition forms. When absent, code falls back to `getCurrentSchoolYear()` (`@lib/school-year`), which rolls over every July 1 — never a hardcoded year (#128). |

**Seeded keys (by migration):**

| Key                                          | Default Value                                             | Migration |
| -------------------------------------------- | --------------------------------------------------------- | --------- |
| `coming_soon_enabled`                        | `true`                                                    | 002       |
| `coming_soon_message`                        | _(enrollment message text)_                               | 002       |
| `coming_soon_launch_date`                    | `'Fall 2026'`                                             | 002       |
| `application_school_year`                    | `'2026-2027 School Year'`                                 | 002       |
| `donation_external_link`                     | `''`                                                      | 002       |
| `enrollment_external_link`                   | `''`                                                      | 002       |
| `tour_external_link`                         | _(Calendly URL)_                                          | 002       |
| `tour_scheduling_enabled`                    | `true`                                                    | 002       |
| `camp_mode_override`                         | `'off'`                                                   | 006       |
| `camp_mode_start_at`                         | `''`                                                      | 006       |
| `camp_mode_end_at`                           | `''`                                                      | 006       |
| `camp_mode_timezone`                         | `'America/New_York'`                                      | 006       |
| `camp_promotions_enabled`                    | `false`                                                   | 006       |
| `school_email`                               | `'information@spicebushmontessori.org'`                   | 008       |
| `contact_form_notify_emails`                 | `'information@spicebushmontessori.org'`                   | 008       |
| `coming_soon_form_notify_emails`             | `'information@spicebushmontessori.org'`                   | 008       |
| `contact_form_notify_subject`                | `'New Contact Form Inquiry - {{name}}'`                   | 008       |
| `coming_soon_form_notify_subject`            | `'New Coming Soon Inquiry - {{name}}'`                    | 008       |
| `contact_form_confirm_submitter`             | `true`                                                    | 008       |
| `coming_soon_form_confirm_submitter`         | `true`                                                    | 008       |
| `contact_form_confirm_subject`               | `'Thanks for contacting Spicebush Montessori'`            | 008       |
| `coming_soon_form_confirm_subject`           | `'Thanks for your interest in Spicebush Montessori'`      | 008       |
| `camp_form_notify_emails`                    | `'information@spicebushmontessori.org'`                   | 009       |
| `camp_form_notify_subject`                   | `'New Camp Question - {{name}}'`                          | 009       |
| `camp_form_confirm_submitter`                | `true`                                                    | 009       |
| `camp_form_confirm_subject`                  | `'Thanks for your camp question'`                         | 009       |
| `tour_request_notify_emails`                 | `'information@spicebushmontessori.org'`                   | 009       |
| `tour_request_notify_subject`                | `'New Tour Request - {{name}}'`                           | 009       |
| `tour_request_confirm_submitter`             | `true`                                                    | 009       |
| `tour_request_confirm_subject`               | `'Tour Request Confirmation - Spicebush Montessori'`      | 009       |
| `announcement_email_recipients`              | `'information@spicebushmontessori.org'`                   | 010       |
| `donation_thank_you_enabled`                 | `true`                                                    | 011       |
| `donation_thank_you_send_recurring_renewals` | `false`                                                   | 011       |
| `donation_thank_you_default_reminder_hours`  | `72`                                                      | 011       |
| `donation_internal_notify_enabled`           | `true`                                                    | 012       |
| `donation_internal_notify_emails`            | `'information@spicebushmontessori.org'`                   | 012       |
| `donation_internal_notify_subject`           | `'New donation received: {{amount}} from {{donor_name}}'` | 012       |

---

### media

Uploaded media assets (images, documents, etc.). Introduced in migration 001.

| Column         | Type          | Constraints                     |
| -------------- | ------------- | ------------------------------- |
| `id`           | `UUID`        | PK, DEFAULT `gen_random_uuid()` |
| `filename`     | `TEXT`        | NOT NULL                        |
| `url`          | `TEXT`        | NOT NULL                        |
| `size`         | `INTEGER`     | nullable                        |
| `type`         | `TEXT`        | nullable                        |
| `metadata`     | `JSONB`       | nullable                        |
| `title`        | `TEXT`        | nullable                        |
| `description`  | `TEXT`        | nullable                        |
| `tags`         | `TEXT[]`      | NOT NULL, DEFAULT `'{}'`        |
| `storage_path` | `TEXT`        | nullable                        |
| `uploaded_by`  | `TEXT`        | nullable                        |
| `created_at`   | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`       |
| `updated_at`   | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`       |

**Indexes:**

- `idx_media_created_at` on `(created_at DESC)`
- `idx_media_title` on `(title)`
- `idx_media_tags` on `(tags)` using GIN

**Triggers:** `trigger_media_set_updated_at` -- auto-updates `updated_at`

---

### admin_settings

Admin panel configuration (storage provider, upload limits, cloud storage configs). Introduced in migration 001; seeded in migration 002.

| Column             | Type          | Constraints                   |
| ------------------ | ------------- | ----------------------------- |
| `id`               | `BIGSERIAL`   | PK                            |
| `setting_key`      | `TEXT`        | NOT NULL, UNIQUE              |
| `setting_value`    | `JSONB`       | nullable                      |
| `setting_category` | `TEXT`        | NOT NULL, DEFAULT `'general'` |
| `description`      | `TEXT`        | nullable                      |
| `is_sensitive`     | `BOOLEAN`     | NOT NULL, DEFAULT `FALSE`     |
| `created_at`       | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`     |
| `updated_at`       | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`     |

**Indexes:**

- `idx_admin_settings_category` on `(setting_category)`

**Triggers:** `trigger_admin_settings_set_updated_at` -- auto-updates `updated_at`

**Seeded rows (migration 002):**

| setting_key        | setting_category | is_sensitive |
| ------------------ | ---------------- | ------------ |
| `storage_provider` | storage          | false        |
| `max_file_size`    | storage          | false        |
| `gcs_config`       | storage          | true         |
| `r2_config`        | storage          | true         |
| `b2_config`        | storage          | true         |

---

### communications_messages

Email and message log. Introduced in migration 001.

| Column            | Type          | Constraints                     |
| ----------------- | ------------- | ------------------------------- |
| `id`              | `UUID`        | PK, DEFAULT `gen_random_uuid()` |
| `subject`         | `TEXT`        | NOT NULL                        |
| `message_content` | `TEXT`        | NOT NULL                        |
| `message_type`    | `TEXT`        | NOT NULL                        |
| `recipient_type`  | `TEXT`        | NOT NULL, DEFAULT `'all'`       |
| `recipient_count` | `INTEGER`     | nullable                        |
| `scheduled_for`   | `TIMESTAMPTZ` | nullable                        |
| `sent_at`         | `TIMESTAMPTZ` | nullable                        |
| `status`          | `TEXT`        | NOT NULL, DEFAULT `'draft'`     |
| `delivery_stats`  | `JSONB`       | nullable                        |
| `created_by`      | `TEXT`        | nullable                        |
| `created_at`      | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`       |
| `updated_at`      | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`       |

**Indexes:**

- `idx_communications_messages_status` on `(status)`
- `idx_communications_messages_type` on `(message_type)`
- `idx_communications_messages_sent_at` on `(sent_at DESC)`

**Triggers:** `trigger_communications_messages_set_updated_at` -- auto-updates `updated_at`

---

### communications_templates

Reusable message templates for emails and communications. Introduced in migration 001; rows seeded across migrations 002, 010, 011.

| Column             | Type          | Constraints                     |
| ------------------ | ------------- | ------------------------------- |
| `id`               | `UUID`        | PK, DEFAULT `gen_random_uuid()` |
| `name`             | `TEXT`        | NOT NULL                        |
| `description`      | `TEXT`        | nullable                        |
| `message_type`     | `TEXT`        | NOT NULL                        |
| `subject_template` | `TEXT`        | NOT NULL                        |
| `content_template` | `TEXT`        | NOT NULL                        |
| `usage_count`      | `INTEGER`     | NOT NULL, DEFAULT `0`           |
| `last_used_at`     | `TIMESTAMPTZ` | nullable                        |
| `created_by`       | `TEXT`        | nullable                        |
| `created_at`       | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`       |
| `updated_at`       | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`       |

**Indexes:**

- `idx_communications_templates_name` on `(name)` -- UNIQUE
- `idx_communications_templates_type` on `(message_type)`

**Triggers:** `trigger_communications_templates_set_updated_at` -- auto-updates `updated_at`

**Seeded templates:**

| Name                                   | message_type                           | Migration |
| -------------------------------------- | -------------------------------------- | --------- |
| General Announcement                   | `announcement`                         | 002       |
| Announcement Email - Information       | `announcement_email_info`              | 010       |
| Announcement Email - Reminder          | `announcement_email_reminder`          | 010       |
| Announcement Email - Urgent            | `announcement_email_urgent`            | 010       |
| Announcement Email - Closure           | `announcement_email_closure`           | 010       |
| Donation Thank You - One-Time          | `donation_thank_you_one_time`          | 011       |
| Donation Thank You - Recurring Start   | `donation_thank_you_recurring_start`   | 011       |
| Donation Thank You - Recurring Renewal | `donation_thank_you_recurring_renewal` | 011       |

---

### contact_form_submissions

Contact form entries from the public site. Introduced in migration 001; extended in migrations 004 and 013.

| Column          | Type          | Constraints                     | Migration |
| --------------- | ------------- | ------------------------------- | --------- |
| `id`            | `UUID`        | PK, DEFAULT `gen_random_uuid()` | 001       |
| `name`          | `TEXT`        | NOT NULL                        | 001       |
| `email`         | `TEXT`        | NOT NULL                        | 001       |
| `phone`         | `TEXT`        | nullable                        | 001       |
| `subject`       | `TEXT`        | NOT NULL                        | 001       |
| `message`       | `TEXT`        | NOT NULL                        | 001       |
| `child_age`     | `TEXT`        | nullable                        | 001       |
| `tour_interest` | `BOOLEAN`     | NOT NULL, DEFAULT `FALSE`       | 001       |
| `submitted_at`  | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`       | 001       |
| `attribution`   | `JSONB`       | NOT NULL, DEFAULT `'{}'`        | 004       |
| `session_id`    | `TEXT`        | nullable                        | 004       |
| `client_id`     | `TEXT`        | nullable                        | 004       |
| `landing_page`  | `TEXT`        | nullable                        | 004       |
| `referrer_url`  | `TEXT`        | nullable                        | 004       |
| `ip_address`    | `TEXT`        | nullable                        | 013       |

**Indexes:**

- `idx_contact_form_submissions_submitted_at` on `(submitted_at DESC)` -- 001
- `idx_contact_form_submissions_landing_page` on `(landing_page)` -- 004
- `idx_contact_form_submissions_utm_campaign` on `(COALESCE(attribution->>'utm_campaign', ''))` -- 004
- `idx_contact_form_submissions_ip_submitted_at` on `(ip_address, submitted_at DESC) WHERE ip_address IS NOT NULL` -- 013
- `idx_contact_form_submissions_email_submitted_at` on `(LOWER(email), submitted_at DESC)` -- 013

---

### admin_login_tokens

Magic-link tokens for admin authentication. Introduced in migration 001. Subject to retention cleanup in migration 014.

| Column         | Type          | Constraints               |
| -------------- | ------------- | ------------------------- |
| `id`           | `BIGSERIAL`   | PK                        |
| `email`        | `TEXT`        | NOT NULL                  |
| `token_hash`   | `TEXT`        | NOT NULL, UNIQUE          |
| `requested_ip` | `TEXT`        | nullable                  |
| `user_agent`   | `TEXT`        | nullable                  |
| `created_at`   | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` |
| `expires_at`   | `TIMESTAMPTZ` | NOT NULL                  |
| `used_at`      | `TIMESTAMPTZ` | nullable                  |

**Indexes:**

- `idx_admin_login_tokens_active` on `(expires_at) WHERE used_at IS NULL` -- partial index for unexpired, unused tokens
- `idx_admin_login_tokens_email_created` on `(email, created_at DESC)`

**Retention (migration 014):** Rows with `expires_at < NOW() - 30 days` are deleted.

---

### admin_auth_sessions

Authenticated admin sessions created after magic-link verification. Introduced in migration 001. Subject to retention cleanup in migration 014.

| Column         | Type          | Constraints               |
| -------------- | ------------- | ------------------------- |
| `id`           | `BIGSERIAL`   | PK                        |
| `session_hash` | `TEXT`        | NOT NULL, UNIQUE          |
| `email`        | `TEXT`        | NOT NULL                  |
| `ip_address`   | `TEXT`        | nullable                  |
| `user_agent`   | `TEXT`        | nullable                  |
| `created_at`   | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` |
| `last_seen_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` |
| `expires_at`   | `TIMESTAMPTZ` | NOT NULL                  |
| `revoked_at`   | `TIMESTAMPTZ` | nullable                  |

**Indexes:**

- `idx_admin_auth_sessions_active` on `(session_hash, expires_at) WHERE revoked_at IS NULL` -- partial index for non-revoked sessions
- `idx_admin_auth_sessions_email` on `(email, created_at DESC)`

**Retention (migration 014):** Rows with `expires_at < NOW() - 30 days` are deleted.

---

### analytics_events

Custom analytics event tracking. Introduced in migration 004. Subject to retention cleanup in migration 014.

| Column           | Type          | Constraints                     |
| ---------------- | ------------- | ------------------------------- |
| `id`             | `UUID`        | PK, DEFAULT `gen_random_uuid()` |
| `event_name`     | `TEXT`        | NOT NULL                        |
| `event_category` | `TEXT`        | nullable                        |
| `page_path`      | `TEXT`        | nullable                        |
| `page_url`       | `TEXT`        | nullable                        |
| `referrer_url`   | `TEXT`        | nullable                        |
| `session_id`     | `TEXT`        | nullable                        |
| `client_id`      | `TEXT`        | nullable                        |
| `event_value`    | `NUMERIC`     | nullable                        |
| `properties`     | `JSONB`       | NOT NULL, DEFAULT `'{}'`        |
| `ip_address`     | `TEXT`        | nullable                        |
| `user_agent`     | `TEXT`        | nullable                        |
| `created_at`     | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`       |

**Indexes:**

- `idx_analytics_events_created_at` on `(created_at DESC)`
- `idx_analytics_events_name_created_at` on `(event_name, created_at DESC)`
- `idx_analytics_events_page_path` on `(page_path)`
- `idx_analytics_events_session_id` on `(session_id)`

**Retention (migration 014):** Rows with `created_at < NOW() - 12 months` are deleted.

---

### ad_spend_entries

Advertising spend tracking by channel and campaign. Introduced in migration 005.

| Column       | Type            | Constraints                     |
| ------------ | --------------- | ------------------------------- |
| `id`         | `UUID`          | PK, DEFAULT `gen_random_uuid()` |
| `spend_date` | `DATE`          | NOT NULL                        |
| `channel`    | `TEXT`          | NOT NULL                        |
| `campaign`   | `TEXT`          | NOT NULL                        |
| `amount`     | `NUMERIC(12,2)` | NOT NULL, CHECK `(amount >= 0)` |
| `currency`   | `TEXT`          | NOT NULL, DEFAULT `'USD'`       |
| `notes`      | `TEXT`          | nullable                        |
| `metadata`   | `JSONB`         | NOT NULL, DEFAULT `'{}'`        |
| `created_by` | `TEXT`          | nullable                        |
| `created_at` | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`       |
| `updated_at` | `TIMESTAMPTZ`   | NOT NULL, DEFAULT `NOW()`       |

**Indexes:**

- `idx_ad_spend_entries_spend_date` on `(spend_date DESC)`
- `idx_ad_spend_entries_campaign` on `(LOWER(campaign))`
- `idx_ad_spend_entries_channel` on `(LOWER(channel))`

**Triggers:** `trigger_ad_spend_entries_set_updated_at` -- auto-updates `updated_at`

**DB facade functions:** `db.adSpend.getAdSpendSummary()`, `db.adSpend.getRecentAdSpendEntries()`, `db.adSpend.insertAdSpendEntries()`, `db.adSpend.deleteAdSpendEntry()`, `db.adSpend.getCampaignValueRows()`

---

### camp_seasons

Camp season definitions. Introduced in migration 006.

| Column                  | Type          | Constraints                     |
| ----------------------- | ------------- | ------------------------------- |
| `id`                    | `UUID`        | PK, DEFAULT `gen_random_uuid()` |
| `slug`                  | `TEXT`        | NOT NULL, UNIQUE                |
| `name`                  | `TEXT`        | NOT NULL                        |
| `year`                  | `INTEGER`     | NOT NULL                        |
| `is_active`             | `BOOLEAN`     | NOT NULL, DEFAULT `FALSE`       |
| `registration_open_at`  | `TIMESTAMPTZ` | nullable                        |
| `registration_close_at` | `TIMESTAMPTZ` | nullable                        |
| `created_at`            | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`       |
| `updated_at`            | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`       |

**Indexes:**

- `idx_camp_seasons_year` on `(year DESC)`
- `idx_camp_seasons_active` on `(is_active)`

**Triggers:** `trigger_camp_seasons_set_updated_at` -- auto-updates `updated_at`

---

### camp_weeks

Individual camp weeks with seat management and enrollment URLs. Introduced in migration 006.

| Column                  | Type          | Constraints                                          |
| ----------------------- | ------------- | ---------------------------------------------------- |
| `id`                    | `UUID`        | PK, DEFAULT `gen_random_uuid()`                      |
| `season_id`             | `UUID`        | NOT NULL, FK -> `camp_seasons(id)` ON DELETE CASCADE |
| `slug`                  | `TEXT`        | NOT NULL, UNIQUE                                     |
| `theme_title`           | `TEXT`        | NOT NULL                                             |
| `summary`               | `TEXT`        | NOT NULL, DEFAULT `''`                               |
| `description`           | `TEXT`        | NOT NULL, DEFAULT `''`                               |
| `start_date`            | `DATE`        | NOT NULL                                             |
| `end_date`              | `DATE`        | NOT NULL                                             |
| `age_range_label`       | `TEXT`        | NOT NULL, DEFAULT `''`                               |
| `hours_label`           | `TEXT`        | NOT NULL, DEFAULT `''`                               |
| `price_label`           | `TEXT`        | NOT NULL, DEFAULT `''`                               |
| `capacity_total`        | `INTEGER`     | NOT NULL, DEFAULT `0`                                |
| `seats_confirmed`       | `INTEGER`     | NOT NULL, DEFAULT `0`                                |
| `seats_held`            | `INTEGER`     | NOT NULL, DEFAULT `0`                                |
| `waitlist_enabled`      | `BOOLEAN`     | NOT NULL, DEFAULT `TRUE`                             |
| `limited_threshold`     | `INTEGER`     | NOT NULL, DEFAULT `4`                                |
| `enrollment_url`        | `TEXT`        | NOT NULL, DEFAULT `''`                               |
| `waitlist_url`          | `TEXT`        | nullable                                             |
| `is_published`          | `BOOLEAN`     | NOT NULL, DEFAULT `FALSE`                            |
| `display_order`         | `INTEGER`     | NOT NULL, DEFAULT `0`                                |
| `hero_media_slug`       | `TEXT`        | nullable                                             |
| `registration_open_at`  | `TIMESTAMPTZ` | nullable                                             |
| `registration_close_at` | `TIMESTAMPTZ` | nullable                                             |
| `last_synced_at`        | `TIMESTAMPTZ` | nullable                                             |
| `sync_source`           | `TEXT`        | nullable                                             |
| `created_at`            | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                            |
| `updated_at`            | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                            |

**CHECK constraints:**

- `camp_weeks_capacity_nonnegative`: `capacity_total >= 0`
- `camp_weeks_confirmed_nonnegative`: `seats_confirmed >= 0`
- `camp_weeks_held_nonnegative`: `seats_held >= 0`
- `camp_weeks_threshold_nonnegative`: `limited_threshold >= 0`
- `camp_weeks_date_order`: `end_date >= start_date`

**Indexes:**

- `idx_camp_weeks_season_id` on `(season_id)`
- `idx_camp_weeks_dates` on `(start_date, end_date)`
- `idx_camp_weeks_published` on `(is_published)`
- `idx_camp_weeks_display_order` on `(display_order)`

**Triggers:** `trigger_camp_weeks_set_updated_at` -- auto-updates `updated_at`

---

### camp_week_variants

Display-only sub-variants within a camp week (e.g., different age groups or time slots). Introduced in migration 006.

| Column            | Type          | Constraints                                        |
| ----------------- | ------------- | -------------------------------------------------- |
| `id`              | `UUID`        | PK, DEFAULT `gen_random_uuid()`                    |
| `camp_week_id`    | `UUID`        | NOT NULL, FK -> `camp_weeks(id)` ON DELETE CASCADE |
| `label`           | `TEXT`        | NOT NULL                                           |
| `age_range_label` | `TEXT`        | nullable                                           |
| `hours_label`     | `TEXT`        | nullable                                           |
| `price_label`     | `TEXT`        | nullable                                           |
| `notes`           | `TEXT`        | nullable                                           |
| `display_order`   | `INTEGER`     | NOT NULL, DEFAULT `0`                              |
| `created_at`      | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                          |
| `updated_at`      | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                          |

**Indexes:**

- `idx_camp_week_variants_week_id` on `(camp_week_id)`
- `idx_camp_week_variants_display_order` on `(display_order)`

**Triggers:** `trigger_camp_week_variants_set_updated_at` -- auto-updates `updated_at`

---

### camp_seat_adjustments

Audit trail for seat count changes on camp weeks. Introduced in migration 006.

| Column             | Type          | Constraints                                        |
| ------------------ | ------------- | -------------------------------------------------- |
| `id`               | `UUID`        | PK, DEFAULT `gen_random_uuid()`                    |
| `camp_week_id`     | `UUID`        | NOT NULL, FK -> `camp_weeks(id)` ON DELETE CASCADE |
| `action`           | `TEXT`        | NOT NULL                                           |
| `before_confirmed` | `INTEGER`     | nullable                                           |
| `after_confirmed`  | `INTEGER`     | nullable                                           |
| `before_held`      | `INTEGER`     | nullable                                           |
| `after_held`       | `INTEGER`     | nullable                                           |
| `before_capacity`  | `INTEGER`     | nullable                                           |
| `after_capacity`   | `INTEGER`     | nullable                                           |
| `note`             | `TEXT`        | nullable                                           |
| `actor_email`      | `TEXT`        | nullable                                           |
| `metadata`         | `JSONB`       | NOT NULL, DEFAULT `'{}'`                           |
| `created_at`       | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                          |

**Indexes:**

- `idx_camp_seat_adjustments_week_id` on `(camp_week_id)`
- `idx_camp_seat_adjustments_created_at` on `(created_at DESC)`

---

### school_announcements

School-wide announcements with severity levels and placement targeting. Introduced in migration 007.

| Column         | Type          | Constraints                                                                            |
| -------------- | ------------- | -------------------------------------------------------------------------------------- |
| `id`           | `UUID`        | PK, DEFAULT `gen_random_uuid()`                                                        |
| `title`        | `TEXT`        | NOT NULL                                                                               |
| `message`      | `TEXT`        | NOT NULL                                                                               |
| `severity`     | `TEXT`        | NOT NULL, DEFAULT `'info'`, CHECK IN `('info', 'reminder', 'urgent', 'closure')`       |
| `audience`     | `TEXT`        | NOT NULL, DEFAULT `'families'`                                                         |
| `placement`    | `TEXT`        | NOT NULL, DEFAULT `'global'`, CHECK IN `('global', 'homepage', 'camp', 'coming-soon')` |
| `cta_label`    | `TEXT`        | nullable                                                                               |
| `cta_url`      | `TEXT`        | nullable                                                                               |
| `starts_at`    | `TIMESTAMPTZ` | nullable                                                                               |
| `ends_at`      | `TIMESTAMPTZ` | nullable                                                                               |
| `is_published` | `BOOLEAN`     | NOT NULL, DEFAULT `FALSE`                                                              |
| `created_by`   | `TEXT`        | nullable                                                                               |
| `created_at`   | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                                                              |
| `updated_at`   | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                                                              |

**CHECK constraints:**

- `school_announcements_severity_check`: severity must be one of `info`, `reminder`, `urgent`, `closure`
- `school_announcements_placement_check`: placement must be one of `global`, `homepage`, `camp`, `coming-soon`
- `school_announcements_schedule_check`: `ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at`

**Indexes:**

- `idx_school_announcements_published_window` on `(is_published, starts_at, ends_at)`
- `idx_school_announcements_severity` on `(severity, created_at DESC)`

**Triggers:** `trigger_school_announcements_set_updated_at` -- auto-updates `updated_at`

---

### school_schedule_exceptions

School closures and modified-hours days. Introduced in migration 007.

| Column                   | Type           | Constraints                                                           |
| ------------------------ | -------------- | --------------------------------------------------------------------- |
| `id`                     | `UUID`         | PK, DEFAULT `gen_random_uuid()`                                       |
| `title`                  | `TEXT`         | NOT NULL                                                              |
| `reason`                 | `TEXT`         | nullable                                                              |
| `start_date`             | `DATE`         | NOT NULL                                                              |
| `end_date`               | `DATE`         | NOT NULL                                                              |
| `exception_type`         | `TEXT`         | NOT NULL, DEFAULT `'closed'`, CHECK IN `('closed', 'modified_hours')` |
| `open_time_decimal`      | `NUMERIC(5,2)` | nullable                                                              |
| `close_time_decimal`     | `NUMERIC(5,2)` | nullable                                                              |
| `before_care_offset`     | `NUMERIC(5,2)` | nullable                                                              |
| `after_care_offset`      | `NUMERIC(5,2)` | nullable                                                              |
| `linked_announcement_id` | `UUID`         | nullable, FK -> `school_announcements(id)` ON DELETE SET NULL         |
| `is_published`           | `BOOLEAN`      | NOT NULL, DEFAULT `FALSE`                                             |
| `created_by`             | `TEXT`         | nullable                                                              |
| `created_at`             | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                                             |
| `updated_at`             | `TIMESTAMPTZ`  | NOT NULL, DEFAULT `NOW()`                                             |

**CHECK constraints:**

- `school_schedule_exceptions_type_check`: exception_type must be one of `closed`, `modified_hours`
- `school_schedule_exceptions_date_range_check`: `end_date >= start_date`
- `school_schedule_exceptions_time_requirements_check`: `closed` type must have NULL times; `modified_hours` must have NOT NULL times

**Indexes:**

- `idx_school_schedule_exceptions_published_dates` on `(is_published, start_date, end_date)`
- `idx_school_schedule_exceptions_linked_announcement` on `(linked_announcement_id)`

**Triggers:** `trigger_school_schedule_exceptions_set_updated_at` -- auto-updates `updated_at`

---

### announcement_email_jobs

Email delivery jobs tied to school announcements. Introduced in migration 010.

| Column            | Type          | Constraints                                                                                            |
| ----------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| `id`              | `UUID`        | PK, DEFAULT `gen_random_uuid()`                                                                        |
| `announcement_id` | `UUID`        | NOT NULL, FK -> `school_announcements(id)` ON DELETE CASCADE                                           |
| `job_kind`        | `TEXT`        | NOT NULL, DEFAULT `'reminder'`, CHECK IN `('initial', 'reminder')`                                     |
| `template_key`    | `TEXT`        | NOT NULL, DEFAULT `'auto'`, CHECK IN `('auto', 'info', 'reminder', 'urgent', 'closure')`               |
| `recipients`      | `TEXT[]`      | NOT NULL, DEFAULT `'{}'`                                                                               |
| `scheduled_for`   | `TIMESTAMPTZ` | NOT NULL                                                                                               |
| `status`          | `TEXT`        | NOT NULL, DEFAULT `'scheduled'`, CHECK IN `('scheduled', 'processing', 'sent', 'failed', 'cancelled')` |
| `attempt_count`   | `INTEGER`     | NOT NULL, DEFAULT `0`                                                                                  |
| `sent_count`      | `INTEGER`     | NOT NULL, DEFAULT `0`                                                                                  |
| `sent_at`         | `TIMESTAMPTZ` | nullable                                                                                               |
| `last_error`      | `TEXT`        | nullable                                                                                               |
| `created_by`      | `TEXT`        | nullable                                                                                               |
| `created_at`      | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                                                                              |
| `updated_at`      | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                                                                              |

**Indexes:**

- `idx_announcement_email_jobs_due` on `(status, scheduled_for ASC)`
- `idx_announcement_email_jobs_announcement` on `(announcement_id, created_at DESC)`

**Triggers:** `trigger_announcement_email_jobs_set_updated_at` -- auto-updates `updated_at`

---

### donation_events

Donation events received from Stripe webhooks. Introduced in migration 011.

| Column                    | Type          | Constraints                                                                                     |
| ------------------------- | ------------- | ----------------------------------------------------------------------------------------------- |
| `id`                      | `UUID`        | PK, DEFAULT `gen_random_uuid()`                                                                 |
| `stripe_event_id`         | `TEXT`        | NOT NULL, UNIQUE                                                                                |
| `stripe_event_type`       | `TEXT`        | NOT NULL                                                                                        |
| `stripe_object_id`        | `TEXT`        | nullable                                                                                        |
| `stripe_customer_id`      | `TEXT`        | nullable                                                                                        |
| `stripe_subscription_id`  | `TEXT`        | nullable                                                                                        |
| `donor_name`              | `TEXT`        | nullable                                                                                        |
| `donor_email`             | `TEXT`        | nullable                                                                                        |
| `amount_cents`            | `INTEGER`     | nullable                                                                                        |
| `currency`                | `TEXT`        | nullable                                                                                        |
| `donation_kind`           | `TEXT`        | NOT NULL, DEFAULT `'one-time'`, CHECK IN `('one-time', 'recurring-start', 'recurring-renewal')` |
| `source`                  | `TEXT`        | NOT NULL, DEFAULT `'stripe'`                                                                    |
| `event_created_at`        | `TIMESTAMPTZ` | NOT NULL                                                                                        |
| `metadata`                | `JSONB`       | NOT NULL, DEFAULT `'{}'`                                                                        |
| `thank_you_email_status`  | `TEXT`        | NOT NULL, DEFAULT `'pending'`, CHECK IN `('pending', 'sent', 'skipped', 'failed')`              |
| `thank_you_email_sent_at` | `TIMESTAMPTZ` | nullable                                                                                        |
| `thank_you_email_error`   | `TEXT`        | nullable                                                                                        |
| `created_at`              | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                                                                       |
| `updated_at`              | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                                                                       |

**Indexes:**

- `idx_donation_events_created` on `(event_created_at DESC)`
- `idx_donation_events_email` on `(donor_email)`
- `idx_donation_events_email_status` on `(thank_you_email_status, created_at DESC)`

**Triggers:** `trigger_donation_events_set_updated_at` -- auto-updates `updated_at`

---

### donation_email_jobs

Email delivery jobs for donation thank-you messages. Introduced in migration 011.

| Column              | Type          | Constraints                                                                                            |
| ------------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| `id`                | `UUID`        | PK, DEFAULT `gen_random_uuid()`                                                                        |
| `donation_event_id` | `UUID`        | NOT NULL, FK -> `donation_events(id)` ON DELETE CASCADE                                                |
| `job_kind`          | `TEXT`        | NOT NULL, DEFAULT `'reminder'`, CHECK IN `('reminder', 'retry', 'manual-resend')`                      |
| `template_key`      | `TEXT`        | NOT NULL, DEFAULT `'auto'`, CHECK IN `('auto', 'one-time', 'recurring-start', 'recurring-renewal')`    |
| `scheduled_for`     | `TIMESTAMPTZ` | NOT NULL                                                                                               |
| `status`            | `TEXT`        | NOT NULL, DEFAULT `'scheduled'`, CHECK IN `('scheduled', 'processing', 'sent', 'failed', 'cancelled')` |
| `attempt_count`     | `INTEGER`     | NOT NULL, DEFAULT `0`                                                                                  |
| `sent_at`           | `TIMESTAMPTZ` | nullable                                                                                               |
| `last_error`        | `TEXT`        | nullable                                                                                               |
| `created_by`        | `TEXT`        | nullable                                                                                               |
| `created_at`        | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                                                                              |
| `updated_at`        | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()`                                                                              |

**Indexes:**

- `idx_donation_email_jobs_due` on `(status, scheduled_for ASC)`
- `idx_donation_email_jobs_event` on `(donation_event_id, created_at DESC)`

**Triggers:** `trigger_donation_email_jobs_set_updated_at` -- auto-updates `updated_at`

---

## Data-Only Migrations (No New Tables)

| Migration | Description                                                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **002**   | Seeds default rows into `settings`, `admin_settings`, and `communications_templates`                                          |
| **003**   | Updates `content` rows to remove "field trip" references from FAQ bullet data                                                 |
| **008**   | Seeds email routing settings into `settings` (contact form, coming-soon form notification and confirmation config)            |
| **009**   | Seeds camp and tour email routing settings into `settings`                                                                    |
| **012**   | Seeds donation internal notification settings into `settings`                                                                 |
| **013**   | Adds `ip_address` column and anti-bot indexes to `contact_form_submissions`                                                   |
| **014**   | One-time retention cleanup: deletes expired auth tokens/sessions (>30 days past expiry) and analytics events (>12 months old) |

---

## Relationships Diagram

```
settings (standalone KV store)
admin_settings (standalone KV store)
media (standalone)
content (standalone)
analytics_events (standalone)
ad_spend_entries (standalone)
communications_messages (standalone)
communications_templates (standalone)
contact_form_submissions (standalone)
admin_login_tokens (standalone)
admin_auth_sessions (standalone)

camp_seasons
  |
  +--< camp_weeks (season_id FK, ON DELETE CASCADE)
         |
         +--< camp_week_variants (camp_week_id FK, ON DELETE CASCADE)
         |
         +--< camp_seat_adjustments (camp_week_id FK, ON DELETE CASCADE)

school_announcements
  |
  +--< announcement_email_jobs (announcement_id FK, ON DELETE CASCADE)
  |
  +--< school_schedule_exceptions (linked_announcement_id FK, ON DELETE SET NULL)

donation_events
  |
  +--< donation_email_jobs (donation_event_id FK, ON DELETE CASCADE)
```

**FK summary:**

| Child Table                  | Column                   | Parent Table               | On Delete |
| ---------------------------- | ------------------------ | -------------------------- | --------- |
| `camp_weeks`                 | `season_id`              | `camp_seasons(id)`         | CASCADE   |
| `camp_week_variants`         | `camp_week_id`           | `camp_weeks(id)`           | CASCADE   |
| `camp_seat_adjustments`      | `camp_week_id`           | `camp_weeks(id)`           | CASCADE   |
| `announcement_email_jobs`    | `announcement_id`        | `school_announcements(id)` | CASCADE   |
| `school_schedule_exceptions` | `linked_announcement_id` | `school_announcements(id)` | SET NULL  |
| `donation_email_jobs`        | `donation_event_id`      | `donation_events(id)`      | CASCADE   |

---

## Table Count Summary

| Domain          | Tables                                                                          |
| --------------- | ------------------------------------------------------------------------------- |
| CMS & Config    | `content`, `settings`, `admin_settings`, `media`                                |
| Communications  | `communications_messages`, `communications_templates`                           |
| Contact         | `contact_form_submissions`                                                      |
| Auth            | `admin_login_tokens`, `admin_auth_sessions`                                     |
| Analytics & Ads | `analytics_events`, `ad_spend_entries`                                          |
| Camp            | `camp_seasons`, `camp_weeks`, `camp_week_variants`, `camp_seat_adjustments`     |
| School Ops      | `school_announcements`, `school_schedule_exceptions`, `announcement_email_jobs` |
| Donations       | `donation_events`, `donation_email_jobs`                                        |

**Total: 19 tables**
