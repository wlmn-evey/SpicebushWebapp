-- Drop the complex contact form table if it exists
DROP TABLE IF EXISTS contact_submissions CASCADE;

-- Create a simple contact form storage table
-- This is purely for record-keeping, not for workflow management
CREATE TABLE IF NOT EXISTS contact_form_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Form data exactly as submitted
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  subject VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  child_age VARCHAR(20),
  tour_interest BOOLEAN DEFAULT false,
  
  -- Simple timestamp
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simple index for chronological viewing
CREATE INDEX idx_contact_form_submissions_date ON contact_form_submissions(submitted_at DESC);

-- Enable RLS but with simple policies
ALTER TABLE contact_form_submissions ENABLE ROW LEVEL SECURITY;

-- No public access - this is just for internal record keeping
-- Netlify will use a service role key to insert
CREATE POLICY "Service role can insert" ON contact_form_submissions
  FOR INSERT 
  WITH CHECK (true);

-- Optional: Allow authenticated admins to view if needed later
CREATE POLICY "Admins can view submissions" ON contact_form_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.email = auth.jwt()->>'email'
      AND admin_users.is_active = true
    )
  );