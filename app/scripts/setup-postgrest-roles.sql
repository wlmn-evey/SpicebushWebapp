-- Create anon role for public access
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
END$$;

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO anon;

-- Grant SELECT on all tables to anon role
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant SELECT on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;

-- Specific permissions for anon role
GRANT SELECT ON school_hours TO anon;
GRANT SELECT ON special_messages TO anon;
GRANT SELECT ON teacher_leaders TO anon;
GRANT SELECT ON tuition_programs TO anon;
GRANT SELECT ON tuition_rates TO anon;
GRANT SELECT ON tuition_settings TO anon;

-- Create authenticated role for admin access
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
END$$;

-- Grant full access to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

-- Update RLS policies to use 'true' instead of role checks for now
-- This simplifies the setup for development

-- Drop existing policies that reference authenticated role
DROP POLICY IF EXISTS "School hours can be managed by authenticated users" ON school_hours;
DROP POLICY IF EXISTS "Special messages can be managed by authenticated users" ON special_messages;
DROP POLICY IF EXISTS "Tuition programs can be managed by authenticated users" ON tuition_programs;
DROP POLICY IF EXISTS "Tuition rates can be managed by authenticated users" ON tuition_rates;
DROP POLICY IF EXISTS "Tuition settings can be managed by authenticated users" ON tuition_settings;
DROP POLICY IF EXISTS "Teachers can be managed by authenticated users" ON teacher_leaders;

-- Recreate policies without role restrictions for development
CREATE POLICY "Allow all operations for development" ON school_hours FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for development" ON special_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for development" ON tuition_programs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for development" ON tuition_rates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for development" ON tuition_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for development" ON teacher_leaders FOR ALL USING (true) WITH CHECK (true);