CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_category TEXT,
  page_path TEXT,
  page_url TEXT,
  referrer_url TEXT,
  session_id TEXT,
  client_id TEXT,
  event_value NUMERIC,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created_at
  ON analytics_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_page_path
  ON analytics_events (page_path);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id
  ON analytics_events (session_id);

ALTER TABLE contact_form_submissions
  ADD COLUMN IF NOT EXISTS attribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS landing_page TEXT,
  ADD COLUMN IF NOT EXISTS referrer_url TEXT;

CREATE INDEX IF NOT EXISTS idx_contact_form_submissions_landing_page
  ON contact_form_submissions (landing_page);

CREATE INDEX IF NOT EXISTS idx_contact_form_submissions_utm_campaign
  ON contact_form_submissions ((COALESCE(attribution ->> 'utm_campaign', '')));
