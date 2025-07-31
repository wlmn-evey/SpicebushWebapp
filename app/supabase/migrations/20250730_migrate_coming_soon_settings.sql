-- Migration: Migrate coming-soon settings from markdown files to database
-- Date: 2025-07-30
-- Description: This migration inserts the coming-soon configuration settings
-- that were previously stored in markdown files into the settings table.

-- Insert coming-soon settings with upsert behavior
INSERT INTO settings (key, value, updated_at) VALUES
  ('coming_soon_mode', 'false', NOW()),
  ('coming_soon_launch_date', '2025-02-01', NOW()),
  ('coming_soon_message', 'We''re preparing something special for you. Our new website will launch soon with exciting features and resources for families interested in Montessori education.', NOW()),
  ('coming_soon_newsletter', 'true', NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW()
WHERE settings.value IS DISTINCT FROM EXCLUDED.value;

-- Migrate existing coming_soon_enabled to coming_soon_mode if it exists
UPDATE settings
SET key = 'coming_soon_mode',
    updated_at = NOW()
WHERE key = 'coming_soon_enabled';

-- Add a comment to document the settings
COMMENT ON TABLE settings IS 'Key-value configuration settings for the application';

-- Log the migration results
DO $$
DECLARE
  setting_count INTEGER;
BEGIN
  -- Count the coming-soon settings
  SELECT COUNT(*) INTO setting_count
  FROM settings
  WHERE key LIKE 'coming_soon_%';
  
  RAISE NOTICE 'Migration complete. Found % coming-soon settings in database.', setting_count;
  
  -- List all coming-soon settings for verification
  RAISE NOTICE 'Current coming-soon settings:';
  FOR r IN SELECT key, value FROM settings WHERE key LIKE 'coming_soon_%' ORDER BY key
  LOOP
    RAISE NOTICE '  - %: %', r.key, r.value;
  END LOOP;
END $$;