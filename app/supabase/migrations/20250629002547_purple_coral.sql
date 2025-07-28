/*
  # Update teacher photos to use local storage

  Updates the teacher_leaders table to use locally stored photos instead of external CDN links.
  This migration updates the profile_photo_url field to point to local image files.
*/

-- Update existing teacher photo URLs to use local storage
UPDATE teacher_leaders 
SET profile_photo_url = '/images/teachers/kira-messinger.jpg'
WHERE slug = 'kira-messinger';

UPDATE teacher_leaders 
SET profile_photo_url = '/images/teachers/kirsti-forrest.jpg'
WHERE slug = 'kirsti-forrest';

UPDATE teacher_leaders 
SET profile_photo_url = '/images/teachers/leah-walker.jpg'
WHERE slug = 'leah-walker';