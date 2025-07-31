-- Storage Schema Initialization for Supabase
-- This migration creates the core storage tables required by supabase-storage-api
-- Must run before any storage policies are created
-- Renamed to run early in alphabetical order: 20250701_storage_schema_init.sql

\echo 'Initializing storage schema with core tables...'

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure storage schema exists
CREATE SCHEMA IF NOT EXISTS storage;

-- Create storage.buckets table
CREATE TABLE IF NOT EXISTS storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    CONSTRAINT buckets_pkey PRIMARY KEY (id),
    CONSTRAINT buckets_name_key UNIQUE (name)
);

-- Create storage.objects table
CREATE TABLE IF NOT EXISTS storage.objects (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_accessed_at timestamptz DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    CONSTRAINT objects_pkey PRIMARY KEY (id),
    CONSTRAINT objects_bucketid_objname UNIQUE (bucket_id, name),
    CONSTRAINT objects_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id) ON DELETE CASCADE
);

-- Create storage.migrations table for tracking storage migrations
CREATE TABLE IF NOT EXISTS storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT migrations_pkey PRIMARY KEY (id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS objects_bucket_id_idx ON storage.objects USING btree (bucket_id);
CREATE INDEX IF NOT EXISTS objects_name_idx ON storage.objects USING btree (name);
CREATE INDEX IF NOT EXISTS buckets_name_idx ON storage.buckets USING btree (name);

-- Enable RLS on storage tables
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to storage admin
GRANT ALL ON SCHEMA storage TO supabase_storage_admin, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO supabase_storage_admin, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO supabase_storage_admin, service_role;

-- Create the authenticated role if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
END $$;

-- Grant usage on storage schema to other roles
GRANT USAGE ON SCHEMA storage TO anon, authenticated, supabase_admin;

-- Grant select permissions for public access where appropriate
GRANT SELECT ON storage.buckets TO anon, authenticated;
GRANT SELECT ON storage.objects TO anon, authenticated;

-- Create trigger functions for updated_at timestamps
CREATE OR REPLACE FUNCTION storage.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_objects_updated_at ON storage.objects;
CREATE TRIGGER update_objects_updated_at
    BEFORE UPDATE ON storage.objects
    FOR EACH ROW EXECUTE PROCEDURE storage.update_updated_at_column();

DROP TRIGGER IF EXISTS update_buckets_updated_at ON storage.buckets;
CREATE TRIGGER update_buckets_updated_at
    BEFORE UPDATE ON storage.buckets
    FOR EACH ROW EXECUTE PROCEDURE storage.update_updated_at_column();

\echo 'Storage schema initialization completed successfully.'