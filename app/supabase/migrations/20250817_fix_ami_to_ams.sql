-- Fix incorrect AMI certifications to AMS
-- Kirsti and Leah have AMS certification, not AMI
-- Kira has no Montessori certification

BEGIN;

-- Update Kirsti's credentials in the content table
UPDATE content 
SET data = jsonb_set(
  data,
  '{credentials}',
  '["AMS Montessori Certification", "B.A. in Education"]'::jsonb
)
WHERE type = 'staff' 
  AND slug = 'kirsti-forrest'
  AND data->'credentials' ? 'AMI Montessori Certification';

-- Update Leah's credentials in the content table
UPDATE content 
SET data = jsonb_set(
  data,
  '{credentials}',
  '["AMS Montessori Certification", "B.S. in Child Development"]'::jsonb
)
WHERE type = 'staff' 
  AND slug = 'leah-walker'
  AND data->'credentials' ? 'AMI Montessori Certification';

-- Update Kira's credentials to remove Montessori certification
UPDATE content 
SET data = jsonb_set(
  data,
  '{credentials}',
  '["Environmental Education Certificate"]'::jsonb
)
WHERE type = 'staff' 
  AND slug = 'kira-messinger'
  AND data->'credentials' ? 'AMI Montessori Certification';

-- Update school-info accreditation from AMI to AMS
UPDATE content 
SET data = jsonb_set(
  data,
  '{accreditation}',
  '["AMS Certified Teachers", "PA Licensed Child Care Center"]'::jsonb
)
WHERE type = 'school-info' 
  AND slug = 'general'
  AND data->'accreditation' ? 'AMI Certified Teachers';

-- Also ensure the certification_badge column is correct in teacher_leaders
-- (This table might not exist yet if migration hasn't been run)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'teacher_leaders' 
      AND column_name = 'certification_badge'
  ) THEN
    -- Ensure Kirsti and Leah have AMS certification badge
    UPDATE teacher_leaders 
    SET certification_badge = 'AMS' 
    WHERE slug IN ('kirsti-forrest', 'leah-walker');
    
    -- Ensure Kira has no certification badge
    UPDATE teacher_leaders 
    SET certification_badge = NULL 
    WHERE slug = 'kira-messinger';
  END IF;
END $$;

COMMIT;