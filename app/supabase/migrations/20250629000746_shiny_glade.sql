/*
  # Teacher Leaders Management System

  1. New Tables
    - `teacher_leaders`
      - `id` (uuid, primary key)
      - `name` (text) - Teacher's full name
      - `slug` (text, unique) - URL-friendly version of name
      - `profile_photo_url` (text) - URL to profile photo
      - `description` (text) - HTML bio content
      - `email` (text) - Contact email
      - `pronouns` (text) - Preferred pronouns
      - `active` (boolean) - Whether teacher is currently active
      - `display_order` (integer) - Order for displaying on website
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Public read access for active teachers
    - Authenticated admin access for management

  3. Sample Data
    - Import the three teachers from the CSV data provided
*/

-- Create teacher_leaders table
CREATE TABLE IF NOT EXISTS teacher_leaders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  profile_photo_url text,
  description text,
  email text,
  pronouns text,
  active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE teacher_leaders ENABLE ROW LEVEL SECURITY;

-- Public read access for active teachers
CREATE POLICY "Active teachers are viewable by everyone"
  ON teacher_leaders FOR SELECT TO public
  USING (active = true);

-- Admin management access
CREATE POLICY "Teachers can be managed by authenticated users"
  ON teacher_leaders FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Add updated_at trigger
CREATE TRIGGER update_teacher_leaders_updated_at
  BEFORE UPDATE ON teacher_leaders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample teacher data from CSV
INSERT INTO teacher_leaders (name, slug, profile_photo_url, description, email, pronouns, active, display_order) VALUES
(
  'Kira Messinger',
  'kira-messinger',
  'https://cdn.prod.website-files.com/67cb1c8b359005c8824cece2/684efb81e7a8f61e14d7a838_Kira%20Messinger%20Spicebush%20Montessori.jpeg',
  '<p>Hello! I am a teacher partner at Spicebush Montessori School, and this is my eighth year teaching. Although my background is in Lower Elementary Montessori education, I attended Millersville University and received undergraduate degrees in Early Childhood Education and in Special Education. I am certified to educate and support learners of all needs from birth through sixth grade, and I am delighted to be a part of Spicebush Montessori''s mission to help children access a meaningful and equitable Montessori education. Thank you for joining us here!</p>',
  'kira@spicebushmontessori.org',
  'They/Them',
  true,
  1
),
(
  'Kirsti Forrest',
  'kirsti-forrest',
  'https://cdn.prod.website-files.com/67cb1c8b359005c8824cece2/684efb338f8d8db6fc8b72f6_CleanShot%202025-06-15%20at%2012.39.35%402x%201.jpeg',
  '<p>Hello! I am one of the teacher leaders at Spicebush Montessori School, and this is my seventh year teaching in a Montessori environment. Though I have my AMS certification in Infant/Toddler, my degree is in Early Care and Education from Delaware Technical and Community College, where I learned to care for and educate children from infancy through second grade. I''m pursuing a second degree in Human and Social Services with a concentration in Early Childhood from Springfield College in Massachusetts. My goal has always been to make Montessori education far more accessible than it currently is. Spicebush Montessori School is delighted to be a part of this mission and purposeful work with the Wildflower Foundation. Thank you for joining us here!</p>',
  'kirsti@spicebushmontessori.org',
  'They/She',
  true,
  2
),
(
  'Leah Walker',
  'leah-walker',
  'https://cdn.prod.website-files.com/67cb1c8b359005c8824cece2/684efbbede2470646731b513_Leah%20Walker%20Spicebush%20Montessori.jpeg',
  '<p>Hello! I am one of the teacher leaders at Spicebush Montessori School; I am finishing my ninth year as a lead Montessori teacher. I have a Masters of Education and AMS certification for ages three to six from Chaminade University in Honolulu. I am passionate about social and emotional education for young children which links well with the Quaker values of SPICES (social justice, peace, inclusion, environment, and simplicity). These values influenced our name and speak to the type of curriculum we implemented. Thank you for joining us here!</p>',
  'leah@spicebushmontessori.org',
  'She/Her',
  true,
  3
);