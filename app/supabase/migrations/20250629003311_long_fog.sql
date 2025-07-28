/*
  # Complete Database Schema Setup

  1. New Tables
    - `special_messages` - Holiday and special notices
    - `school_hours` - Daily schedules and care times
    - `tuition_programs` - Available programs (Full Day, Half Day, etc.)
    - `tuition_rates` - Income-based pricing tiers
    - `tuition_settings` - Calculator configuration
    - `teacher_leaders` - Staff profiles and information

  2. Security
    - Enable RLS on all tables
    - Public read access for active records
    - Authenticated admin write access

  3. Sample Data
    - Default school hours (Monday-Friday)
    - Sample programs and tuition rates
    - Teacher profiles with local photos
*/

-- Create update timestamp function (safely)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create special_messages table
CREATE TABLE IF NOT EXISTS special_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text,
  start_date date DEFAULT CURRENT_DATE,
  end_date date DEFAULT (CURRENT_DATE + INTERVAL '7 days'),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'special_messages' 
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE special_messages ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Active special messages are viewable by everyone" ON special_messages;
DROP POLICY IF EXISTS "Special messages can be managed by authenticated users" ON special_messages;

CREATE POLICY "Active special messages are viewable by everyone"
  ON special_messages
  FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Special messages can be managed by authenticated users"
  ON special_messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Drop and recreate trigger to ensure it exists
DROP TRIGGER IF EXISTS update_special_messages_updated_at ON special_messages;
CREATE TRIGGER update_special_messages_updated_at
  BEFORE UPDATE ON special_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create school_hours table
CREATE TABLE IF NOT EXISTS school_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week text NOT NULL,
  start_time numeric DEFAULT 8.5,
  end_time numeric DEFAULT 15,
  before_care_offset numeric DEFAULT 1,
  after_care_offset numeric DEFAULT 2.5,
  closed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  aftercare_available boolean DEFAULT true
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'school_hours_day_of_week_key'
  ) THEN
    ALTER TABLE school_hours ADD CONSTRAINT school_hours_day_of_week_key UNIQUE (day_of_week);
  END IF;
END $$;

-- Add check constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'school_hours_day_of_week_check'
  ) THEN
    ALTER TABLE school_hours ADD CONSTRAINT school_hours_day_of_week_check 
      CHECK (day_of_week = ANY (ARRAY['Monday'::text, 'Tuesday'::text, 'Wednesday'::text, 'Thursday'::text, 'Friday'::text, 'Saturday'::text, 'Sunday'::text]));
  END IF;
END $$;

-- Enable RLS and set policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'school_hours' 
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE school_hours ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "School hours are viewable by everyone" ON school_hours;
DROP POLICY IF EXISTS "School hours can be managed by authenticated users" ON school_hours;

CREATE POLICY "School hours are viewable by everyone"
  ON school_hours
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "School hours can be managed by authenticated users"
  ON school_hours
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_school_hours_updated_at ON school_hours;
CREATE TRIGGER update_school_hours_updated_at
  BEFORE UPDATE ON school_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create tuition_programs table
CREATE TABLE IF NOT EXISTS tuition_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  program_type text NOT NULL,
  days_per_week integer DEFAULT 5 NOT NULL,
  daily_hours numeric DEFAULT 6.5 NOT NULL,
  description text,
  active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint on name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tuition_programs_name_key'
  ) THEN
    ALTER TABLE tuition_programs ADD CONSTRAINT tuition_programs_name_key UNIQUE (name);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'tuition_programs' 
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE tuition_programs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "Tuition programs are viewable by everyone" ON tuition_programs;
DROP POLICY IF EXISTS "Tuition programs can be managed by authenticated users" ON tuition_programs;

CREATE POLICY "Tuition programs are viewable by everyone"
  ON tuition_programs
  FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Tuition programs can be managed by authenticated users"
  ON tuition_programs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_tuition_programs_updated_at ON tuition_programs;
CREATE TRIGGER update_tuition_programs_updated_at
  BEFORE UPDATE ON tuition_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create tuition_rates table
CREATE TABLE IF NOT EXISTS tuition_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_label text NOT NULL,
  program_id uuid,
  tuition_price numeric NOT NULL,
  is_constant_rate boolean DEFAULT false,
  income_threshold_family_2 numeric,
  income_threshold_family_3 numeric,
  income_threshold_family_4 numeric,
  income_threshold_family_5 numeric,
  income_threshold_family_6 numeric,
  income_threshold_family_7 numeric,
  income_threshold_family_8_plus numeric,
  income_threshold_type text,
  extended_care_available boolean DEFAULT true,
  extended_care_price numeric DEFAULT 0,
  school_year text DEFAULT '2025-2026' NOT NULL,
  active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tuition_rates_program_id_fkey'
  ) THEN
    ALTER TABLE tuition_rates ADD CONSTRAINT tuition_rates_program_id_fkey 
      FOREIGN KEY (program_id) REFERENCES tuition_programs(id);
  END IF;
END $$;

-- Add check constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tuition_rates_income_threshold_type_check'
  ) THEN
    ALTER TABLE tuition_rates ADD CONSTRAINT tuition_rates_income_threshold_type_check 
      CHECK (income_threshold_type = ANY (ARRAY['Greater Than or Equal To'::text, 'Less Than'::text]));
  END IF;
END $$;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tuition_rates_rate_label_program_id_school_year_key'
  ) THEN
    ALTER TABLE tuition_rates ADD CONSTRAINT tuition_rates_rate_label_program_id_school_year_key 
      UNIQUE (rate_label, program_id, school_year);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'tuition_rates' 
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE tuition_rates ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "Tuition rates are viewable by everyone" ON tuition_rates;
DROP POLICY IF EXISTS "Tuition rates can be managed by authenticated users" ON tuition_rates;

CREATE POLICY "Tuition rates are viewable by everyone"
  ON tuition_rates
  FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Tuition rates can be managed by authenticated users"
  ON tuition_rates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_tuition_rates_updated_at ON tuition_rates;
CREATE TRIGGER update_tuition_rates_updated_at
  BEFORE UPDATE ON tuition_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create tuition_settings table
CREATE TABLE IF NOT EXISTS tuition_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tuition_settings_setting_key_key'
  ) THEN
    ALTER TABLE tuition_settings ADD CONSTRAINT tuition_settings_setting_key_key UNIQUE (setting_key);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'tuition_settings' 
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE tuition_settings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "Tuition settings are viewable by everyone" ON tuition_settings;
DROP POLICY IF EXISTS "Tuition settings can be managed by authenticated users" ON tuition_settings;

CREATE POLICY "Tuition settings are viewable by everyone"
  ON tuition_settings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Tuition settings can be managed by authenticated users"
  ON tuition_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_tuition_settings_updated_at ON tuition_settings;
CREATE TRIGGER update_tuition_settings_updated_at
  BEFORE UPDATE ON tuition_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create teacher_leaders table
CREATE TABLE IF NOT EXISTS teacher_leaders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  profile_photo_url text,
  description text,
  email text,
  pronouns text,
  active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  title text
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'teacher_leaders_slug_key'
  ) THEN
    ALTER TABLE teacher_leaders ADD CONSTRAINT teacher_leaders_slug_key UNIQUE (slug);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'teacher_leaders' 
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE teacher_leaders ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "Active teachers are viewable by everyone" ON teacher_leaders;
DROP POLICY IF EXISTS "Teachers can be managed by authenticated users" ON teacher_leaders;

CREATE POLICY "Active teachers are viewable by everyone"
  ON teacher_leaders
  FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Teachers can be managed by authenticated users"
  ON teacher_leaders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_teacher_leaders_updated_at ON teacher_leaders;
CREATE TRIGGER update_teacher_leaders_updated_at
  BEFORE UPDATE ON teacher_leaders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default school hours (Monday-Friday with proper aftercare settings)
INSERT INTO school_hours (day_of_week, start_time, end_time, before_care_offset, after_care_offset, aftercare_available, closed) VALUES
  ('Monday', 8.5, 15, 1, 2.5, true, false),
  ('Tuesday', 8.5, 15, 1, 2.5, true, false),
  ('Wednesday', 8.5, 15, 1, 2.5, true, false),
  ('Thursday', 8.5, 15, 1, 2.5, true, false),
  ('Friday', 8.5, 15, 1, 0, false, false), -- No aftercare on Friday
  ('Saturday', 0, 0, 0, 0, false, true),
  ('Sunday', 0, 0, 0, 0, false, true)
ON CONFLICT (day_of_week) DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  before_care_offset = EXCLUDED.before_care_offset,
  after_care_offset = EXCLUDED.after_care_offset,
  aftercare_available = EXCLUDED.aftercare_available,
  closed = EXCLUDED.closed,
  updated_at = now();

-- Insert sample tuition programs (now that we have unique constraint on name)
INSERT INTO tuition_programs (name, program_type, days_per_week, daily_hours, description, display_order) VALUES
  ('Full Day Program', 'Full Day', 5, 6.5, 'Our comprehensive full-day Montessori program for children ages 3-6', 1),
  ('Half Day Program', 'Half Day', 5, 3.5, 'Morning half-day program focusing on core Montessori activities', 2),
  ('Extended Day Program', 'Full Day', 5, 8, 'Full day program with extended care hours', 3),
  ('Part Time Program', 'Half Day', 3, 3.5, 'Flexible part-time option for younger children', 4)
ON CONFLICT (name) DO UPDATE SET
  program_type = EXCLUDED.program_type,
  days_per_week = EXCLUDED.days_per_week,
  daily_hours = EXCLUDED.daily_hours,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- Insert tuition rates for all programs
DO $$
DECLARE
  full_day_id uuid;
  half_day_id uuid;
  extended_day_id uuid;
  part_time_id uuid;
BEGIN
  SELECT id INTO full_day_id FROM tuition_programs WHERE name = 'Full Day Program';
  SELECT id INTO half_day_id FROM tuition_programs WHERE name = 'Half Day Program';
  SELECT id INTO extended_day_id FROM tuition_programs WHERE name = 'Extended Day Program';
  SELECT id INTO part_time_id FROM tuition_programs WHERE name = 'Part Time Program';

  -- Insert sample tuition rates for Full Day Program
  INSERT INTO tuition_rates (
    rate_label, program_id, tuition_price, income_threshold_family_2, income_threshold_family_3, 
    income_threshold_family_4, income_threshold_family_5, income_threshold_family_6, 
    income_threshold_family_7, income_threshold_family_8_plus, income_threshold_type, 
    extended_care_available, extended_care_price, display_order
  ) VALUES
    ('Tuition A', full_day_id, 12500, 85000, 95000, 105000, 115000, 125000, 135000, 145000, 'Greater Than or Equal To', true, 2500, 1),
    ('Tuition B', full_day_id, 11000, 65000, 75000, 85000, 95000, 105000, 115000, 125000, 'Greater Than or Equal To', true, 2200, 2),
    ('Tuition C', full_day_id, 9500, 45000, 55000, 65000, 75000, 85000, 95000, 105000, 'Greater Than or Equal To', true, 1900, 3),
    ('Tuition D', full_day_id, 8000, null, null, 45000, 55000, 65000, 75000, 85000, 'Less Than', true, 1600, 4)
  ON CONFLICT (rate_label, program_id, school_year) DO UPDATE SET
    tuition_price = EXCLUDED.tuition_price,
    income_threshold_family_2 = EXCLUDED.income_threshold_family_2,
    income_threshold_family_3 = EXCLUDED.income_threshold_family_3,
    income_threshold_family_4 = EXCLUDED.income_threshold_family_4,
    income_threshold_family_5 = EXCLUDED.income_threshold_family_5,
    income_threshold_family_6 = EXCLUDED.income_threshold_family_6,
    income_threshold_family_7 = EXCLUDED.income_threshold_family_7,
    income_threshold_family_8_plus = EXCLUDED.income_threshold_family_8_plus,
    income_threshold_type = EXCLUDED.income_threshold_type,
    extended_care_available = EXCLUDED.extended_care_available,
    extended_care_price = EXCLUDED.extended_care_price,
    display_order = EXCLUDED.display_order,
    updated_at = now();

  -- Insert sample tuition rates for Half Day Program
  INSERT INTO tuition_rates (
    rate_label, program_id, tuition_price, income_threshold_family_2, income_threshold_family_3, 
    income_threshold_family_4, income_threshold_family_5, income_threshold_family_6, 
    income_threshold_family_7, income_threshold_family_8_plus, income_threshold_type, 
    extended_care_available, extended_care_price, display_order
  ) VALUES
    ('Tuition A', half_day_id, 7500, 85000, 95000, 105000, 115000, 125000, 135000, 145000, 'Greater Than or Equal To', false, 0, 1),
    ('Tuition B', half_day_id, 6500, 65000, 75000, 85000, 95000, 105000, 115000, 125000, 'Greater Than or Equal To', false, 0, 2),
    ('Tuition C', half_day_id, 5500, 45000, 55000, 65000, 75000, 85000, 95000, 105000, 'Greater Than or Equal To', false, 0, 3),
    ('Tuition D', half_day_id, 4500, null, null, 45000, 55000, 65000, 75000, 85000, 'Less Than', false, 0, 4)
  ON CONFLICT (rate_label, program_id, school_year) DO UPDATE SET
    tuition_price = EXCLUDED.tuition_price,
    income_threshold_family_2 = EXCLUDED.income_threshold_family_2,
    income_threshold_family_3 = EXCLUDED.income_threshold_family_3,
    income_threshold_family_4 = EXCLUDED.income_threshold_family_4,
    income_threshold_family_5 = EXCLUDED.income_threshold_family_5,
    income_threshold_family_6 = EXCLUDED.income_threshold_family_6,
    income_threshold_family_7 = EXCLUDED.income_threshold_family_7,
    income_threshold_family_8_plus = EXCLUDED.income_threshold_family_8_plus,
    income_threshold_type = EXCLUDED.income_threshold_type,
    extended_care_available = EXCLUDED.extended_care_available,
    extended_care_price = EXCLUDED.extended_care_price,
    display_order = EXCLUDED.display_order,
    updated_at = now();

  -- Insert sample tuition rates for Extended Day Program
  INSERT INTO tuition_rates (
    rate_label, program_id, tuition_price, income_threshold_family_2, income_threshold_family_3, 
    income_threshold_family_4, income_threshold_family_5, income_threshold_family_6, 
    income_threshold_family_7, income_threshold_family_8_plus, income_threshold_type, 
    extended_care_available, extended_care_price, display_order
  ) VALUES
    ('Tuition A', extended_day_id, 15000, 85000, 95000, 105000, 115000, 125000, 135000, 145000, 'Greater Than or Equal To', false, 0, 1),
    ('Tuition B', extended_day_id, 13500, 65000, 75000, 85000, 95000, 105000, 115000, 125000, 'Greater Than or Equal To', false, 0, 2),
    ('Tuition C', extended_day_id, 12000, 45000, 55000, 65000, 75000, 85000, 95000, 105000, 'Greater Than or Equal To', false, 0, 3),
    ('Tuition D', extended_day_id, 10500, null, null, 45000, 55000, 65000, 75000, 85000, 'Less Than', false, 0, 4)
  ON CONFLICT (rate_label, program_id, school_year) DO UPDATE SET
    tuition_price = EXCLUDED.tuition_price,
    income_threshold_family_2 = EXCLUDED.income_threshold_family_2,
    income_threshold_family_3 = EXCLUDED.income_threshold_family_3,
    income_threshold_family_4 = EXCLUDED.income_threshold_family_4,
    income_threshold_family_5 = EXCLUDED.income_threshold_family_5,
    income_threshold_family_6 = EXCLUDED.income_threshold_family_6,
    income_threshold_family_7 = EXCLUDED.income_threshold_family_7,
    income_threshold_family_8_plus = EXCLUDED.income_threshold_family_8_plus,
    income_threshold_type = EXCLUDED.income_threshold_type,
    extended_care_available = EXCLUDED.extended_care_available,
    extended_care_price = EXCLUDED.extended_care_price,
    display_order = EXCLUDED.display_order,
    updated_at = now();

  -- Insert sample tuition rates for Part Time Program
  INSERT INTO tuition_rates (
    rate_label, program_id, tuition_price, income_threshold_family_2, income_threshold_family_3, 
    income_threshold_family_4, income_threshold_family_5, income_threshold_family_6, 
    income_threshold_family_7, income_threshold_family_8_plus, income_threshold_type, 
    extended_care_available, extended_care_price, display_order
  ) VALUES
    ('Tuition A', part_time_id, 5500, 85000, 95000, 105000, 115000, 125000, 135000, 145000, 'Greater Than or Equal To', false, 0, 1),
    ('Tuition B', part_time_id, 4800, 65000, 75000, 85000, 95000, 105000, 115000, 125000, 'Greater Than or Equal To', false, 0, 2),
    ('Tuition C', part_time_id, 4100, 45000, 55000, 65000, 75000, 85000, 95000, 105000, 'Greater Than or Equal To', false, 0, 3),
    ('Tuition D', part_time_id, 3400, null, null, 45000, 55000, 65000, 75000, 85000, 'Less Than', false, 0, 4)
  ON CONFLICT (rate_label, program_id, school_year) DO UPDATE SET
    tuition_price = EXCLUDED.tuition_price,
    income_threshold_family_2 = EXCLUDED.income_threshold_family_2,
    income_threshold_family_3 = EXCLUDED.income_threshold_family_3,
    income_threshold_family_4 = EXCLUDED.income_threshold_family_4,
    income_threshold_family_5 = EXCLUDED.income_threshold_family_5,
    income_threshold_family_6 = EXCLUDED.income_threshold_family_6,
    income_threshold_family_7 = EXCLUDED.income_threshold_family_7,
    income_threshold_family_8_plus = EXCLUDED.income_threshold_family_8_plus,
    income_threshold_type = EXCLUDED.income_threshold_type,
    extended_care_available = EXCLUDED.extended_care_available,
    extended_care_price = EXCLUDED.extended_care_price,
    display_order = EXCLUDED.display_order,
    updated_at = now();
END $$;

-- Insert default settings
INSERT INTO tuition_settings (setting_key, setting_value, description) VALUES
  ('current_school_year', '"2025-2026"', 'The current school year for tuition calculations'),
  ('upfront_discount_rate', '0.05', 'Discount rate for paying full year upfront (5%)'),
  ('sibling_discount_rate', '0.10', 'Discount rate per additional sibling (10%)'),
  ('annual_increase_rate', '0.04', 'Annual tuition increase rate (4%)')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();

-- Insert sample teacher leaders (now that we have unique constraint on slug)
INSERT INTO teacher_leaders (name, slug, title, description, profile_photo_url, active, display_order) VALUES
  ('Sarah Johnson', 'sarah-johnson', 'Lead Teacher', 'Sarah brings over 15 years of Montessori education experience to our community. She holds her AMI certification and has a passion for fostering independence and creativity in young learners.', '/teacher-sarah-johnson.jpg', true, 1),
  ('Michael Chen', 'michael-chen', 'Assistant Teacher', 'Michael joined our team with a background in early childhood development and a deep commitment to the Montessori method. He specializes in practical life activities and outdoor education.', '/teacher-michael-chen.jpg', true, 2),
  ('Emily Rodriguez', 'emily-rodriguez', 'Head of School', 'Emily leads our school with vision and dedication to Montessori principles. She has a Masters in Education and over 20 years of experience in progressive education.', '/teacher-emily-rodriguez.jpg', true, 0)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  profile_photo_url = EXCLUDED.profile_photo_url,
  active = EXCLUDED.active,
  display_order = EXCLUDED.display_order,
  updated_at = now();