ALTER TABLE contact_form_submissions
  ADD COLUMN IF NOT EXISTS ip_address TEXT;

CREATE INDEX IF NOT EXISTS idx_contact_form_submissions_ip_submitted_at
  ON contact_form_submissions (ip_address, submitted_at DESC)
  WHERE ip_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_form_submissions_email_submitted_at
  ON contact_form_submissions ((LOWER(email)), submitted_at DESC);
