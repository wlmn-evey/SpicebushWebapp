-- Public Communications Access Migration
-- Allows public (unauthenticated) users to read certain types of communications

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can manage communications_messages" ON communications_messages;

-- Create separate policies for admin write and public read
CREATE POLICY "Admin users can insert communications_messages" ON communications_messages
  FOR INSERT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin users can update communications_messages" ON communications_messages
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin users can delete communications_messages" ON communications_messages
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin users can view all communications_messages" ON communications_messages
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow public read access to certain message types
CREATE POLICY "Public can view public communications_messages" ON communications_messages
  FOR SELECT
  USING (
    -- Only allow public message types
    message_type IN ('announcement', 'newsletter', 'event')
    -- Only sent messages
    AND status = 'sent'
    -- Only if not scheduled for future or already past scheduled time
    AND (scheduled_for IS NULL OR scheduled_for <= NOW())
  );