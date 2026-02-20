CREATE TABLE IF NOT EXISTS donation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  stripe_event_type TEXT NOT NULL,
  stripe_object_id TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  donor_name TEXT,
  donor_email TEXT,
  amount_cents INTEGER,
  currency TEXT,
  donation_kind TEXT NOT NULL DEFAULT 'one-time',
  source TEXT NOT NULL DEFAULT 'stripe',
  event_created_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  thank_you_email_status TEXT NOT NULL DEFAULT 'pending',
  thank_you_email_sent_at TIMESTAMPTZ,
  thank_you_email_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT donation_events_kind_check
    CHECK (donation_kind IN ('one-time', 'recurring-start', 'recurring-renewal')),
  CONSTRAINT donation_events_email_status_check
    CHECK (thank_you_email_status IN ('pending', 'sent', 'skipped', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_donation_events_created
  ON donation_events (event_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donation_events_email
  ON donation_events (donor_email);
CREATE INDEX IF NOT EXISTS idx_donation_events_email_status
  ON donation_events (thank_you_email_status, created_at DESC);

DROP TRIGGER IF EXISTS trigger_donation_events_set_updated_at ON donation_events;
CREATE TRIGGER trigger_donation_events_set_updated_at
  BEFORE UPDATE ON donation_events
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_column();

CREATE TABLE IF NOT EXISTS donation_email_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_event_id UUID NOT NULL REFERENCES donation_events(id) ON DELETE CASCADE,
  job_kind TEXT NOT NULL DEFAULT 'reminder',
  template_key TEXT NOT NULL DEFAULT 'auto',
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT donation_email_jobs_kind_check
    CHECK (job_kind IN ('reminder', 'retry', 'manual-resend')),
  CONSTRAINT donation_email_jobs_template_check
    CHECK (template_key IN ('auto', 'one-time', 'recurring-start', 'recurring-renewal')),
  CONSTRAINT donation_email_jobs_status_check
    CHECK (status IN ('scheduled', 'processing', 'sent', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_donation_email_jobs_due
  ON donation_email_jobs (status, scheduled_for ASC);
CREATE INDEX IF NOT EXISTS idx_donation_email_jobs_event
  ON donation_email_jobs (donation_event_id, created_at DESC);

DROP TRIGGER IF EXISTS trigger_donation_email_jobs_set_updated_at ON donation_email_jobs;
CREATE TRIGGER trigger_donation_email_jobs_set_updated_at
  BEFORE UPDATE ON donation_email_jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_column();

INSERT INTO settings (key, value)
VALUES
  ('donation_thank_you_enabled', 'true'::jsonb),
  ('donation_thank_you_send_recurring_renewals', 'false'::jsonb),
  ('donation_thank_you_default_reminder_hours', to_jsonb(72))
ON CONFLICT (key) DO NOTHING;

INSERT INTO communications_templates
  (name, description, message_type, subject_template, content_template, created_by)
VALUES
  (
    'Donation Thank You - One-Time',
    'Warm thank-you message for one-time donors.',
    'donation_thank_you_one_time',
    'Thank you for your gift to Spicebush Montessori, {{first_name}}',
    'Dear {{first_name}},\n\nThank you so much for your one-time gift of {{amount}}. Your generosity directly supports inclusive Montessori learning for children and families in our community.\n\nYour support helps us:\n- Keep tuition as accessible as possible\n- Provide rich classroom materials and experiences\n- Sustain a warm and welcoming environment for every child\n\nDonation details:\n- Amount: {{amount}}\n- Date: {{donation_date}}\n\nWith deep gratitude,\nSpicebush Montessori School',
    'system'
  ),
  (
    'Donation Thank You - Recurring Start',
    'Warm thank-you message when a donor starts monthly giving.',
    'donation_thank_you_recurring_start',
    'Welcome to monthly giving, {{first_name}} — thank you',
    'Dear {{first_name}},\n\nThank you for starting a monthly gift of {{amount}} to Spicebush Montessori. Ongoing support like yours gives our school stability and helps us plan boldly for children and families.\n\nYour recurring donation supports:\n- Consistent classroom resources throughout the year\n- Inclusive programming and support for diverse learners\n- Long-term planning that keeps our mission strong\n\nDonation details:\n- Monthly amount: {{amount}}\n- Start date: {{donation_date}}\n\nWe are so grateful to have you as part of this work.\n\nWarmly,\nSpicebush Montessori School',
    'system'
  ),
  (
    'Donation Thank You - Recurring Renewal',
    'Warm thank-you message for recurring donation renewals.',
    'donation_thank_you_recurring_renewal',
    'Thank you for your continued monthly support, {{first_name}}',
    'Dear {{first_name}},\n\nThank you for your continued monthly gift of {{amount}}. Your consistency makes a real, practical difference for our children, classrooms, and families.\n\nDonation details:\n- Monthly amount: {{amount}}\n- Date received: {{donation_date}}\n\nWe appreciate your ongoing generosity more than we can say.\n\nWith gratitude,\nSpicebush Montessori School',
    'system'
  )
ON CONFLICT (name) DO NOTHING;
