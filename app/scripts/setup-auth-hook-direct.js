import fetch from 'node-fetch';
import 'dotenv/config';

const SUPABASE_PROJECT_REF = 'xnzweuepchbfffsegkml';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_eNcOoXgv1AtzKfklcvjh7g_I5LUpOWd';

async function setupAuthHook() {
  console.log('🚀 Setting up Supabase Auth Hook via Management API...\n');
  
  // First, let's check if we can access the database
  console.log('1️⃣ Testing database access...');
  
  try {
    // Test query to check access
    const testResponse = await fetch(
      `https://${SUPABASE_PROJECT_REF}.supabase.co/rest/v1/rpc`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          /* Test query */
        })
      }
    );
    
    console.log('   Database access:', testResponse.ok ? '✅ Connected' : '❌ Failed');
    
  } catch (error) {
    console.log('   ⚠️  Cannot directly execute SQL via API');
  }
  
  // Since direct SQL execution is limited, let's create a migration file
  console.log('\n2️⃣ Creating migration file...');
  
  const migrationSQL = `
-- Supabase Auth Hook for Unione.io Email Service
-- ==============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS http;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS auth.send_email_via_unione CASCADE;

-- Create the auth hook function
CREATE OR REPLACE FUNCTION auth.send_email_via_unione(
  user_email text,
  email_type text,
  email_data jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
DECLARE
  api_key text := '6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme';
  api_url text := 'https://us1.unione.io/en/transactional/api/v1/email/send.json';
  subject text;
  html_body text;
  text_body text;
  confirmation_url text;
  request_id bigint;
BEGIN
  -- Extract confirmation URL
  confirmation_url := email_data->>'confirmation_url';
  
  -- Set email content based on type
  CASE email_type
    WHEN 'signup', 'magiclink' THEN
      subject := 'Sign in to Spicebush Montessori Admin';
      html_body := '<h2>Sign in to Spicebush Montessori</h2>' ||
                   '<p>Click below to sign in:</p>' ||
                   '<p><a href="' || confirmation_url || '" style="display:inline-block;padding:12px 30px;background:#4a7c59;color:white;text-decoration:none;border-radius:5px;">Sign In</a></p>' ||
                   '<p>This link expires in 1 hour.</p>';
      text_body := 'Sign in to Spicebush Montessori\n\n' ||
                   'Visit: ' || confirmation_url || '\n\n' ||
                   'This link expires in 1 hour.';
                   
    WHEN 'recovery' THEN
      subject := 'Reset your password';
      html_body := '<h2>Reset Your Password</h2>' ||
                   '<p>Click below to reset your password:</p>' ||
                   '<p><a href="' || confirmation_url || '" style="display:inline-block;padding:12px 30px;background:#4a7c59;color:white;text-decoration:none;border-radius:5px;">Reset Password</a></p>';
      text_body := 'Reset your password: ' || confirmation_url;
      
    ELSE
      subject := 'Spicebush Montessori School';
      html_body := COALESCE(email_data->>'html_body', 'Email from Spicebush Montessori');
      text_body := COALESCE(email_data->>'text_body', 'Email from Spicebush Montessori');
  END CASE;
  
  -- Send via Unione.io
  SELECT net.http_post(
    url := api_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-API-KEY', api_key
    ),
    body := jsonb_build_object(
      'message', jsonb_build_object(
        'from_email', 'noreply@spicebushmontessori.org',
        'from_name', 'Spicebush Montessori School',
        'subject', subject,
        'body', jsonb_build_object(
          'html', html_body,
          'plaintext', text_body
        ),
        'recipients', jsonb_build_array(
          jsonb_build_object('email', user_email)
        )
      )
    )::text
  ) INTO request_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message_id', request_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Email send failed: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION auth.send_email_via_unione TO postgres, service_role, supabase_auth_admin;

-- Create auth hook configuration
-- Note: This part must be done in Supabase Dashboard
-- Go to Authentication > Hooks > Enable Email Hook > Select auth.send_email_via_unione
`;

  // Save migration file
  const fs = await import('fs/promises');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const migrationPath = `./supabase/migrations/${timestamp}_auth_hook_unione.sql`;
  
  await fs.writeFile(migrationPath, migrationSQL);
  console.log(`   ✅ Migration file created: ${migrationPath}`);
  
  // Provide instructions for manual execution
  console.log('\n📋 Manual Setup Required:\n');
  console.log('Option 1: Supabase Dashboard (Recommended)');
  console.log('==========================================');
  console.log('1. Go to: https://supabase.com/dashboard/project/xnzweuepchbfffsegkml/sql/new');
  console.log('2. Copy and paste the SQL from:');
  console.log(`   ${migrationPath}`);
  console.log('3. Click "Run" to execute');
  console.log('4. Go to: Authentication → Hooks');
  console.log('5. Enable "Email Hook"');
  console.log('6. Select: auth.send_email_via_unione');
  console.log('7. Save\n');
  
  console.log('Option 2: Supabase CLI');
  console.log('======================');
  console.log('1. Install Supabase CLI: npm install -g supabase');
  console.log('2. Link project: supabase link --project-ref xnzweuepchbfffsegkml');
  console.log('3. Run migration: supabase db push');
  console.log('4. Configure hook in dashboard as above\n');
  
  // Create a test function
  console.log('3️⃣ Creating test function...');
  
  const testSQL = `
-- Test the email function
SELECT auth.send_email_via_unione(
  'test@spicebushmontessori.org',
  'magiclink',
  jsonb_build_object(
    'confirmation_url', 'https://spicebush-testing.netlify.app/test-link'
  )
) as result;
`;
  
  await fs.writeFile('./scripts/test-auth-hook.sql', testSQL);
  console.log('   ✅ Test SQL created: ./scripts/test-auth-hook.sql');
  
  console.log('\n✅ Setup files created successfully!');
  console.log('   Please follow the manual steps above to complete the configuration.');
}

// Run setup
setupAuthHook().catch(console.error);