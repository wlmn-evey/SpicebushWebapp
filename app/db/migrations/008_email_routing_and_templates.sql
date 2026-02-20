INSERT INTO settings (key, value)
VALUES
  ('school_email', to_jsonb('information@spicebushmontessori.org'::text)),
  ('contact_form_notify_emails', to_jsonb('information@spicebushmontessori.org'::text)),
  ('coming_soon_form_notify_emails', to_jsonb('information@spicebushmontessori.org'::text)),
  ('contact_form_notify_subject', to_jsonb('New Contact Form Inquiry - {{name}}'::text)),
  ('coming_soon_form_notify_subject', to_jsonb('New Coming Soon Inquiry - {{name}}'::text)),
  ('contact_form_confirm_submitter', 'true'::jsonb),
  ('coming_soon_form_confirm_submitter', 'true'::jsonb),
  ('contact_form_confirm_subject', to_jsonb('Thanks for contacting Spicebush Montessori'::text)),
  ('coming_soon_form_confirm_subject', to_jsonb('Thanks for your interest in Spicebush Montessori'::text))
ON CONFLICT (key) DO NOTHING;
