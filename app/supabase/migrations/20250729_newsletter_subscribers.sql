-- Newsletter Subscribers Table Migration
-- Creates tables for managing newsletter signups and email lists

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Newsletter Subscribers Table
-- Stores all email newsletter signups
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Subscriber information
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  
  -- Subscription preferences
  subscription_status VARCHAR(50) NOT NULL DEFAULT 'active' 
    CHECK (subscription_status IN ('active', 'unsubscribed', 'pending', 'bounced')),
  subscription_type VARCHAR(50) NOT NULL DEFAULT 'general'
    CHECK (subscription_type IN ('general', 'parents', 'prospective', 'alumni', 'community')),
  
  -- Source tracking
  signup_source VARCHAR(100), -- e.g., 'website_footer', 'coming_soon', 'event', 'admin_import'
  signup_page VARCHAR(255), -- URL where they signed up
  referral_source VARCHAR(100), -- How they heard about us
  
  -- Engagement tracking
  total_emails_sent INTEGER DEFAULT 0,
  total_emails_opened INTEGER DEFAULT 0,
  total_links_clicked INTEGER DEFAULT 0,
  last_email_sent_at TIMESTAMP WITH TIME ZONE,
  last_email_opened_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Newsletter Signup Logs
-- Tracks all signup attempts for analytics
CREATE TABLE IF NOT EXISTS newsletter_signup_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  signup_page VARCHAR(255),
  signup_successful BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Newsletter Lists
-- Allows creating segmented lists for targeted communications
CREATE TABLE IF NOT EXISTS newsletter_lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  list_type VARCHAR(50) NOT NULL DEFAULT 'manual'
    CHECK (list_type IN ('manual', 'dynamic', 'system')),
  
  -- For dynamic lists, store the criteria
  criteria JSONB DEFAULT '{}',
  
  -- Metadata
  subscriber_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Newsletter List Members
-- Many-to-many relationship between subscribers and lists
CREATE TABLE IF NOT EXISTS newsletter_list_members (
  list_id UUID NOT NULL REFERENCES newsletter_lists(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  PRIMARY KEY (list_id, subscriber_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(subscription_status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_type ON newsletter_subscribers(subscription_type);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_created ON newsletter_subscribers(created_at);

CREATE INDEX IF NOT EXISTS idx_newsletter_signup_logs_email ON newsletter_signup_logs(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_signup_logs_created ON newsletter_signup_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_newsletter_list_members_subscriber ON newsletter_list_members(subscriber_id);

-- Updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Updated_at triggers
CREATE TRIGGER update_newsletter_subscribers_updated_at 
  BEFORE UPDATE ON newsletter_subscribers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletter_lists_updated_at 
  BEFORE UPDATE ON newsletter_lists 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_signup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_list_members ENABLE ROW LEVEL SECURITY;

-- Public users can sign up for newsletter
CREATE POLICY "Public can insert newsletter signups" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- Public users can check their own subscription status by email
CREATE POLICY "Users can view own subscription" ON newsletter_subscribers
  FOR SELECT USING (email = current_setting('app.current_user_email', true));

-- Authenticated admin users can manage all subscribers
CREATE POLICY "Admin users can manage newsletter_subscribers" ON newsletter_subscribers
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin users can view newsletter_signup_logs" ON newsletter_signup_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin users can manage newsletter_lists" ON newsletter_lists
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin users can manage newsletter_list_members" ON newsletter_list_members
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create some default lists
INSERT INTO newsletter_lists (name, description, list_type) VALUES
  ('All Subscribers', 'All active newsletter subscribers', 'system'),
  ('Current Families', 'Parents and guardians of enrolled students', 'manual'),
  ('Prospective Families', 'Families interested in enrollment', 'manual'),
  ('Alumni Families', 'Former students and their families', 'manual'),
  ('Community Members', 'Local community members and supporters', 'manual')
ON CONFLICT DO NOTHING;