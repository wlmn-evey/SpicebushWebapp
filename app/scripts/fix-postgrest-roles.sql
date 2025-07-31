-- Fix PostgREST role permissions
-- This resolves "permission denied to set role" errors
-- Note: The password placeholder will be replaced by the script that runs this SQL

-- Create authenticator role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '${POSTGRES_PASSWORD}';
  END IF;
END
$$;

-- Grant necessary permissions to authenticator
GRANT anon TO authenticator;
GRANT service_role TO authenticator;
GRANT supabase_auth_admin TO authenticator;

-- Ensure anon and service_role are NOLOGIN roles
ALTER ROLE anon NOLOGIN;
ALTER ROLE service_role NOLOGIN;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticator;
GRANT USAGE ON SCHEMA auth TO authenticator;
GRANT USAGE ON SCHEMA storage TO authenticator;

-- Ensure authenticator can access the content and settings tables
GRANT SELECT ON public.content TO anon;
GRANT SELECT ON public.settings TO anon;
GRANT ALL ON public.content TO service_role;
GRANT ALL ON public.settings TO service_role;