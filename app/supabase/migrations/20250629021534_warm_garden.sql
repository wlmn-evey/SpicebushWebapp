/*
  # Enhanced Image Management Settings

  This migration adds a comprehensive set of image management settings
  to the admin_settings table, focusing on:
  
  1. New Settings
     - Default image quality settings
     - Image format preferences
     - Resize dimensions for responsive images
     - Upload validation rules
  
  2. Improved Structure
     - All image settings grouped under 'image_management' category
     - Better descriptive text for each setting
     - Sensible default values for all settings
     
  3. Security
     - Proper marking of sensitive values
*/

-- Add or update Cloudinary image management settings
INSERT INTO admin_settings (
  setting_key, 
  setting_value, 
  setting_category, 
  description, 
  is_sensitive
) VALUES
  -- Core Cloudinary Settings
  ('cloudinary_cloud_name', '""', 'image_management', 'Your Cloudinary cloud name (required for image uploads)', false),
  ('cloudinary_upload_preset', '""', 'image_management', 'Unsigned upload preset created in your Cloudinary dashboard', false),
  
  -- Image Quality and Format Settings
  ('default_image_quality', '80', 'image_management', 'Default JPEG/WebP quality setting (0-100)', false),
  ('preferred_image_format', '"auto"', 'image_management', 'Preferred format for image delivery (auto, webp, jpg, png)', false),
  ('max_image_dimensions', '{"width": 1920, "height": 1200}', 'image_management', 'Maximum dimensions for uploaded images', false),
  ('min_image_dimensions', '{"width": 200, "height": 200}', 'image_management', 'Minimum dimensions for uploaded images', false),
  
  -- Responsive Image Settings
  ('responsive_breakpoints', '[{"name": "mobile", "width": 480}, {"name": "tablet", "width": 768}, {"name": "desktop", "width": 1280}]', 'image_management', 'Responsive image breakpoints for different devices', false),
  
  -- Upload Constraints
  ('max_file_size', '10485760', 'image_management', 'Maximum file size in bytes (10MB default)', false),
  ('allowed_image_types', '["image/jpeg", "image/png", "image/webp"]', 'image_management', 'Allowed MIME types for image uploads', false),
  ('image_backup_enabled', 'true', 'image_management', 'Whether to keep original images as backup', false)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  setting_category = EXCLUDED.setting_category,
  description = EXCLUDED.description,
  is_sensitive = EXCLUDED.is_sensitive,
  updated_at = now();

-- Add indexes for better performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'admin_settings' AND indexname = 'admin_settings_category_idx'
  ) THEN
    CREATE INDEX IF NOT EXISTS admin_settings_category_idx ON admin_settings(setting_category);
  END IF;
END $$;

-- Add basic test data for UI development (commented out for production use)
/*
UPDATE admin_settings 
SET setting_value = '"spicebush-school"'
WHERE setting_key = 'cloudinary_cloud_name';

UPDATE admin_settings 
SET setting_value = '"ml_default"'
WHERE setting_key = 'cloudinary_upload_preset';
*/