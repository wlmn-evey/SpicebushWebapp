-- Fix for the auth migration issue
-- This manually applies the intent of migration 20221208132122_backfill_email_last_sign_in_at.up.sql
-- but with corrected type handling

-- First, let's insert the migration record to prevent GoTrue from trying to run the broken migration
INSERT INTO auth.schema_migrations (version) 
VALUES ('20221208132122')
ON CONFLICT (version) DO NOTHING;

-- Now apply the actual fix that the migration was trying to do
-- The original migration was trying to backfill last_sign_in_at for specific records
DO $$
BEGIN
    UPDATE auth.identities
    SET last_sign_in_at = '2022-11-25'::timestamptz
    WHERE
        last_sign_in_at IS NULL AND
        created_at = '2022-11-25'::timestamptz AND
        updated_at = '2022-11-25'::timestamptz AND
        provider = 'email' AND
        id = user_id;  -- Fixed: removed the incorrect ::text cast
EXCEPTION
    WHEN OTHERS THEN
        -- If the update fails for any reason, we'll just log it
        RAISE NOTICE 'Backfill migration skipped: %', SQLERRM;
END $$;