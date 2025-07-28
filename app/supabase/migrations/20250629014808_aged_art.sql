/*
  # Add and update image management settings
  
  1. Updates
    - Ensures all Cloudinary settings exist in admin_settings table
    - Creates missing settings if needed
    - Sets default values for new installations

  2. Benefits
    - Better defaults for image management feature
    - Improved database structure
*/

-- Add or update Cloudinary settings
INSERT INTO admin_settings (
  setting_key, 
  setting_value, 
  setting_category, 
  description, 
  is_sensitive
) VALUES
  ('cloudinary_cloud_name', '""', 'image_management', 'Cloudinary cloud name for image uploads', false),
  ('cloudinary_upload_preset', '""', 'image_management', 'Cloudinary unsigned upload preset name', false),
  ('cloudinary_api_key', '""', 'image_management', 'Cloudinary API key', true),
  ('cloudinary_api_secret', '""', 'image_management', 'Cloudinary API secret', true),
  ('max_file_size', '10485760', 'image_management', 'Maximum file size in bytes (10MB)', false)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_category = EXCLUDED.setting_category,
  description = EXCLUDED.description,
  is_sensitive = EXCLUDED.is_sensitive,
  updated_at = now();

-- Add logging to verify update was successful
DO $$ 
BEGIN
  RAISE NOTICE 'Image management settings successfully added or updated.';
END $$;