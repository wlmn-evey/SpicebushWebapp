/*
  # Fix Friday After Care Hours

  This migration specifically updates Friday's after_care_offset to 0 to ensure 
  Friday does not show extended care hours.

  ## Changes
  - Updates Friday record to set after_care_offset = 0
  - Ensures the visual display correctly shows no after care on Friday
*/

-- Update Friday's after care offset to 0
UPDATE school_hours 
SET after_care_offset = 0, updated_at = now()
WHERE day_of_week = 'Friday';

-- Verify the update worked
DO $$
DECLARE
    friday_after_care numeric;
BEGIN
    SELECT after_care_offset INTO friday_after_care 
    FROM school_hours 
    WHERE day_of_week = 'Friday';
    
    IF friday_after_care = 0 THEN
        RAISE NOTICE 'SUCCESS: Friday after_care_offset is now 0';
    ELSE
        RAISE NOTICE 'WARNING: Friday after_care_offset is still %', friday_after_care;
    END IF;
END $$;