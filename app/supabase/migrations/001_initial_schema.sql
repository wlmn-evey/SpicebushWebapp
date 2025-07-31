-- Spicebush Montessori Database Schema
-- This creates all the required tables for the web application

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================
-- Settings Table
-- ===========================
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add some default settings
INSERT INTO settings (key, value) VALUES
  ('site_name', '"Spicebush Montessori School"'),
  ('contact_email', '"info@spicebushmontessori.org"'),
  ('contact_phone', '"(123) 456-7890"'),
  ('enrollment_open', 'true'),
  ('current_school_year', '"2024-2025"'),
  ('annual_increase_rate', '3'),
  ('sibling_discount_rate', '10'),
  ('upfront_discount_rate', '2'),
  ('coming_soon_mode', 'false'),
  ('coming_soon_message', '"We are updating our website. Please check back soon!"'),
  ('coming_soon_launch_date', 'null')
ON CONFLICT (key) DO NOTHING;

-- ===========================
-- Newsletter Subscribers Table
-- ===========================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  subscription_type VARCHAR(50) DEFAULT 'general',
  subscription_status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_subscription_type CHECK (subscription_type IN ('general', 'parents', 'alumni', 'staff')),
  CONSTRAINT valid_subscription_status CHECK (subscription_status IN ('active', 'unsubscribed', 'bounced'))
);

-- Create index for faster email lookups
CREATE INDEX idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX idx_newsletter_status ON newsletter_subscribers(subscription_status);

-- ===========================
-- Communications Messages Table
-- ===========================
CREATE TABLE IF NOT EXISTS communications_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject VARCHAR(500) NOT NULL,
  message_content TEXT NOT NULL,
  message_type VARCHAR(50) NOT NULL,
  recipient_type VARCHAR(50) DEFAULT 'all_families',
  recipient_count INTEGER DEFAULT 0,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_message_type CHECK (message_type IN ('announcement', 'newsletter', 'emergency', 'reminder', 'event')),
  CONSTRAINT valid_recipient_type CHECK (recipient_type IN ('all_families', 'current_families', 'prospective_families', 'staff', 'custom'))
);

-- Create indexes for faster queries
CREATE INDEX idx_communications_type ON communications_messages(message_type);
CREATE INDEX idx_communications_sent ON communications_messages(sent_at);
CREATE INDEX idx_communications_scheduled ON communications_messages(scheduled_for);

-- ===========================
-- Audit Logs Table
-- ===========================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  user_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit log queries
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ===========================
-- Update Triggers
-- ===========================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at columns
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletter_updated_at BEFORE UPDATE ON newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communications_updated_at BEFORE UPDATE ON communications_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================
-- Row Level Security (RLS)
-- ===========================
-- Enable RLS on all tables
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Settings: Public read, authenticated write
CREATE POLICY "Settings are viewable by everyone" ON settings
  FOR SELECT USING (true);

CREATE POLICY "Settings are editable by authenticated users" ON settings
  FOR ALL USING (auth.role() = 'authenticated');

-- Newsletter: Public can subscribe, authenticated can manage
CREATE POLICY "Anyone can subscribe to newsletter" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view all subscribers" ON newsletter_subscribers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage subscribers" ON newsletter_subscribers
  FOR ALL USING (auth.role() = 'authenticated');

-- Communications: Authenticated users only
CREATE POLICY "Authenticated users can manage communications" ON communications_messages
  FOR ALL USING (auth.role() = 'authenticated');

-- Audit logs: Authenticated users can insert and view
CREATE POLICY "Authenticated users can create audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view audit logs" ON audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- ===========================
-- Helper Functions
-- ===========================
-- Function to get newsletter statistics
CREATE OR REPLACE FUNCTION get_newsletter_stats()
RETURNS TABLE(
  total_subscribers BIGINT,
  active_subscribers BIGINT,
  unsubscribed_count BIGINT,
  general_subscribers BIGINT,
  parent_subscribers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_subscribers,
    COUNT(*) FILTER (WHERE subscription_status = 'active')::BIGINT as active_subscribers,
    COUNT(*) FILTER (WHERE subscription_status = 'unsubscribed')::BIGINT as unsubscribed_count,
    COUNT(*) FILTER (WHERE subscription_type = 'general' AND subscription_status = 'active')::BIGINT as general_subscribers,
    COUNT(*) FILTER (WHERE subscription_type = 'parents' AND subscription_status = 'active')::BIGINT as parent_subscribers
  FROM newsletter_subscribers;
END;
$$ LANGUAGE plpgsql;

-- Function to get communication statistics
CREATE OR REPLACE FUNCTION get_communication_stats()
RETURNS TABLE(
  total_messages BIGINT,
  sent_messages BIGINT,
  scheduled_messages BIGINT,
  announcements BIGINT,
  newsletters BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_messages,
    COUNT(*) FILTER (WHERE sent_at IS NOT NULL)::BIGINT as sent_messages,
    COUNT(*) FILTER (WHERE scheduled_for IS NOT NULL AND sent_at IS NULL)::BIGINT as scheduled_messages,
    COUNT(*) FILTER (WHERE message_type = 'announcement')::BIGINT as announcements,
    COUNT(*) FILTER (WHERE message_type = 'newsletter')::BIGINT as newsletters
  FROM communications_messages;
END;
$$ LANGUAGE plpgsql;