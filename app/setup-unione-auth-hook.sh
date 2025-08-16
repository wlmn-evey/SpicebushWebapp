#!/bin/bash

echo "🚀 Supabase Auth Hook Setup for Unione.io"
echo "========================================"
echo ""
echo "This script will guide you through setting up the auth hook."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Open Supabase SQL Editor${NC}"
echo "1. Go to: https://supabase.com/dashboard/project/xnzweuepchbfffsegkml/sql/new"
echo "2. Click 'New query'"
echo ""
echo "Press Enter when the SQL editor is open..."
read

echo -e "${YELLOW}Step 2: Copy and Run the SQL${NC}"
echo "Copy all the SQL below and paste it into the editor:"
echo ""
echo "============ COPY EVERYTHING BELOW THIS LINE ============"
cat << 'EOF'
-- Supabase Auth Hook for Unione.io
-- =================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS http;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the auth hook function
CREATE OR REPLACE FUNCTION auth.send_email_via_unione(
  user_email text,
  email_type text,
  email_data jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  -- Extract URL from email data
  confirmation_url := COALESCE(
    email_data->>'confirmation_url',
    email_data->>'verify_url',
    email_data->>'recovery_url',
    ''
  );
  
  -- Build email content based on type
  IF email_type = 'signup' OR email_type = 'magiclink' OR email_type = 'signin' THEN
    subject := 'Sign in to Spicebush Montessori Admin';
    html_body := format(
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#2c5530">Sign in to Spicebush Montessori</h2>
      <p>Click the button below to sign in to your admin account:</p>
      <p style="text-align:center">
        <a href="%s" style="display:inline-block;padding:12px 30px;background:#4a7c59;color:white;text-decoration:none;border-radius:5px">Sign In</a>
      </p>
      <p style="color:#666;font-size:14px">This link expires in 1 hour.</p>
      <p style="color:#666;font-size:14px">If you didn''t request this, please ignore this email.</p>
      </div>',
      confirmation_url
    );
    text_body := format(
      E'Sign in to Spicebush Montessori\n\nClick here to sign in:\n%s\n\nThis link expires in 1 hour.',
      confirmation_url
    );
    
  ELSIF email_type = 'recovery' OR email_type = 'reset' THEN
    subject := 'Reset your password';
    html_body := format(
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#2c5530">Reset Your Password</h2>
      <p>Click the button below to reset your password:</p>
      <p style="text-align:center">
        <a href="%s" style="display:inline-block;padding:12px 30px;background:#4a7c59;color:white;text-decoration:none;border-radius:5px">Reset Password</a>
      </p>
      <p style="color:#666;font-size:14px">This link expires in 1 hour.</p>
      </div>',
      confirmation_url
    );
    text_body := format(
      E'Reset your password\n\nClick here:\n%s\n\nThis link expires in 1 hour.',
      confirmation_url
    );
    
  ELSE
    -- Generic email
    subject := COALESCE(email_data->>'subject', 'Spicebush Montessori School');
    html_body := COALESCE(email_data->>'html_body', 'Message from Spicebush Montessori');
    text_body := COALESCE(email_data->>'text_body', 'Message from Spicebush Montessori');
  END IF;
  
  -- Send email via Unione.io
  SELECT net.http_post(
    url := api_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-API-KEY', api_key
    )::jsonb,
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
          jsonb_build_object(
            'email', user_email,
            'substitutions', '{}'::jsonb
          )
        )
      )
    )::text
  ) INTO request_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message_id', request_id::text
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't break auth flow
  RAISE WARNING 'Unione.io email failed: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION auth.send_email_via_unione TO postgres, service_role;

-- Test the function
SELECT auth.send_email_via_unione(
  'test@spicebushmontessori.org',
  'magiclink',
  jsonb_build_object(
    'confirmation_url', 'https://example.com/test-magic-link'
  )
) as test_result;
EOF
echo "============ COPY EVERYTHING ABOVE THIS LINE ============"
echo ""
echo "3. Click 'Run' in the SQL editor"
echo "4. You should see a success message with test_result"
echo ""
echo "Press Enter after running the SQL..."
read

echo -e "${YELLOW}Step 3: Configure the Auth Hook${NC}"
echo "1. Go to: https://supabase.com/dashboard/project/xnzweuepchbfffsegkml/auth/hooks"
echo "2. Find 'Email Hook' section"
echo "3. Toggle 'Enable Email Hook' to ON"
echo "4. In the dropdown, select: auth.send_email_via_unione"
echo "5. Click 'Save'"
echo ""
echo "Press Enter after configuring the hook..."
read

echo -e "${YELLOW}Step 4: Test Magic Link${NC}"
echo "1. Go to: https://spicebush-testing.netlify.app/auth/magic-login"
echo "2. Enter your admin email"
echo "3. Click 'Send Magic Link'"
echo "4. Check your email - it should come from noreply@spicebushmontessori.org"
echo ""

echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "All authentication emails will now be sent via Unione.io!"
echo ""
echo "To verify emails are being sent:"
echo "1. Check your Unione.io dashboard for sent emails"
echo "2. Look in Supabase logs for any errors"
echo ""
echo "To disable the hook:"
echo "1. Go to Authentication → Hooks"
echo "2. Toggle 'Enable Email Hook' to OFF"