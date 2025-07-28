/*
  # Tuition Calculator Database Schema

  1. New Tables
    - `tuition_rates`
      - Core tuition rate information with income thresholds
    - `tuition_programs` 
      - Program types (Full Day, Half Day, etc.)
    - `extended_care_rates`
      - Extended care pricing by tuition level
    - `tuition_settings`
      - Global settings like school year, discount rates

  2. Security
    - Public read access for calculator
    - Authenticated admin access for management

  3. Sample Data
    - Default tuition rates and programs
    - Extended care rates by tier
*/

-- Create tuition_programs table
CREATE TABLE IF NOT EXISTS tuition_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  program_type text NOT NULL, -- 'Full Day', 'Half Day'
  days_per_week integer NOT NULL DEFAULT 5,
  daily_hours numeric NOT NULL DEFAULT 6.5,
  description text,
  active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tuition_rates table
CREATE TABLE IF NOT EXISTS tuition_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_label text NOT NULL, -- 'Tuition A', 'Tuition B', etc.
  program_id uuid REFERENCES tuition_programs(id),
  tuition_price numeric NOT NULL,
  is_constant_rate boolean DEFAULT false,
  
  -- Income thresholds by family size
  income_threshold_family_2 numeric,
  income_threshold_family_3 numeric,
  income_threshold_family_4 numeric,
  income_threshold_family_5 numeric,
  income_threshold_family_6 numeric,
  income_threshold_family_7 numeric,
  income_threshold_family_8_plus numeric,
  
  -- Threshold comparison type
  income_threshold_type text CHECK (income_threshold_type IN ('Greater Than or Equal To', 'Less Than')),
  
  -- Extended care info
  extended_care_available boolean DEFAULT true,
  extended_care_price numeric DEFAULT 0,
  
  -- Metadata
  school_year text NOT NULL DEFAULT '2025-2026',
  active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(rate_label, program_id, school_year)
);

-- Create tuition_settings table
CREATE TABLE IF NOT EXISTS tuition_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tuition_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_settings ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Tuition programs are viewable by everyone"
  ON tuition_programs FOR SELECT TO public
  USING (active = true);

CREATE POLICY "Tuition rates are viewable by everyone"
  ON tuition_rates FOR SELECT TO public
  USING (active = true);

CREATE POLICY "Tuition settings are viewable by everyone"
  ON tuition_settings FOR SELECT TO public
  USING (true);

-- Admin management policies
CREATE POLICY "Tuition programs can be managed by authenticated users"
  ON tuition_programs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Tuition rates can be managed by authenticated users"
  ON tuition_rates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Tuition settings can be managed by authenticated users"
  ON tuition_settings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Create updated_at triggers
CREATE TRIGGER update_tuition_programs_updated_at
  BEFORE UPDATE ON tuition_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tuition_rates_updated_at
  BEFORE UPDATE ON tuition_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tuition_settings_updated_at
  BEFORE UPDATE ON tuition_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default programs
INSERT INTO tuition_programs (name, program_type, days_per_week, daily_hours, description, display_order) VALUES
  ('Full Day 5 Days', 'Full Day', 5, 6.5, 'Monday through Friday, 8:30 AM - 3:00 PM', 1),
  ('Half Day 5 Days', 'Half Day', 5, 3.5, 'Monday through Friday, 8:30 AM - 12:00 PM', 2),
  ('Full Day 3 Days', 'Full Day', 3, 6.5, 'Three days per week, 8:30 AM - 3:00 PM', 3),
  ('Half Day 3 Days', 'Half Day', 3, 3.5, 'Three days per week, 8:30 AM - 12:00 PM', 4);

-- Insert default tuition rates based on the calculator data
DO $$
DECLARE
  full_day_5_id uuid;
  half_day_5_id uuid;
BEGIN
  -- Get program IDs
  SELECT id INTO full_day_5_id FROM tuition_programs WHERE name = 'Full Day 5 Days';
  SELECT id INTO half_day_5_id FROM tuition_programs WHERE name = 'Half Day 5 Days';
  
  -- Insert Tuition A rates
  INSERT INTO tuition_rates (
    rate_label, program_id, tuition_price, is_constant_rate,
    income_threshold_family_2, income_threshold_family_3, income_threshold_family_4,
    income_threshold_family_5, income_threshold_family_6, income_threshold_family_7,
    income_threshold_family_8_plus, income_threshold_type,
    extended_care_available, extended_care_price, display_order
  ) VALUES
  ('Tuition A', full_day_5_id, 20500, false, 150000, 175000, 200000, 225000, 250000, 275000, 300000, 'Greater Than or Equal To', true, 4000, 1),
  ('Tuition A', half_day_5_id, 15500, false, 150000, 175000, 200000, 225000, 250000, 275000, 300000, 'Greater Than or Equal To', false, 0, 1);
  
  -- Insert Tuition B rates  
  INSERT INTO tuition_rates (
    rate_label, program_id, tuition_price, is_constant_rate,
    income_threshold_family_2, income_threshold_family_3, income_threshold_family_4,
    income_threshold_family_5, income_threshold_family_6, income_threshold_family_7,
    income_threshold_family_8_plus, income_threshold_type,
    extended_care_available, extended_care_price, display_order
  ) VALUES
  ('Tuition B', full_day_5_id, 18500, false, 100000, 125000, 150000, 175000, 200000, 225000, 250000, 'Greater Than or Equal To', true, 3800, 2),
  ('Tuition B', half_day_5_id, 13500, false, 100000, 125000, 150000, 175000, 200000, 225000, 250000, 'Greater Than or Equal To', false, 0, 2);
  
  -- Insert Tuition C rates
  INSERT INTO tuition_rates (
    rate_label, program_id, tuition_price, is_constant_rate,
    income_threshold_family_2, income_threshold_family_3, income_threshold_family_4,
    income_threshold_family_5, income_threshold_family_6, income_threshold_family_7,
    income_threshold_family_8_plus, income_threshold_type,
    extended_care_available, extended_care_price, display_order
  ) VALUES
  ('Tuition C', full_day_5_id, 16500, false, 75000, 95000, 115000, 135000, 155000, 175000, 195000, 'Greater Than or Equal To', true, 3400, 3),
  ('Tuition C', half_day_5_id, 11500, false, 75000, 95000, 115000, 135000, 155000, 175000, 195000, 'Greater Than or Equal To', false, 0, 3);
  
  -- Insert Tuition D rates (lowest income, highest assistance)
  INSERT INTO tuition_rates (
    rate_label, program_id, tuition_price, is_constant_rate,
    income_threshold_family_2, income_threshold_family_3, income_threshold_family_4,
    income_threshold_family_5, income_threshold_family_6, income_threshold_family_7,
    income_threshold_family_8_plus, income_threshold_type,
    extended_care_available, extended_care_price, display_order
  ) VALUES
  ('Tuition D', full_day_5_id, 12500, false, 75000, 95000, 115000, 135000, 155000, 175000, 195000, 'Less Than', true, 0, 4),
  ('Tuition D', half_day_5_id, 8500, false, 75000, 95000, 115000, 135000, 155000, 175000, 195000, 'Less Than', false, 0, 4);
END $$;

-- Insert default settings
INSERT INTO tuition_settings (setting_key, setting_value, description) VALUES
  ('current_school_year', '"2025-2026"', 'Current school year for tuition calculator'),
  ('upfront_discount_rate', '0.05', 'Discount rate for paying full year upfront (5%)'),
  ('sibling_discount_rate', '0.10', 'Discount rate for each additional sibling (10%)'),
  ('annual_increase_rate', '0.04', 'Expected annual tuition increase rate (4%)');