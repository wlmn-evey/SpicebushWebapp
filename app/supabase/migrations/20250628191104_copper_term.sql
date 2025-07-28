/*
  # Populate Tuition Programs and Rates

  1. Clear existing data
  2. Insert tuition programs (Half Day and Full Day)
  3. Insert tuition rates with income thresholds
  4. Update display order for proper sorting

  ## Programs:
  - Half Day - 3 Days (TWR)
  - Half Day - 5 Days  
  - Full Day - 3 Days (TWR)
  - Full Day - 5 Days

  ## Rate Tiers:
  - Half Day rates (constant pricing)
  - Tuition A, B, C, D (income-based pricing)
*/

-- Clear existing data
DELETE FROM tuition_rates;
DELETE FROM tuition_programs;

-- Insert tuition programs
INSERT INTO tuition_programs (name, program_type, days_per_week, daily_hours, description, active, display_order) VALUES
  ('Half Day - 3 Days (TWR)', 'Half Day', 3, 3.5, 'Half day program meeting Tuesday, Wednesday, and Thursday', true, 1),
  ('Half Day - 5 Days', 'Half Day', 5, 3.5, 'Half day program meeting Monday through Friday', true, 2),
  ('Full Day - 3 Days (TWR)', 'Full Day', 3, 6.5, 'Full day program meeting Tuesday, Wednesday, and Thursday', true, 3),
  ('Full Day - 5 Days', 'Full Day', 5, 6.5, 'Full day program meeting Monday through Friday', true, 4);

-- Insert Half Day rates (constant pricing)
INSERT INTO tuition_rates (
  rate_label, program_id, tuition_price, is_constant_rate, extended_care_available, 
  extended_care_price, school_year, active, display_order
) VALUES
  (
    'Half Day', 
    (SELECT id FROM tuition_programs WHERE name = 'Half Day - 3 Days (TWR)'),
    10000, 
    true, 
    false, 
    0, 
    '2025-2026', 
    true, 
    1
  ),
  (
    'Half Day', 
    (SELECT id FROM tuition_programs WHERE name = 'Half Day - 5 Days'),
    12000, 
    true, 
    false, 
    0, 
    '2025-2026', 
    true, 
    2
  );

-- Insert Full Day Tuition A rates
INSERT INTO tuition_rates (
  rate_label, program_id, tuition_price, is_constant_rate,
  income_threshold_family_2, income_threshold_family_3, income_threshold_family_4,
  income_threshold_family_5, income_threshold_family_6, income_threshold_family_7,
  income_threshold_family_8_plus, income_threshold_type,
  extended_care_available, extended_care_price, school_year, active, display_order
) VALUES
  (
    'Tuition A',
    (SELECT id FROM tuition_programs WHERE name = 'Full Day - 3 Days (TWR)'),
    10822,
    false,
    84976, 110240, 128750, 150380, 172525, 195597, 216300,
    'Greater Than or Equal To',
    true,
    4000,
    '2025-2026',
    true,
    3
  ),
  (
    'Tuition A',
    (SELECT id FROM tuition_programs WHERE name = 'Full Day - 5 Days'),
    18035,
    false,
    84976, 110240, 128750, 150380, 172525, 195597, 216300,
    'Greater Than or Equal To',
    true,
    4000,
    '2025-2026',
    true,
    4
  );

-- Insert Full Day Tuition B rates
INSERT INTO tuition_rates (
  rate_label, program_id, tuition_price, is_constant_rate,
  income_threshold_family_2, income_threshold_family_3, income_threshold_family_4,
  income_threshold_family_5, income_threshold_family_6, income_threshold_family_7,
  income_threshold_family_8_plus, income_threshold_type,
  extended_care_available, extended_care_price, school_year, active, display_order
) VALUES
  (
    'Tuition B',
    (SELECT id FROM tuition_programs WHERE name = 'Full Day - 3 Days (TWR)'),
    8609.5,
    false,
    65405, 82400, 99498, 113000, 133900, 150380, 167890,
    'Greater Than or Equal To',
    true,
    3800,
    '2025-2026',
    true,
    5
  ),
  (
    'Tuition B',
    (SELECT id FROM tuition_programs WHERE name = 'Full Day - 5 Days'),
    14348.75,
    false,
    65405, 82400, 99498, 113000, 133900, 150380, 167890,
    'Greater Than or Equal To',
    true,
    3800,
    '2025-2026',
    true,
    6
  );

-- Insert Full Day Tuition C rates
INSERT INTO tuition_rates (
  rate_label, program_id, tuition_price, is_constant_rate,
  income_threshold_family_2, income_threshold_family_3, income_threshold_family_4,
  income_threshold_family_5, income_threshold_family_6, income_threshold_family_7,
  income_threshold_family_8_plus, income_threshold_type,
  extended_care_available, extended_care_price, school_year, active, display_order
) VALUES
  (
    'Tuition C',
    (SELECT id FROM tuition_programs WHERE name = 'Full Day - 3 Days (TWR)'),
    6783,
    false,
    34480, 43440, 52400, 61350, 70320, 79280, 88240,
    'Greater Than or Equal To',
    true,
    3400,
    '2025-2026',
    true,
    7
  ),
  (
    'Tuition C',
    (SELECT id FROM tuition_programs WHERE name = 'Full Day - 5 Days'),
    11304,
    false,
    34480, 43440, 52400, 61350, 70320, 79280, 88240,
    'Greater Than or Equal To',
    true,
    3400,
    '2025-2026',
    true,
    8
  );

-- Insert Full Day Tuition D rates
INSERT INTO tuition_rates (
  rate_label, program_id, tuition_price, is_constant_rate,
  income_threshold_family_2, income_threshold_family_3, income_threshold_family_4,
  income_threshold_family_5, income_threshold_family_6, income_threshold_family_7,
  income_threshold_family_8_plus, income_threshold_type,
  extended_care_available, extended_care_price, school_year, active, display_order
) VALUES
  (
    'Tuition D',
    (SELECT id FROM tuition_programs WHERE name = 'Full Day - 3 Days (TWR)'),
    3244,
    false,
    34480, 43440, 52400, 61350, 70320, 79280, 88240,
    'Less Than',
    true,
    0,
    '2025-2026',
    true,
    9
  ),
  (
    'Tuition D',
    (SELECT id FROM tuition_programs WHERE name = 'Full Day - 5 Days'),
    5397,
    false,
    34480, 43440, 52400, 61350, 70320, 79280, 88240,
    'Less Than',
    true,
    0,
    '2025-2026',
    true,
    10
  );