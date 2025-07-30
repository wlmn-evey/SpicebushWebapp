-- Communications Tables Migration
-- Creates tables for managing school communications, messages, and templates

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Communications Messages Table
-- Stores all messages sent through the communications center
CREATE TABLE IF NOT EXISTS communications_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Message metadata
  subject VARCHAR(255) NOT NULL,
  message_content TEXT NOT NULL,
  message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('announcement', 'newsletter', 'emergency', 'reminder', 'event')),
  
  -- Recipients and delivery
  recipient_type VARCHAR(50) NOT NULL DEFAULT 'all_families' CHECK (recipient_type IN ('all_families', 'selected_families', 'staff_only')),
  recipient_count INTEGER DEFAULT 0,
  
  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE NULL, -- NULL means send immediately
  sent_at TIMESTAMP WITH TIME ZONE NULL, -- When actually sent
  
  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  delivery_stats JSONB DEFAULT '{}', -- Store open rates, click rates, etc.
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Communications Templates Table  
-- Stores reusable message templates
CREATE TABLE IF NOT EXISTS communications_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Template details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('announcement', 'newsletter', 'emergency', 'reminder', 'event')),
  
  -- Template content
  subject_template VARCHAR(255) NOT NULL,
  content_template TEXT NOT NULL,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE NULL,
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Communications Recipients Table (for selected recipients)
-- Tracks specific recipients when not sending to all families
CREATE TABLE IF NOT EXISTS communications_recipients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES communications_messages(id) ON DELETE CASCADE,
  
  -- Recipient details (could be family ID, email, etc.)
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  
  -- Delivery tracking
  delivered_at TIMESTAMP WITH TIME ZONE NULL,
  opened_at TIMESTAMP WITH TIME ZONE NULL,
  clicked_at TIMESTAMP WITH TIME ZONE NULL,
  
  -- Status
  delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'failed', 'bounced')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_communications_messages_created_by ON communications_messages(created_by);
CREATE INDEX IF NOT EXISTS idx_communications_messages_status ON communications_messages(status);
CREATE INDEX IF NOT EXISTS idx_communications_messages_sent_at ON communications_messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_communications_messages_type ON communications_messages(message_type);

CREATE INDEX IF NOT EXISTS idx_communications_templates_created_by ON communications_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_communications_templates_type ON communications_templates(message_type);

CREATE INDEX IF NOT EXISTS idx_communications_recipients_message ON communications_recipients(message_id);
CREATE INDEX IF NOT EXISTS idx_communications_recipients_email ON communications_recipients(recipient_email);

-- Updated_at trigger function (if not exists from previous migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Updated_at triggers
CREATE TRIGGER update_communications_messages_updated_at 
  BEFORE UPDATE ON communications_messages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communications_templates_updated_at 
  BEFORE UPDATE ON communications_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE communications_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications_recipients ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated admin users can manage communications
CREATE POLICY "Admin users can manage communications_messages" ON communications_messages
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin users can manage communications_templates" ON communications_templates
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin users can manage communications_recipients" ON communications_recipients
  USING (auth.uid() IS NOT NULL);

-- Insert some default templates
INSERT INTO communications_templates (name, description, message_type, subject_template, content_template, created_by) VALUES
(
  'Weather Closure',
  'Template for weather-related school closures',
  'emergency',
  'SCHOOL CLOSED: Weather Emergency - {date}',
  'Dear Spicebush Families,

Due to {weather_condition}, Spicebush Montessori School will be CLOSED on {date}.

The safety of our children and families is our top priority. We will monitor conditions and provide updates about reopening.

Please stay safe and warm!

With care,
The Spicebush Team'
  -- Note: created_by will need to be updated with actual admin user ID
  -- For now, we'll use the first admin user found
  , (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1)
),
(
  'Weekly Newsletter',
  'Standard weekly update format',
  'newsletter',
  'Weekly Community Update - Week of {date}',
  'Dear Spicebush Families,

Here''s what''s happening in our community this week:

**Classroom Updates:**
{classroom_updates}

**Upcoming Events:**
{upcoming_events}

**Reminders:**
{reminders}

**Community News:**
{community_news}

Thank you for being part of our learning community!

With gratitude,
The Spicebush Team'
  , (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1)
),
(
  'Event Reminder',
  'Upcoming event notification template',
  'reminder',
  'Reminder: {event_name} - {event_date}',
  'Dear Spicebush Families,

This is a friendly reminder about our upcoming event:

**{event_name}**
📅 Date: {event_date}
🕐 Time: {event_time}
📍 Location: {event_location}

{event_details}

We look forward to seeing you there!

Best regards,
The Spicebush Team'
  , (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1)
),
(
  'Policy Update',
  'Important policy change notifications',
  'announcement',
  'Important Update: {policy_name}',
  'Dear Spicebush Families,

We wanted to inform you of an important update to our {policy_name}.

**What''s changing:**
{changes}

**When this takes effect:**
{effective_date}

**What this means for you:**
{impact}

If you have any questions, please don''t hesitate to reach out to us.

Thank you for your understanding.

The Spicebush Team'
  , (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1)
);

-- If no admin users exist yet, we'll handle this in the application
-- Remove the default template inserts if they fail due to missing admin users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email LIKE '%admin%') THEN
        -- No admin users yet, skip template creation
        DELETE FROM communications_templates WHERE created_by IS NULL;
    END IF;
END $$;