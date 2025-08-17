-- Add certification_badge column to teacher_leaders table
-- This allows selecting specific certification types from a dropdown

-- Add the column
ALTER TABLE teacher_leaders 
ADD COLUMN IF NOT EXISTS certification_badge text;

-- Update existing teachers based on their current bio/description
-- Set AMS for teachers we know have AMS certification
UPDATE teacher_leaders 
SET certification_badge = 'AMS' 
WHERE (slug = 'kirsti-forrest' OR slug = 'leah-walker')
AND certification_badge IS NULL;

-- Note: Kira has no certification mentioned, so leaving NULL

-- Add comment for documentation
COMMENT ON COLUMN teacher_leaders.certification_badge IS 'Certification type to display as badge (e.g., AMS, AMI)';