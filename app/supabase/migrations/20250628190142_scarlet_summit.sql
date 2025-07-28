/*
  # Import Correct Tuition Data from CSV

  This migration replaces the sample data with the actual tuition rates from the Spicebush CSV.
  
  ## Changes
  1. Clear existing sample data
  2. Insert correct programs (3-day and 5-day options)
  3. Insert actual tuition rates with correct income thresholds
  4. Update extended care pricing to match actual rates
*/

-- Clear existing data
DELETE FROM tuition_rates;
DELETE FROM tuition_programs;

-- Insert correct programs
INSERT INTO tuition_programs (name, program_type, days_per_week, daily_hours, description, display_order) VALUES
  ('Full Day - 5 Days', 'Full Day', 5, 6.5, 'Monday through Friday, 8:30 AM - 3:00 PM', 1),
  ('Full Day - 3 Days (TWR)', 'Full Day', 3, 6.5, 'Tuesday, Wednesday, Thursday, 8:30 AM - 3:00 PM', 2),
  ('Half Day - 5 Days', 'Half Day', 5, 3.5, 'Monday through Friday, 8:30 AM - 12:00 PM', 3),
  ('Half Day - 3 Days (TWR)', 'Half Day', 3, 3.5, 'Tuesday, Wednesday, Thursday, 8:30 AM - 12:00 PM', 4);

-- Insert actual tuition rates from CSV data
DO $$
DECLARE
  full_day_5_id uuid;
  full_day_3_id uuid;
  half_day_5_id uuid;
  half_day_3_id uuid;
BEGIN
  -- Get program IDs
  SELECT id INTO full_day_5_id FROM tuition_programs WHERE name = 'Full Day - 5 Days';
  SELECT id INTO full_day_3_id FROM tuition_programs WHERE name = 'Full Day - 3 Days (TWR)';
  SELECT id INTO half_day_5_id FROM tuition_programs WHERE name = 'Half Day - 5 Days';
  SELECT id INTO half_day_3_id FROM tuition_programs WHERE name = 'Half Day - 3 Days (TWR)';
  
  -- Insert Half Day constant rates (no income thresholds)
  INSERT INTO tuition_rates (
    rate_label, program_id, tuition_price, is_constant_rate,
    extended_care_available, extended_care_price, display_order
  ) VALUES
  ('Half Day', half_day_5_id, 12000, true, false, 0, 1),
  ('Half Day', half_day_3_id, 10000, true, false, 0, 1);
  
  -- Insert Tuition A rates (highest income tier)
  INSERT INTO tuition_rates (
    rate_label, program_id, tuition_price, is_constant_rate,
    income_threshold_family_2, income_threshold_family_3, income_threshold_family_4,
    income_threshold_family_5, income_threshold_family_6, income_threshold_family_7,
    income_threshold_family_8_plus, income_threshold_type,
    extended_care_available, extended_care_price, display_order
  ) VALUES
  ('Tuition A', full_day_5_id, 18035, false, 84976, 110240, 128750, 150380, 172525, 195597, 216300, 'Greater Than or Equal To', true, 4000, 2),
  ('Tuition A', full_day_3_id, 10822, false, 84976, 110240, 128750, 150380, 172525, 195597, 216300, 'Greater Than or Equal To', true, 4000, 2);
  
  -- Insert Tuition B rates
  INSERT INTO tuition_rates (
    rate_label, program_id, tuition_price, is_constant_rate,
    income_threshold_family_2, income_threshold_family_3, income_threshold_family_4,
    income_threshold_family_5, income_threshold_family_6, income_threshold_family_7,
    income_threshold_family_8_plus, income_threshold_type,
    extended_care_available, extended_care_price, display_order
  ) VALUES
  ('Tuition B', full_day_5_id, 14348.75, false, 65405, 82400, 99498, 113000, 133900, 150380, 167890, 'Greater Than or Equal To', true, 3800, 3),
  ('Tuition B', full_day_3_id, 8609.5, false, 65405, 82400, 99498, 113000, 133900, 150380, 167890, 'Greater Than or Equal To', true, 3800, 3);
  
  -- Insert Tuition C rates
  INSERT INTO tuition_rates (
    rate_label, program_id, tuition_price, is_constant_rate,
    income_threshold_family_2, income_threshold_family_3, income_threshold_family_4,
    income_threshold_family_5, income_threshold_family_6, income_threshold_family_7,
    income_threshold_family_8_plus, income_threshold_type,
    extended_care_available, extended_care_price, display_order
  ) VALUES
  ('Tuition C', full_day_5_id, 11304, false, 34480, 43440, 52400, 61350, 70320, 79280, 88240, 'Greater Than or Equal To', true, 3400, 4),
  ('Tuition C', full_day_3_id, 6783, false, 34480, 43440, 52400, 61350, 70320, 79280, 88240, 'Greater Than or Equal To', true, 3400, 4);
  
  -- Insert Tuition D rates (lowest income, highest assistance)
  INSERT INTO tuition_rates (
    rate_label, program_id, tuition_price, is_constant_rate,
    income_threshold_family_2, income_threshold_family_3, income_threshold_family_4,
    income_threshold_family_5, income_threshold_family_6, income_threshold_family_7,
    income_threshold_family_8_plus, income_threshold_type,
    extended_care_available, extended_care_price, display_order
  ) VALUES
  ('Tuition D', full_day_5_id, 5397, false, 34480, 43440, 52400, 61350, 70320, 79280, 88240, 'Less Than', true, 0, 5),
  ('Tuition D', full_day_3_id, 3244, false, 34480, 43440, 52400, 61350, 70320, 79280, 88240, 'Less Than', true, 0, 5);
END $$;

-- Verify the data was inserted correctly
SELECT 
  tp.name as program_name,
  tr.rate_label,
  tr.tuition_price,
  tr.income_threshold_family_4,
  tr.income_threshold_type,
  tr.extended_care_price,
  tr.is_constant_rate
FROM tuition_rates tr
JOIN tuition_programs tp ON tr.program_id = tp.id
ORDER BY tr.display_order, tp.display_order;