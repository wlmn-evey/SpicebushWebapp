
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
      text_body := 'Sign in to Spicebush Montessori

' ||
                   'Visit: ' || confirmation_url || '

' ||
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
