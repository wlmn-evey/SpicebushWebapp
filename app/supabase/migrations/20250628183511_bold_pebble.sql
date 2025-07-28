-- Critical Migration: Add and Configure aftercare_available field
-- Run this in your Supabase SQL Editor

-- Add the new aftercare_available field if it doesn't exist
ALTER TABLE school_hours 
ADD COLUMN IF NOT EXISTS aftercare_available boolean DEFAULT true;

-- Update all days with proper aftercare availability
UPDATE school_hours 
SET 
  aftercare_available = CASE 
    WHEN day_of_week = 'Friday' THEN false
    WHEN day_of_week IN ('Saturday', 'Sunday') THEN false
    ELSE true
  END,
  updated_at = now();

-- Specifically ensure Friday has no aftercare and proper settings
UPDATE school_hours 
SET 
  aftercare_available = false,
  after_care_offset = 0,
  updated_at = now()
WHERE day_of_week = 'Friday';

-- Verify the changes
SELECT 
  day_of_week,
  start_time,
  end_time,
  before_care_offset,
  after_care_offset,
  aftercare_available,
  closed
FROM school_hours 
ORDER BY CASE day_of_week 
  WHEN 'Monday' THEN 1
  WHEN 'Tuesday' THEN 2  
  WHEN 'Wednesday' THEN 3
  WHEN 'Thursday' THEN 4
  WHEN 'Friday' THEN 5
  WHEN 'Saturday' THEN 6
  WHEN 'Sunday' THEN 7
END;

-- Expected results:
-- Friday should show: aftercare_available = false, after_care_offset = 0
-- Monday-Thursday should show: aftercare_available = true, after_care_offset = 2.5
-- Weekend days should show: closed = true, aftercare_available = false