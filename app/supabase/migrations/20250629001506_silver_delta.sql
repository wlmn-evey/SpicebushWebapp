/*
  # Add work titles to teacher leaders

  1. Changes to teacher_leaders table
    - Add `title` column for work/job titles (e.g., "Lead Teacher", "Assistant Teacher", etc.)
  
  2. Security
    - No changes to RLS policies needed as they're already properly configured
*/

-- Add title column to teacher_leaders table
ALTER TABLE teacher_leaders 
ADD COLUMN IF NOT EXISTS title text;

-- Add a comment to document the new field
COMMENT ON COLUMN teacher_leaders.title IS 'Work title or job position (e.g., Lead Teacher, Assistant Teacher, etc.)';