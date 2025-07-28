-- Migration: Create CMS tables for Decap CMS with Supabase backend
-- This replaces Git-based storage with database tables for simpler management

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Blog posts table
CREATE TABLE IF NOT EXISTS cms_blog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff profiles table
CREATE TABLE IF NOT EXISTS cms_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS cms_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS cms_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tuition programs table
CREATE TABLE IF NOT EXISTS cms_tuition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- School hours table
CREATE TABLE IF NOT EXISTS cms_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Testimonials table
CREATE TABLE IF NOT EXISTS cms_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photo library table
CREATE TABLE IF NOT EXISTS cms_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table (for coming soon mode and other settings)
CREATE TABLE IF NOT EXISTS cms_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media library table
CREATE TABLE IF NOT EXISTS cms_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  url TEXT NOT NULL,
  size BIGINT,
  type TEXT,
  metadata JSONB,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Version history table for all content
CREATE TABLE IF NOT EXISTS cms_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection TEXT NOT NULL,
  item_id TEXT NOT NULL,
  data JSONB NOT NULL,
  action TEXT DEFAULT 'updated',
  message TEXT,
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_cms_blog_slug ON cms_blog(slug);
CREATE INDEX idx_cms_blog_created ON cms_blog(created_at DESC);
CREATE INDEX idx_cms_staff_slug ON cms_staff(slug);
CREATE INDEX idx_cms_announcements_slug ON cms_announcements(slug);
CREATE INDEX idx_cms_events_slug ON cms_events(slug);
CREATE INDEX idx_cms_versions_collection ON cms_versions(collection, item_id);
CREATE INDEX idx_cms_versions_created ON cms_versions(created_at DESC);
CREATE INDEX idx_cms_media_uploaded ON cms_media(created_at DESC);

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE cms_blog ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_tuition ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_versions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.jwt() ->> 'email' LIKE '%@eveywinters.com' 
      OR auth.jwt() ->> 'email' LIKE '%@spicebushmontessori.org';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for all CMS tables
-- Allow admins to do everything, others can only read
CREATE POLICY cms_blog_read ON cms_blog FOR SELECT USING (true);
CREATE POLICY cms_blog_write ON cms_blog FOR ALL USING (is_admin());

CREATE POLICY cms_staff_read ON cms_staff FOR SELECT USING (true);
CREATE POLICY cms_staff_write ON cms_staff FOR ALL USING (is_admin());

CREATE POLICY cms_announcements_read ON cms_announcements FOR SELECT USING (true);
CREATE POLICY cms_announcements_write ON cms_announcements FOR ALL USING (is_admin());

CREATE POLICY cms_events_read ON cms_events FOR SELECT USING (true);
CREATE POLICY cms_events_write ON cms_events FOR ALL USING (is_admin());

CREATE POLICY cms_tuition_read ON cms_tuition FOR SELECT USING (true);
CREATE POLICY cms_tuition_write ON cms_tuition FOR ALL USING (is_admin());

CREATE POLICY cms_hours_read ON cms_hours FOR SELECT USING (true);
CREATE POLICY cms_hours_write ON cms_hours FOR ALL USING (is_admin());

CREATE POLICY cms_testimonials_read ON cms_testimonials FOR SELECT USING (true);
CREATE POLICY cms_testimonials_write ON cms_testimonials FOR ALL USING (is_admin());

CREATE POLICY cms_photos_read ON cms_photos FOR SELECT USING (true);
CREATE POLICY cms_photos_write ON cms_photos FOR ALL USING (is_admin());

CREATE POLICY cms_settings_read ON cms_settings FOR SELECT USING (true);
CREATE POLICY cms_settings_write ON cms_settings FOR ALL USING (is_admin());

CREATE POLICY cms_media_read ON cms_media FOR SELECT USING (true);
CREATE POLICY cms_media_write ON cms_media FOR ALL USING (is_admin());

-- Version history is admin-only
CREATE POLICY cms_versions_admin ON cms_versions FOR ALL USING (is_admin());

-- Insert default coming soon setting
INSERT INTO cms_settings (key, value, updated_by)
VALUES (
  'coming_soon',
  '{"enabled": false, "launchDate": "2025-02-01", "headline": "We''re updating our site", "message": "While we work on bringing you an improved experience, you can still apply for enrollment!"}'::jsonb,
  'system'
) ON CONFLICT (key) DO NOTHING;

-- Create triggers for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cms_blog_updated_at BEFORE UPDATE ON cms_blog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_staff_updated_at BEFORE UPDATE ON cms_staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_announcements_updated_at BEFORE UPDATE ON cms_announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_events_updated_at BEFORE UPDATE ON cms_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_tuition_updated_at BEFORE UPDATE ON cms_tuition
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_hours_updated_at BEFORE UPDATE ON cms_hours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_testimonials_updated_at BEFORE UPDATE ON cms_testimonials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_photos_updated_at BEFORE UPDATE ON cms_photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cms_settings_updated_at BEFORE UPDATE ON cms_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for media uploads if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for media bucket
CREATE POLICY "Public read access" ON storage.objects 
  FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Admin upload access" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'media' AND is_admin());

CREATE POLICY "Admin update access" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'media' AND is_admin());

CREATE POLICY "Admin delete access" ON storage.objects 
  FOR DELETE USING (bucket_id = 'media' AND is_admin());