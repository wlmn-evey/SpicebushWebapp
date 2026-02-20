CREATE TABLE IF NOT EXISTS announcement_email_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES school_announcements(id) ON DELETE CASCADE,
  job_kind TEXT NOT NULL DEFAULT 'reminder',
  template_key TEXT NOT NULL DEFAULT 'auto',
  recipients TEXT[] NOT NULL DEFAULT '{}',
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT announcement_email_jobs_kind_check
    CHECK (job_kind IN ('initial', 'reminder')),
  CONSTRAINT announcement_email_jobs_template_check
    CHECK (template_key IN ('auto', 'info', 'reminder', 'urgent', 'closure')),
  CONSTRAINT announcement_email_jobs_status_check
    CHECK (status IN ('scheduled', 'processing', 'sent', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_announcement_email_jobs_due
  ON announcement_email_jobs (status, scheduled_for ASC);

CREATE INDEX IF NOT EXISTS idx_announcement_email_jobs_announcement
  ON announcement_email_jobs (announcement_id, created_at DESC);

DROP TRIGGER IF EXISTS trigger_announcement_email_jobs_set_updated_at ON announcement_email_jobs;
CREATE TRIGGER trigger_announcement_email_jobs_set_updated_at
  BEFORE UPDATE ON announcement_email_jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_column();

INSERT INTO settings (key, value)
VALUES
  ('announcement_email_recipients', to_jsonb('information@spicebushmontessori.org'::text))
ON CONFLICT (key) DO NOTHING;

INSERT INTO communications_templates
  (name, description, message_type, subject_template, content_template, created_by)
VALUES
  (
    'Announcement Email - Information',
    'Parent-facing informational update email template.',
    'announcement_email_info',
    'Spicebush Update: {{title}}',
    'Hello families,\n\n{{message}}\n\n{{schedule_window}}\n\nThank you,\nSpicebush Montessori School',
    'system'
  ),
  (
    'Announcement Email - Reminder',
    'Parent-facing reminder email template.',
    'announcement_email_reminder',
    'Reminder: {{title}}',
    'Hello families,\n\nThis is a friendly reminder:\n{{message}}\n\n{{schedule_window}}\n\nWarmly,\nSpicebush Montessori School',
    'system'
  ),
  (
    'Announcement Email - Urgent',
    'Parent-facing urgent email template.',
    'announcement_email_urgent',
    'Urgent: {{title}}',
    'Hello families,\n\nPlease review this urgent school update:\n{{message}}\n\n{{schedule_window}}\n\nIf you have questions, please contact us right away.\n\nSpicebush Montessori School',
    'system'
  ),
  (
    'Announcement Email - Closure',
    'Parent-facing closure email template.',
    'announcement_email_closure',
    'School Closure Notice: {{title}}',
    'Hello families,\n\nPlease note this school closure update:\n{{message}}\n\n{{schedule_window}}\n\nWe appreciate your flexibility and understanding.\n\nSpicebush Montessori School',
    'system'
  )
ON CONFLICT (name) DO NOTHING;
