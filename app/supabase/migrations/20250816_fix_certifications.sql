-- Fix teacher certifications
-- Kirsti: AMS (correct)
-- Leah: AMS (correct)  
-- Kira: No certification mentioned (correct)
-- Remove any AMI references (none should exist for real teachers)

BEGIN;

-- Verify Kirsti has AMS (should already be correct)
UPDATE teachers 
SET bio = REPLACE(bio, 'AMI certification', 'AMS certification')
WHERE slug = 'kirsti-forrest' AND bio LIKE '%AMI%';

-- Verify Leah has AMS (should already be correct)
UPDATE teachers 
SET bio = REPLACE(bio, 'AMI certification', 'AMS certification')
WHERE slug = 'leah-walker' AND bio LIKE '%AMI%';

-- No changes needed for Kira (no certification mentioned)

COMMIT;