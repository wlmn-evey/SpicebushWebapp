-- Insert critical school data directly into Supabase
-- This bypasses authentication complexity and gets data loaded quickly

-- 1. Insert school info
INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'school-info',
  'general',
  'School Information',
  '{
    "name": "Spicebush Montessori School",
    "phone": "(484) 356-6728",
    "email": "info@spicebushmontessori.org",
    "address": {
      "street": "2300 Old West Chester Pike",
      "city": "Havertown",
      "state": "PA",
      "zip": "19083"
    },
    "agesServed": "3-6",
    "extendedCareUntil": "5:30 PM",
    "socialMedia": {
      "facebook": "https://www.facebook.com/spicebushmontessori",
      "instagram": "https://www.instagram.com/spicebushmontessori"
    }
  }'::jsonb,
  'published',
  'admin@spicebushmontessori.org'
) ON CONFLICT (type, slug) DO UPDATE SET
  data = EXCLUDED.data,
  updated_at = NOW();

-- 2. Insert school hours
INSERT INTO content (type, slug, title, data, status, author_email)
VALUES 
  ('hours', 'monday', 'Monday', '{"day": "Monday", "open_time": "8:00 AM", "close_time": "5:30 PM", "is_closed": false, "order": 1}'::jsonb, 'published', 'admin@spicebushmontessori.org'),
  ('hours', 'tuesday', 'Tuesday', '{"day": "Tuesday", "open_time": "8:00 AM", "close_time": "5:30 PM", "is_closed": false, "order": 2}'::jsonb, 'published', 'admin@spicebushmontessori.org'),
  ('hours', 'wednesday', 'Wednesday', '{"day": "Wednesday", "open_time": "8:00 AM", "close_time": "5:30 PM", "is_closed": false, "order": 3}'::jsonb, 'published', 'admin@spicebushmontessori.org'),
  ('hours', 'thursday', 'Thursday', '{"day": "Thursday", "open_time": "8:00 AM", "close_time": "5:30 PM", "is_closed": false, "order": 4}'::jsonb, 'published', 'admin@spicebushmontessori.org'),
  ('hours', 'friday', 'Friday', '{"day": "Friday", "open_time": "8:00 AM", "close_time": "3:00 PM", "is_closed": false, "order": 5, "note": "No aftercare on Fridays"}'::jsonb, 'published', 'admin@spicebushmontessori.org'),
  ('hours', 'saturday', 'Saturday', '{"day": "Saturday", "is_closed": true, "order": 6}'::jsonb, 'published', 'admin@spicebushmontessori.org'),
  ('hours', 'sunday', 'Sunday', '{"day": "Sunday", "is_closed": true, "order": 7}'::jsonb, 'published', 'admin@spicebushmontessori.org')
ON CONFLICT (type, slug) DO UPDATE SET
  data = EXCLUDED.data,
  updated_at = NOW();

-- 3. Insert basic program info
INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'tuition',
  'full-day-program',
  'Full Day Program',
  '{
    "name": "Full Day Program",
    "type": "program",
    "description": "Our full-day Montessori program runs from 8:30 AM to 3:00 PM, with optional before and after care available.",
    "schedule": "Monday - Friday, 8:30 AM - 3:00 PM",
    "ages": "3-6 years",
    "features": [
      "Authentic Montessori curriculum",
      "Mixed-age classrooms",
      "Individualized learning",
      "Outdoor education"
    ]
  }'::jsonb,
  'published',
  'admin@spicebushmontessori.org'
) ON CONFLICT (type, slug) DO UPDATE SET
  data = EXCLUDED.data,
  updated_at = NOW();

-- 4. Disable coming soon mode
INSERT INTO settings (key, value)
VALUES ('coming_soon_enabled', 'false')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();