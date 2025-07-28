/*
  # Create Admin Settings Table

  1. New Table
    - `admin_settings` - Dedicated table for admin/system configuration
      - Stores API keys, system preferences, and other admin settings
      - Separate from tuition-specific settings
      
  2. Security
    - Enable RLS with authenticated-only access
    - Admin users can read/write settings
    
  3. Initial Data
    - Default Cloudinary configuration placeholders
    - System preferences
*/

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  setting_category text NOT NULL DEFAULT 'general',
  description text,
  is_sensitive boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can access admin settings
CREATE POLICY "Admin settings can be viewed by authenticated users"
  ON admin_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin settings can be managed by authenticated users"
  ON admin_settings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin settings
INSERT INTO admin_settings (setting_key, setting_value, setting_category, description, is_sensitive) VALUES
  -- Image Management / Cloudinary Settings
  ('cloudinary_cloud_name', '""', 'image_management', 'Cloudinary cloud name for image uploads', false),
  ('cloudinary_upload_preset', '""', 'image_management', 'Cloudinary unsigned upload preset name', false),
  ('cloudinary_api_key', '""', 'image_management', 'Cloudinary API key', true),
  ('cloudinary_api_secret', '""', 'image_management', 'Cloudinary API secret', true),
  ('max_image_file_size', '10485760', 'image_management', 'Maximum image file size in bytes (10MB)', false),
  ('backup_original_images', 'true', 'image_management', 'Whether to backup original images before replacing', false),
  
  -- Analytics Settings
  ('google_analytics_id', '""', 'analytics', 'Google Analytics tracking ID', false),
  ('google_tag_manager_id', '""', 'analytics', 'Google Tag Manager container ID', false),
  
  -- Payment Settings
  ('stripe_public_key', '""', 'payments', 'Stripe publishable key', false),
  ('stripe_secret_key', '""', 'payments', 'Stripe secret key', true),
  ('stripe_webhook_secret', '""', 'payments', 'Stripe webhook endpoint secret', true),
  
  -- Map Settings
  ('google_maps_api_key', '""', 'maps', 'Google Maps API key for location services', true),
  
  -- Email Settings
  ('smtp_host', '""', 'email', 'SMTP server hostname', false),
  ('smtp_port', '587', 'email', 'SMTP server port', false),
  ('smtp_username', '""', 'email', 'SMTP username', false),
  ('smtp_password', '""', 'email', 'SMTP password', true),
  ('from_email', '"information@spicebushmontessori.org"', 'email', 'Default from email address', false),
  
  -- System Settings
  ('maintenance_mode', 'false', 'system', 'Whether the site is in maintenance mode', false),
  ('debug_mode', 'false', 'system', 'Whether debug mode is enabled', false),
  ('contact_form_recipient', '"information@spicebushmontessori.org"', 'system', 'Email address to receive contact form submissions', false)

ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  setting_category = EXCLUDED.setting_category,
  description = EXCLUDED.description,
  is_sensitive = EXCLUDED.is_sensitive,
  updated_at = now();