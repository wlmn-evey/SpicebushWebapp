-- =====================================================
-- Supabase Auth Hook for Unione.io Email API
-- =====================================================
-- This SQL script configures Supabase to send all auth emails
-- (magic links, password resets, etc.) via Unione.io API
-- instead of the default email service.

-- Step 1: Enable required extensions
-- =====================================================
CREATE EXTENSION IF NOT EXISTS http;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Create the email sending function
-- =====================================================
CREATE OR REPLACE FUNCTION auth.send_email_via_unione(
  user_email text,
  email_type text,
  email_data jsonb
) RETURNS jsonb AS $$
DECLARE
  -- Unione.io Configuration
  api_key text := '6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme';
  api_url text := 'https://us1.unione.io/en/transactional/api/v1/email/send.json';
  
  -- Email components
  subject text;
  html_body text;
  text_body text;
  confirmation_url text;
  
  -- Response handling
  request_id bigint;
  response jsonb;
BEGIN
  -- Extract email components based on type
  CASE email_type
    WHEN 'signup' THEN
      subject := 'Confirm your email for Spicebush Montessori';
      confirmation_url := email_data->>'confirmation_url';
      html_body := format(
        '<h2>Welcome to Spicebush Montessori Admin</h2>
        <p>Please confirm your email address by clicking the link below:</p>
        <p><a href="%s" style="display:inline-block;padding:12px 30px;background-color:#4a7c59;color:white;text-decoration:none;border-radius:5px;">Confirm Email</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn''t create an account, you can safely ignore this email.</p>',
        confirmation_url
      );
      text_body := format(
        'Welcome to Spicebush Montessori Admin\n\n' ||
        'Please confirm your email address by visiting:\n%s\n\n' ||
        'This link will expire in 24 hours.\n' ||
        'If you didn''t create an account, you can safely ignore this email.',
        confirmation_url
      );
      
    WHEN 'magic_link' THEN
      subject := 'Sign in to Spicebush Montessori Admin';
      confirmation_url := email_data->>'confirmation_url';
      html_body := format(
        '<h2>Sign in to Spicebush Montessori Admin</h2>
        <p>Click the link below to sign in to your account:</p>
        <p><a href="%s" style="display:inline-block;padding:12px 30px;background-color:#4a7c59;color:white;text-decoration:none;border-radius:5px;">Sign In</a></p>
        <p>This link will expire in 1 hour for security.</p>
        <p>If you didn''t request this, you can safely ignore this email.</p>',
        confirmation_url
      );
      text_body := format(
        'Sign in to Spicebush Montessori Admin\n\n' ||
        'Click the link below to sign in:\n%s\n\n' ||
        'This link will expire in 1 hour.\n' ||
        'If you didn''t request this, you can safely ignore this email.',
        confirmation_url
      );
      
    WHEN 'recovery' THEN
      subject := 'Reset your password for Spicebush Montessori';
      confirmation_url := email_data->>'confirmation_url';
      html_body := format(
        '<h2>Reset Your Password</h2>
        <p>Click the link below to reset your password:</p>
        <p><a href="%s" style="display:inline-block;padding:12px 30px;background-color:#4a7c59;color:white;text-decoration:none;border-radius:5px;">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn''t request this, you can safely ignore this email.</p>',
        confirmation_url
      );
      text_body := format(
        'Reset Your Password\n\n' ||
        'Click the link below to reset your password:\n%s\n\n' ||
        'This link will expire in 1 hour.\n' ||
        'If you didn''t request this, you can safely ignore this email.',
        confirmation_url
      );
      
    WHEN 'invite' THEN
      subject := 'You''ve been invited to Spicebush Montessori Admin';
      confirmation_url := email_data->>'confirmation_url';
      html_body := format(
        '<h2>You''re Invited!</h2>
        <p>You''ve been invited to join the Spicebush Montessori admin panel.</p>
        <p><a href="%s" style="display:inline-block;padding:12px 30px;background-color:#4a7c59;color:white;text-decoration:none;border-radius:5px;">Accept Invitation</a></p>
        <p>This invitation will expire in 7 days.</p>',
        confirmation_url
      );
      text_body := format(
        'You''re Invited!\n\n' ||
        'You''ve been invited to join Spicebush Montessori admin.\n' ||
        'Accept your invitation:\n%s\n\n' ||
        'This invitation expires in 7 days.',
        confirmation_url
      );
      
    ELSE
      -- Default case
      subject := 'Spicebush Montessori School';
      html_body := email_data->>'html_body';
      text_body := email_data->>'text_body';
  END CASE;
  
  -- Send email via Unione.io using pg_net
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
          jsonb_build_object(
            'email', user_email,
            'substitutions', '{}'::jsonb
          )
        )
      )
    )::text
  ) INTO request_id;
  
  -- Return success (async call)
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Email queued for delivery via Unione.io',
    'request_id', request_id,
    'recipient', user_email,
    'email_type', email_type
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail auth flow
  RAISE WARNING 'Failed to send email via Unione.io: %', SQLERRM;
  
  -- Return error for monitoring
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'recipient', user_email,
    'email_type', email_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant necessary permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION auth.send_email_via_unione TO postgres, service_role;

-- Step 4: Create the auth hook
-- =====================================================
-- This needs to be configured in Supabase Dashboard:
-- 1. Go to Authentication → Hooks
-- 2. Enable "Send Email" hook
-- 3. Select function: auth.send_email_via_unione
-- 4. Save changes

-- Step 5: Test the function (optional)
-- =====================================================
-- You can test the function directly:
/*
SELECT auth.send_email_via_unione(
  'test@spicebushmontessori.org',
  'magic_link',
  jsonb_build_object(
    'confirmation_url', 'https://spicebush-testing.netlify.app/auth/callback?token=test'
  )
);
*/

-- Step 6: Monitor email delivery
-- =====================================================
-- Check pg_net._http_response table for API responses:
/*
SELECT 
  created,
  status_code,
  headers,
  content::jsonb
FROM net._http_response
ORDER BY created DESC
LIMIT 10;
*/