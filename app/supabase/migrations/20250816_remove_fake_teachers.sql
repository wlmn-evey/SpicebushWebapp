-- Remove fake teachers from database
-- Only keep: Kirsti Forrest, Leah Walker, Kira Messinger

BEGIN;

-- Delete fake teachers by slug (safest method)
DELETE FROM teachers 
WHERE slug IN (
  'sarah-johnson',
  'michael-chen', 
  'emily-rodriguez'
);

-- Verify only real teachers remain
DO $$
DECLARE
  teacher_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO teacher_count FROM teachers;
  
  IF teacher_count != 3 THEN
    RAISE EXCEPTION 'Expected 3 teachers, found %', teacher_count;
  END IF;
END $$;

-- Also clean legacy teacher_leaders table if it exists
DELETE FROM teacher_leaders 
WHERE slug IN ('sarah-johnson', 'michael-chen', 'emily-rodriguez')
AND EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'teacher_leaders'
);

COMMIT;