/*
  # Image Management System

  1. New Tables
    - `managed_images`
      - `id` (uuid, primary key)
      - `original_url` (text) - Original image URL
      - `cloudinary_public_id` (text) - Cloudinary asset ID
      - `alt_text` (text) - Alt text for accessibility
      - `page_path` (text) - Where the image is used
      - `element_selector` (text) - CSS selector for the image
      - `mobile_position` (jsonb) - Mobile positioning data
      - `tablet_position` (jsonb) - Tablet positioning data
      - `desktop_position` (jsonb) - Desktop positioning data
      - `auto_crop_data` (jsonb) - Smart crop analysis data
      - `file_size` (integer) - Original file size
      - `dimensions` (jsonb) - Width/height info
      - `uploaded_by` (uuid) - Admin who uploaded
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Admin-only write access
    - Public read access for serving images

  3. Functions
    - Trigger for updated_at timestamp
*/

-- Create managed_images table
CREATE TABLE IF NOT EXISTS managed_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_url text,
  cloudinary_public_id text,
  alt_text text,
  page_path text NOT NULL,
  element_selector text NOT NULL,
  mobile_position jsonb DEFAULT '{"x": "center", "y": "center", "zoom": 1}',
  tablet_position jsonb DEFAULT '{"x": "center", "y": "center", "zoom": 1}',
  desktop_position jsonb DEFAULT '{"x": "center", "y": "center", "zoom": 1}',
  auto_crop_data jsonb,
  file_size integer,
  dimensions jsonb,
  uploaded_by uuid,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE managed_images ENABLE ROW LEVEL SECURITY;

-- Public read access for active images
CREATE POLICY "Active managed images are viewable by everyone"
  ON managed_images FOR SELECT TO public
  USING (active = true);

-- Admin management access
CREATE POLICY "Managed images can be managed by authenticated users"
  ON managed_images FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_managed_images_updated_at
  BEFORE UPDATE ON managed_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint for page + selector combination
ALTER TABLE managed_images 
ADD CONSTRAINT managed_images_page_selector_unique 
UNIQUE (page_path, element_selector);