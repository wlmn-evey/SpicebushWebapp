/*
  # Add aftercare_available Field

  This migration adds a new boolean field `aftercare_available` to control 
  aftercare scheduling more explicitly. When false, no aftercare is shown 
  regardless of offset settings.

  ## Changes
  - Add `aftercare_available` boolean field with default true
  - Set Friday to false (no aftercare)
  - Keep existing offset logic but make it conditional
*/

-- Add the new aftercare_available field
ALTER TABLE school_hours 
ADD COLUMN IF NOT EXISTS aftercare_available boolean DEFAULT true;

-- Set Friday to have no aftercare available
UPDATE school_hours 
SET aftercare_available = false, updated_at = now()
WHERE day_of_week = 'Friday';

-- Set all other weekdays to have aftercare available
UPDATE school_hours 
SET aftercare_available = true, updated_at = now()
WHERE day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday');

-- Weekend days remain closed so aftercare_available doesn't matter
UPDATE school_hours 
SET aftercare_available = false, updated_at = now()
WHERE day_of_week IN ('Saturday', 'Sunday');

-- Verify the changes
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT day_of_week, aftercare_available, after_care_offset 
               FROM school_hours 
               ORDER BY CASE day_of_week 
                         WHEN 'Monday' THEN 1
                         WHEN 'Tuesday' THEN 2  
                         WHEN 'Wednesday' THEN 3
                         WHEN 'Thursday' THEN 4
                         WHEN 'Friday' THEN 5
                         WHEN 'Saturday' THEN 6
                         WHEN 'Sunday' THEN 7
                       END
    LOOP
        RAISE NOTICE '% - Aftercare Available: %, Offset: %', rec.day_of_week, rec.aftercare_available, rec.after_care_offset;
    END LOOP;
END $$;