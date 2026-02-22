INSERT INTO settings (key, value)
VALUES
  ('donation_internal_notify_enabled', 'true'::jsonb),
  ('donation_internal_notify_emails', to_jsonb('information@spicebushmontessori.org'::text)),
  ('donation_internal_notify_subject', to_jsonb('New donation received: {{amount}} from {{donor_name}}'::text))
ON CONFLICT (key) DO NOTHING;
