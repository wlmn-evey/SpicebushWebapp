/*
  # School Hours Management System

  1. New Tables
    - `school_hours`
      - `id` (uuid, primary key)
      - `day_of_week` (text, unique) - Monday, Tuesday, etc.
      - `start_time` (numeric) - 24-hour format as decimal (e.g., 8.5 = 8:30 AM)
      - `end_time` (numeric) - 24-hour format as decimal
      - `before_care_offset` (numeric) - hours before regular start time
      - `after_care_offset` (numeric) - hours after regular end time  
      - `closed` (boolean) - whether school is closed this day
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `special_messages`
      - `id` (uuid, primary key)
      - `title` (text) - message title
      - `message` (text) - detailed message
      - `start_date` (date) - when message becomes active
      - `end_date` (date) - when message expires
      - `active` (boolean) - whether message is currently active
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Public read access for displaying hours
    - Authenticated admin access for management

  3. Sample Data
    - Default school hours for Monday-Friday
    - Weekend closure settings
*/

-- Create school_hours table
CREATE TABLE IF NOT EXISTS school_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week text UNIQUE NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time numeric DEFAULT 8.5,
  end_time numeric DEFAULT 15,
  before_care_offset numeric DEFAULT 1,
  after_care_offset numeric DEFAULT 2.5,
  closed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create special_messages table
CREATE TABLE IF NOT EXISTS special_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text,
  start_date date DEFAULT CURRENT_DATE,
  end_date date DEFAULT CURRENT_DATE + INTERVAL '7 days',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE school_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_messages ENABLE ROW LEVEL SECURITY;

-- Policies for school_hours
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

-- Policies for special_messages
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

-- Insert default school hours
INSERT INTO school_hours (day_of_week, start_time, end_time, before_care_offset, after_care_offset, closed) VALUES
  ('Monday', 8.5, 15, 1, 2.5, false),
  ('Tuesday', 8.5, 15, 1, 2.5, false),
  ('Wednesday', 8.5, 15, 1, 2.5, false),
  ('Thursday', 8.5, 15, 1, 2.5, false),
  ('Friday', 8.5, 15, 1, 0, false),
  ('Saturday', 0, 0, 0, 0, true),
  ('Sunday', 0, 0, 0, 0, true)
ON CONFLICT (day_of_week) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_school_hours_updated_at
    BEFORE UPDATE ON school_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_special_messages_updated_at
    BEFORE UPDATE ON special_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();