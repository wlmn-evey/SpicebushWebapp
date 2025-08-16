# Setup Instructions: Supabase Auth Hook for Unione.io

## Overview
Configure Supabase to send all authentication emails via Unione.io API instead of the default email service.

## Benefits
- ✅ All auth emails sent from your domain (noreply@spicebushmontessori.org)
- ✅ Better deliverability and tracking
- ✅ Consistent branding across all emails
- ✅ No SMTP configuration needed

## Step-by-Step Setup

### 1. Access Supabase Dashboard
Go to: https://supabase.com/dashboard/project/xnzweuepchbfffsegkml

### 2. Open SQL Editor
Navigate to: **SQL Editor** in the left sidebar

### 3. Run the Setup SQL
1. Click **New query**
2. Copy the entire contents of `/supabase/auth-hook-unione.sql`
3. Paste into the SQL editor
4. Click **Run** (or press Cmd/Ctrl + Enter)

You should see:
- "Success. No rows returned"
- Function `auth.send_email_via_unione` created

### 4. Configure Auth Hook
1. Go to: **Authentication** → **Hooks** (in left sidebar)
2. Find **Email Hook** section
3. Toggle **Enable Email Hook** to ON
4. In the dropdown, select: `auth.send_email_via_unione`
5. Click **Save**

### 5. Test the Configuration

#### Option A: Test via Magic Link
1. Visit: https://spicebush-testing.netlify.app/auth/magic-login
2. Enter: test@spicebushmontessori.org
3. Click: "Send Magic Link"
4. Check:
   - Email arrives from noreply@spicebushmontessori.org
   - "Spicebush Montessori School" shows as sender
   - Email has proper formatting

#### Option B: Test via SQL
Run this in SQL Editor:
```sql
SELECT auth.send_email_via_unione(
  'test@spicebushmontessori.org',
  'magic_link',
  jsonb_build_object(
    'confirmation_url', 'https://example.com/test-link'
  )
);
```

### 6. Monitor Email Delivery

Check delivery status in SQL Editor:
```sql
-- View recent email attempts
SELECT 
  created,
  status_code,
  content::jsonb->'status' as status,
  content::jsonb->'job_id' as job_id
FROM net._http_response
WHERE url LIKE '%unione.io%'
ORDER BY created DESC
LIMIT 10;
```

## Troubleshooting

### Emails not sending?
1. Check if hook is enabled in Auth → Hooks
2. Verify function exists: 
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'send_email_via_unione';
   ```
3. Check for errors:
   ```sql
   SELECT * FROM net._http_response WHERE status_code != 200 ORDER BY created DESC;
   ```

### Wrong email format?
- Edit the HTML templates in the SQL function
- Re-run the SQL to update

### Need to disable?
1. Go to Authentication → Hooks
2. Toggle **Enable Email Hook** to OFF
3. Emails will revert to Supabase default

## Email Types Handled

The hook automatically handles:
- ✅ **Magic Links** - Sign in without password
- ✅ **Email Confirmation** - Verify new accounts
- ✅ **Password Reset** - Forgot password flow
- ✅ **User Invitations** - Invite new admins

## Customization

To customize email templates:
1. Edit the SQL function in `/supabase/auth-hook-unione.sql`
2. Modify the HTML/text in the appropriate CASE block
3. Re-run the SQL in Supabase

## Status Check

Your current configuration:
- **Unione.io API Key**: ✅ Configured
- **Region**: US (correct)
- **From Email**: noreply@spicebushmontessori.org
- **From Name**: Spicebush Montessori School

Once the hook is enabled, all auth emails will automatically use Unione.io!