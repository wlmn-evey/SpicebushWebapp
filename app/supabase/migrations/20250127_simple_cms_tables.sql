-- Simple CMS Tables for Spicebush Montessori
-- Following KISS principle - only what we actually need

-- One table for all content
CREATE TABLE IF NOT EXISTS content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'blog', 'staff', 'event', 'announcement', etc.
  slug TEXT NOT NULL,
  title TEXT,
  data JSONB NOT NULL, -- Flexible content storage
  status TEXT DEFAULT 'published', -- 'published' or 'draft'
  author_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(type, slug)
);

-- Simple media storage
CREATE TABLE IF NOT EXISTS media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  size INTEGER,
  uploaded_by TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Key-value settings (for things like coming soon mode)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_content_type ON content(type);
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_updated ON content(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Simple admin-only policies
-- Read access for everyone (public website)
CREATE POLICY "Public can read published content" ON content
  FOR SELECT USING (status = 'published');

-- Admin policies (check email domain)
CREATE POLICY "Admins can do everything with content" ON content
  FOR ALL USING (
    auth.jwt()->>'email' LIKE '%@spicebushmontessori.org' OR 
    auth.jwt()->>'email' LIKE '%@eveywinters.com'
  );

CREATE POLICY "Admins can manage media" ON media
  FOR ALL USING (
    auth.jwt()->>'email' LIKE '%@spicebushmontessori.org' OR 
    auth.jwt()->>'email' LIKE '%@eveywinters.com'
  );

CREATE POLICY "Admins can manage settings" ON settings
  FOR ALL USING (
    auth.jwt()->>'email' LIKE '%@spicebushmontessori.org' OR 
    auth.jwt()->>'email' LIKE '%@eveywinters.com'
  );

-- Public can view media
CREATE POLICY "Public can view media" ON media
  FOR SELECT USING (true);

-- Insert default settings
INSERT INTO settings (key, value) VALUES 
  ('coming_soon_enabled', 'false'),
  ('site_message', '')
ON CONFLICT (key) DO NOTHING;