INSERT INTO settings (key, value)
VALUES
  ('coming_soon_enabled', 'true'::jsonb),
  ('coming_soon_message', to_jsonb('We''re updating our website to enhance your experience. Thank you for your patience!'::text)),
  ('coming_soon_launch_date', to_jsonb('Fall 2026'::text)),
  ('donation_external_link', to_jsonb(''::text)),
  ('enrollment_external_link', to_jsonb(''::text)),
  ('tour_scheduling_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_settings (setting_key, setting_value, setting_category, description, is_sensitive)
VALUES
  ('storage_provider', to_jsonb('local'::text), 'storage', 'Storage backend provider', false),
  ('max_file_size', to_jsonb(10), 'storage', 'Maximum upload size in MB', false),
  ('gcs_config', '{}'::jsonb, 'storage', 'Google Cloud Storage configuration', true),
  ('r2_config', '{}'::jsonb, 'storage', 'Cloudflare R2 configuration', true),
  ('b2_config', '{}'::jsonb, 'storage', 'Backblaze B2 configuration', true)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO communications_templates
  (name, description, message_type, subject_template, content_template, created_by)
VALUES
  (
    'General Announcement',
    'Default announcement template for families',
    'announcement',
    'Spicebush Montessori Update',
    'Hello families,\n\n{{message}}\n\nThank you,\nSpicebush Montessori',
    'system'
  )
ON CONFLICT DO NOTHING;
