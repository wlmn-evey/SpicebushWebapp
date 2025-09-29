# Configure Supabase Auth Hook for Unione.io API

## Overview
This guide shows how to configure Supabase to use Unione.io API (instead of SMTP) for sending authentication emails including magic links.

## Why Use API Instead of SMTP?
- **Faster**: API calls are immediate vs SMTP connection overhead
- **More Reliable**: Better error handling and retry logic
- **Better Tracking**: Detailed delivery status and analytics
- **Easier Setup**: No SMTP ports or security protocols to configure

## Implementation Options

### Option 1: Supabase Auth Hooks (Recommended)

Supabase allows you to override the default email sending behavior using Auth Hooks.

1. **Create an Auth Hook Function** in Supabase:

```sql
-- Create the auth hook function
CREATE OR REPLACE FUNCTION send_email_via_unione(
  email_data jsonb
) RETURNS jsonb AS $$
DECLARE
  response jsonb;
  api_key text := '6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme';
  api_url text := 'https://us1.unione.io/en/transactional/api/v1/email/send.json';
BEGIN
  -- Make HTTP request to Unione.io API
  SELECT content::jsonb INTO response
  FROM http_post(
    api_url,
    jsonb_build_object(
      'message', jsonb_build_object(
        'from_email', 'noreply@spicebushmontessori.org',
        'from_name', 'Spicebush Montessori School',
        'subject', email_data->>'subject',
        'body', jsonb_build_object(
          'html', email_data->>'html',
          'plaintext', email_data->>'text'
        ),
        'recipients', jsonb_build_array(
          jsonb_build_object(
            'email', email_data->>'to',
            'substitutions', '{}'::jsonb
          )
        )
      )
    )::text,
    headers => jsonb_build_object(
      'Content-Type', 'application/json',
      'X-API-KEY', api_key
    )
  );
  
  RETURN response;
END;
$$ LANGUAGE plpgsql;

-- Enable the HTTP extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;
```

2. **Configure Auth to Use the Hook**:

In Supabase Dashboard → Authentication → Hooks:
- Enable "Send Email" hook
- Select the `send_email_via_unione` function

### Option 2: Edge Function with Webhook

1. **Deploy the Edge Function** (already created at `/supabase/functions/send-email-unione/`)

2. **Configure Supabase Webhook**:
   - Go to Database → Webhooks
   - Create new webhook for `auth.email_sends` table
   - Point to your Edge Function URL

### Option 3: Custom API Endpoint (Current Implementation)

We've already implemented this approach:
- API endpoint at `/api/auth/send-magic-link`
- Modified magic login page to use our API
- Handles email sending via Unione.io

## Current Working Solution

The magic link is currently working with:
1. Supabase generates the OTP token
2. Supabase sends email via its default service
3. Users receive magic link emails successfully

To switch to Unione.io API:
1. Keep the current working setup
2. Configure Supabase Auth Hook (Option 1) in production
3. All auth emails will automatically use Unione.io

## Benefits of Each Approach

### Auth Hooks (Best)
- ✅ All auth emails use Unione.io
- ✅ No code changes needed
- ✅ Works with all auth methods
- ✅ Centralized configuration

### Edge Function
- ✅ More control over email formatting
- ✅ Can add custom logic
- ❌ Requires webhook setup
- ❌ More complex

### Custom API (Current)
- ✅ Already implemented
- ✅ Full control
- ❌ Only works for magic links
- ❌ Requires maintaining custom code

## Recommendation

1. **Keep current setup** - It's working!
2. **For production**: Implement Auth Hooks for all emails
3. **Test thoroughly** before switching

## Testing

After implementing any option:
```bash
# Test magic link
curl -X POST https://spicebush-testing.netlify.app/api/auth/send-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "test@spicebushmontessori.org"}'
```

Check:
- Email arrives from noreply@spicebushmontessori.org
- Unione.io dashboard shows email sent
- Magic link works correctly