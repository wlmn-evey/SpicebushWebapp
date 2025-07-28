-- Add storage_path column to media table for local storage tracking
ALTER TABLE media 
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS mimetype TEXT;