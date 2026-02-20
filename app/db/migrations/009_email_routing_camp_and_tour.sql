INSERT INTO settings (key, value)
VALUES
  ('camp_form_notify_emails', to_jsonb('information@spicebushmontessori.org'::text)),
  ('camp_form_notify_subject', to_jsonb('New Camp Question - {{name}}'::text)),
  ('camp_form_confirm_submitter', 'true'::jsonb),
  ('camp_form_confirm_subject', to_jsonb('Thanks for your camp question'::text)),
  ('tour_request_notify_emails', to_jsonb('information@spicebushmontessori.org'::text)),
  ('tour_request_notify_subject', to_jsonb('New Tour Request - {{name}}'::text)),
  ('tour_request_confirm_submitter', 'true'::jsonb),
  ('tour_request_confirm_subject', to_jsonb('Tour Request Confirmation - Spicebush Montessori'::text))
ON CONFLICT (key) DO NOTHING;
