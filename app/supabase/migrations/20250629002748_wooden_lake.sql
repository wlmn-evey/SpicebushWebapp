/*
  # Update teacher titles and ensure proper local image paths

  1. Updates
    - Add titles for existing teachers
    - Ensure all photo URLs are using local paths
    - Verify data consistency

  2. Data Updates
    - Set appropriate titles for each teacher
    - Confirm local image paths are correct
*/

-- Update Kira Messinger with title and local photo path
UPDATE teacher_leaders 
SET 
  title = 'Teacher Partner',
  profile_photo_url = '/images/teachers/kira-messinger.jpg'
WHERE slug = 'kira-messinger';

-- Update Kirsti Forrest with title and local photo path  
UPDATE teacher_leaders 
SET 
  title = 'Teacher Leader',
  profile_photo_url = '/images/teachers/kirsti-forrest.jpg'
WHERE slug = 'kirsti-forrest';

-- Update Leah Walker with title and local photo path
UPDATE teacher_leaders 
SET 
  title = 'Teacher Leader', 
  profile_photo_url = '/images/teachers/leah-walker.jpg'
WHERE slug = 'leah-walker';