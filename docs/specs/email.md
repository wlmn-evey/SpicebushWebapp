# Email System Specification

This document describes the email subsystem of the Spicebush Montessori webapp: provider abstraction, email types, template system, routing configuration, and build-time considerations.

## 1. Provider Abstraction

### Architecture

The email system is built on a provider-agnostic abstraction defined in `app/src/lib/email-service.ts`. A singleton `emailService` instance manages multiple providers and handles fallback logic.

**Core interfaces:**

- `EmailMessage` -- the canonical message shape accepted by all providers (to, from, fromName, subject, text, html, replyTo, attachments).
- `EmailProvider` -- each provider implements `name`, `send(message)`, and `isConfigured()`.
- `EmailResult` -- uniform result shape with `success`, `messageId`, `error`, and `provider`.

### Supported Providers

| Provider | Class | API Key Env Var | Additional Env Vars |
|----------|-------|----------------|---------------------|
| **SendGrid** | `SendGridProvider` | `SENDGRID_API_KEY` | `SENDGRID_API_BASE_URL` (default `https://api.sendgrid.com/v3`), `SENDGRID_TIMEOUT_MS` (default 15000) |
| **Unione.io** | `UnioneProvider` | `UNIONE_API_KEY` | `UNIONE_REGION` (`eu` or `us`, default `eu`) |

Both providers are always instantiated. Only providers with a non-empty API key are considered "configured."

### Provider Selection and Fallback

1. The `EMAIL_SERVICE` env var selects the preferred provider (normalized to lowercase; `send-grid` is aliased to `sendgrid`). Default: `sendgrid`.
2. On send, the preferred provider is tried first.
3. If the preferred provider fails, the system iterates through remaining configured providers until one succeeds.
4. If all fail, a combined error message is returned.

### Sender Resolution

Sender address is resolved through a four-level cascade:

1. **Explicit `from` on the message** -- used as-is if valid.
2. **Environment variables** -- `EMAIL_FROM` or `SENDGRID_FROM_EMAIL`.
3. **Database settings** -- queries the `settings` table for keys `school_email`, `main_email`, `contact_email` (in priority order, cached for 5 minutes).
4. **Hardcoded fallback** -- `information@spicebushmontessori.org`.

The sender display name follows a similar cascade: `message.fromName` > `EMAIL_FROM_NAME` env var > `'Spicebush Montessori'`.

## 2. Email Types

### 2.1 Magic-Link Admin Authentication

**Source:** `app/src/lib/auth/admin-session.ts`

- Triggered when an admin requests a login link via `requestAdminMagicLink()`.
- Generates a cryptographically random 32-byte hex token, stores its SHA-256 hash in `admin_login_tokens`.
- Sends a single email with a login URL containing the raw token as a query parameter.
- Link expires in 15 minutes.
- Rate limited: max 5 requests per email per 5-minute window.
- Uses the shared `emailService.send()` path.
- Template is inline (not database-driven): simple HTML with a styled sign-in link plus the shared school contact footer.

### 2.2 Contact/Inquiry Confirmation and Notification

**Source:** `app/src/lib/contact-email.ts`

Handles four submission sources, each with independent routing configuration:

| Source | Label | Settings Key Prefix |
|--------|-------|---------------------|
| `contact` | Contact Form Inquiry | `contact_form_` |
| `coming-soon` | Coming Soon Inquiry | `coming_soon_form_` |
| `camp` | Camp Inquiry | `camp_form_` |
| `tour` | Tour Request | `tour_request_` |

For each submission, two emails may be sent:

1. **Owner notification** -- sent to the configured recipient list (fallback: school email). Includes all form fields in a structured table layout. Sets `replyTo` to the submitter's address so staff can reply directly.
2. **Submitter confirmation** -- sent to the submitter if the per-source `*_confirm_submitter` setting is enabled (default: `true`). Provides a friendly acknowledgment with source-specific follow-up messaging (tour scheduling, camp details, etc.).

Both emails are logged to the `communications_messages` table with `message_type` values like `contact_form_owner_notification`, `tour_request_submitter_confirmation`, etc.

Subject lines support `{{name}}`, `{{subject}}`, and `{{source}}` interpolation.

### 2.3 Announcement Email Notifications

**Source:** `app/src/lib/announcement-email.ts`

Sends school announcements to families. Two delivery modes:

- **Send now** (`sendAnnouncementEmailNow`) -- immediate delivery.
- **Scheduled** (`scheduleAnnouncementEmailReminder`) -- creates a job in `announcement_email_jobs` for later processing.

Template selection uses an "auto" mode that maps announcement severity to a template key:

| Severity | Template Key | Subject Pattern |
|----------|-------------|-----------------|
| `info` | `info` | `Spicebush Update: {{title}}` |
| `reminder` | `reminder` | `Reminder: {{title}}` |
| `urgent` | `urgent` | `Urgent: {{title}}` |
| `closure` | `closure` | `School Closure Notice: {{title}}` |

Admins can override the template selection when sending. Templates are loaded from the `communications_templates` table with hardcoded defaults as fallback.

Content interpolation supports: `{{title}}`, `{{message}}`, `{{severity}}`, `{{severity_label}}`, `{{placement}}`, `{{placement_label}}`, `{{starts_at}}`, `{{ends_at}}`, `{{schedule_window}}`, `{{cta_label}}`, `{{cta_url}}`, `{{school_name}}`.

Job processing (`processDueAnnouncementEmailJobs`) uses `SELECT ... FOR UPDATE SKIP LOCKED` to safely claim due jobs in concurrent environments. Jobs track `attempt_count`, `sent_count`, `sent_at`, and `last_error`.

### 2.4 Donation Thank-You Emails

**Source:** `app/src/lib/donation-thank-you.ts`

Triggered by Stripe webhook events. Three donation kinds, each with a dedicated template:

| Kind | Template `message_type` | Subject Pattern |
|------|------------------------|-----------------|
| `one-time` | `donation_thank_you_one_time` | `Thank you for your gift to Spicebush Montessori, {{first_name}}` |
| `recurring-start` | `donation_thank_you_recurring_start` | `Welcome to monthly giving, {{first_name}} -- thank you` |
| `recurring-renewal` | `donation_thank_you_recurring_renewal` | `Thank you for your continued monthly support, {{first_name}}` |

Controlled by settings:
- `donation_thank_you_enabled` -- global on/off (default: `true`).
- `donation_thank_you_send_recurring_renewals` -- whether renewal payments trigger emails (default: `false`).
- `donation_thank_you_default_reminder_hours` -- default reminder delay (default: 72 hours).

The `donation_events` table tracks per-event email status (`pending`, `sent`, `skipped`, `failed`) via the `thank_you_email_status` column.

The `donation_email_jobs` table supports scheduled retries and manual resends with job kinds: `reminder`, `retry`, `manual-resend`.

### 2.5 Donation Internal Notifications

**Source:** Migration 012

Separate from donor-facing thank-you emails. Notifies staff when a donation is received.

- `donation_internal_notify_enabled` -- on/off (default: `true`).
- `donation_internal_notify_emails` -- recipient list (default: `information@spicebushmontessori.org`).
- `donation_internal_notify_subject` -- subject template with `{{amount}}` and `{{donor_name}}` interpolation.

## 3. Template System

### Inline Templates

Magic-link auth and contact form emails use inline HTML/text templates built directly in their respective modules. They share the `emailShell()` pattern (contact-email.ts) for consistent branded email layout:

- Branded green gradient header with school name and title.
- Content area with intro text and structured body.
- Shared footer with school contact information and directions.
- Hidden preheader text for email client previews.

### Database Templates (`communications_templates`)

Announcement and donation thank-you emails use the `communications_templates` table:

```
communications_templates
  id              UUID (PK)
  name            TEXT (unique)
  description     TEXT
  message_type    TEXT (indexed)
  subject_template TEXT
  content_template TEXT
  usage_count     INTEGER
  last_used_at    TIMESTAMPTZ
  created_by      TEXT
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ
```

Templates are loaded by `message_type` and merged with hardcoded defaults. If a template is missing or the DB query fails, the system falls back to built-in default templates silently (logged as a warning).

### Shared Footer (`email-template-footer.ts`)

All email types share a footer module that provides:

- **`resolveSchoolEmailContactInfo(settings)`** -- resolves school email, phone, address, and directions URL from `settings` table values with hardcoded defaults.
- **`buildSchoolContactFooterHtml(info, options)`** -- renders an HTML footer block with phone (tel: link), email (mailto: link), address, and Google Maps directions link.
- **`buildSchoolContactFooterText(info, options)`** -- plain-text equivalent.
- **`EMAIL_CONFIDENTIALITY_NOTICE`** -- standard confidentiality disclaimer appended to all emails.

Default contact values: `information@spicebushmontessori.org`, `(484) 202-0712`, `827 Concord Road, Glen Mills, PA 19342`.

## 4. Email Routing Database Tables

### Settings Keys (migrations 008, 009, 010, 011, 012)

All routing configuration is stored in the `settings` table as JSONB values.

**Contact form routing (per source):**

| Key Pattern | Example | Purpose |
|-------------|---------|---------|
| `{source}_notify_emails` | `contact_form_notify_emails` | Comma/newline/semicolon-separated recipient list |
| `{source}_notify_subject` | `contact_form_notify_subject` | Subject template with `{{name}}` interpolation |
| `{source}_confirm_submitter` | `contact_form_confirm_submitter` | Boolean: send confirmation to submitter |
| `{source}_confirm_subject` | `contact_form_confirm_subject` | Confirmation email subject template |

Sources: `contact_form`, `coming_soon_form`, `camp_form`, `tour_request`.

**Announcement routing:**

| Key | Purpose |
|-----|---------|
| `announcement_email_recipients` | Recipient list for announcement emails |

**Donation routing:**

| Key | Purpose |
|-----|---------|
| `donation_thank_you_enabled` | Enable/disable donor thank-you emails |
| `donation_thank_you_send_recurring_renewals` | Email on recurring renewals |
| `donation_thank_you_default_reminder_hours` | Delay before reminder (72h default) |
| `donation_internal_notify_enabled` | Enable/disable staff donation notifications |
| `donation_internal_notify_emails` | Staff notification recipient list |
| `donation_internal_notify_subject` | Staff notification subject template |

### `announcement_email_jobs` (migration 010)

```
announcement_email_jobs
  id               UUID (PK)
  announcement_id  UUID (FK -> school_announcements, CASCADE)
  job_kind         TEXT ('initial' | 'reminder')
  template_key     TEXT ('auto' | 'info' | 'reminder' | 'urgent' | 'closure')
  recipients       TEXT[]
  scheduled_for    TIMESTAMPTZ
  status           TEXT ('scheduled' | 'processing' | 'sent' | 'failed' | 'cancelled')
  attempt_count    INTEGER
  sent_count       INTEGER
  sent_at          TIMESTAMPTZ
  last_error       TEXT
  created_by       TEXT
  created_at       TIMESTAMPTZ
  updated_at       TIMESTAMPTZ (auto-updated via trigger)
```

Indexes: `(status, scheduled_for ASC)` for job polling, `(announcement_id, created_at DESC)` for per-announcement history.

### `donation_events` (migration 011)

```
donation_events
  id                       UUID (PK)
  stripe_event_id          TEXT (unique)
  stripe_event_type        TEXT
  stripe_object_id         TEXT
  stripe_customer_id       TEXT
  stripe_subscription_id   TEXT
  donor_name               TEXT
  donor_email              TEXT
  amount_cents             INTEGER
  currency                 TEXT
  donation_kind            TEXT ('one-time' | 'recurring-start' | 'recurring-renewal')
  source                   TEXT (default 'stripe')
  event_created_at         TIMESTAMPTZ
  metadata                 JSONB
  thank_you_email_status   TEXT ('pending' | 'sent' | 'skipped' | 'failed')
  thank_you_email_sent_at  TIMESTAMPTZ
  thank_you_email_error    TEXT
  created_at               TIMESTAMPTZ
  updated_at               TIMESTAMPTZ (auto-updated via trigger)
```

Indexes: `(event_created_at DESC)`, `(donor_email)`, `(thank_you_email_status, created_at DESC)`.

### `donation_email_jobs` (migration 011)

```
donation_email_jobs
  id                 UUID (PK)
  donation_event_id  UUID (FK -> donation_events, CASCADE)
  job_kind           TEXT ('reminder' | 'retry' | 'manual-resend')
  template_key       TEXT ('auto' | 'one-time' | 'recurring-start' | 'recurring-renewal')
  scheduled_for      TIMESTAMPTZ
  status             TEXT ('scheduled' | 'processing' | 'sent' | 'failed' | 'cancelled')
  attempt_count      INTEGER
  sent_at            TIMESTAMPTZ
  last_error         TEXT
  created_by         TEXT
  created_at         TIMESTAMPTZ
  updated_at         TIMESTAMPTZ (auto-updated via trigger)
```

Indexes: `(status, scheduled_for ASC)`, `(donation_event_id, created_at DESC)`.

### `communications_messages` (migration 001 -- email log)

All sent emails are logged here for audit and admin visibility:

```
communications_messages
  id               UUID (PK)
  subject          TEXT
  message_content  TEXT
  message_type     TEXT (indexed)
  recipient_type   TEXT ('all' | 'custom_list' | 'single')
  recipient_count  INTEGER
  scheduled_for    TIMESTAMPTZ
  sent_at          TIMESTAMPTZ (indexed DESC)
  status           TEXT ('draft' | 'scheduled' | 'sent' | 'failed', indexed)
  delivery_stats   JSONB (provider, messageId, recipients, error, etc.)
  created_by       TEXT
  created_at       TIMESTAMPTZ
  updated_at       TIMESTAMPTZ
```

## 5. Build-Time Externalization

In `app/astro.config.mjs`, three email provider packages are declared as Rollup externals:

```javascript
vite: {
  build: {
    rollupOptions: {
      external: ['resend', '@sendgrid/mail', 'postmark'],
    }
  }
}
```

These packages are **not bundled** into the build output. They are expected to resolve at runtime on Netlify Functions. This allows the application to reference these packages without including them in the client or SSR bundle, reducing bundle size.

Note: The current provider implementations (`SendGridProvider`, `UnioneProvider`) use direct `fetch()` calls to provider REST APIs rather than importing these SDK packages. The externalization exists as a safety net so that if any transitive dependency or future code path imports these packages, the build will not fail.

## 6. Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_SERVICE` | No | `sendgrid` | Preferred provider: `sendgrid` or `unione` |
| `EMAIL_FROM` | No | (DB/fallback) | Sender email address |
| `EMAIL_FROM_NAME` | No | `Spicebush Montessori` | Sender display name |
| `SENDGRID_API_KEY` | For SendGrid | -- | SendGrid API key |
| `SENDGRID_FROM_EMAIL` | No | (fallback for `EMAIL_FROM`) | Legacy sender address env var |
| `SENDGRID_API_BASE_URL` | No | `https://api.sendgrid.com/v3` | SendGrid API base URL |
| `SENDGRID_TIMEOUT_MS` | No | `15000` | SendGrid request timeout in ms |
| `UNIONE_API_KEY` | For Unione | -- | Unione.io API key |
| `UNIONE_REGION` | No | `eu` | Unione region: `eu` or `us` |

### Database Settings Keys

See Section 4 for the complete list of `settings` table keys that control email routing and behavior.

## 7. API Endpoints

### `POST /api/email/send`

Admin-only endpoint for sending arbitrary emails. Requires `sbms-admin-session` cookie with valid admin session.

**Request body:** `{ to, subject, text?, html?, from?, fromName?, replyTo? }`

**Responses:**
- `200` -- `{ success: true, messageId, provider }`
- `400` -- missing required fields
- `403` -- not authenticated as admin
- `500` -- send failure (generic error message)

### `GET /api/email/send`

Admin-only endpoint returning email service status.

**Response:** `{ configured, providers: { SendGrid: bool, Unione: bool }, configuredProviders: string[], preferredProvider }`

## 8. Audit Findings

### P2-2: Error Detail Leak in Email Endpoint (Resolved)

The `/api/email/send` endpoint previously exposed internal error details (provider error messages, stack traces) in its HTTP response body. This was identified as a P2 security finding.

**Resolution:** Error responses were sanitized to return generic messages (`'Failed to send email'`, `'Internal server error'`) while logging full error details server-side via `logServerError()`. The current implementation in `app/src/pages/api/email/send.ts` returns:
- On provider failure: `{ error: 'Failed to send email' }` (no provider details).
- On unexpected exception: `{ error: 'Internal server error', details: 'Internal error' }` (no stack trace or exception message).

Full error context is preserved in server logs for debugging.
