-- Add metadata columns to media table for photo management system
-- This migration adds the required columns for the admin photo upload/management features

-- Add metadata columns to media table
ALTER TABLE media 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[]; -- Array of tags for categorization

-- Add updated_at column for tracking metadata changes
ALTER TABLE media 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index on tags for better search performance when filtering by tags
CREATE INDEX IF NOT EXISTS idx_media_tags ON media USING GIN(tags);

-- Create index on title for better search performance
CREATE INDEX IF NOT EXISTS idx_media_title ON media(title);

-- Add a comment to document the new fields
COMMENT ON COLUMN media.title IS 'Human-readable title for the media file';
COMMENT ON COLUMN media.description IS 'Optional description or caption for the media file';
COMMENT ON COLUMN media.tags IS 'Array of tags for categorizing and organizing media files';
COMMENT ON COLUMN media.updated_at IS 'Timestamp when metadata was last updated';