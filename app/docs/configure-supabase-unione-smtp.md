# Configure Supabase to Use Unione.io SMTP for Magic Links

## Overview
This guide shows how to configure Supabase to use Unione.io SMTP for sending magic link emails, providing branded email delivery instead of Supabase's default emails.

## Unione.io SMTP Settings

Based on our working configuration:
- **Region**: US (not EU)
- **API Key**: 6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme

### SMTP Configuration for Supabase

```
SMTP Host: smtp.unione.io
SMTP Port: 587 (TLS) or 465 (SSL) or 25 (unencrypted)
SMTP User: Your Unione.io account email
SMTP Password: 6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme
Sender Email: noreply@spicebushmontessori.org
Sender Name: Spicebush Montessori School
```

## Configuration Steps

### Option 1: Supabase Dashboard (Recommended)

1. **Log into Supabase Dashboard**
   - Go to your project: https://supabase.com/dashboard/project/[your-project-id]

2. **Navigate to Auth Settings**
   - Settings → Authentication → SMTP Settings

3. **Enable Custom SMTP**
   - Toggle "Enable Custom SMTP" to ON

4. **Enter Unione.io SMTP Details**:
   ```
   Host: smtp.unione.io
   Port: 587
   Username: [Your Unione.io account email]
   Password: 6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme
   Sender email: noreply@spicebushmontessori.org
   Sender name: Spicebush Montessori School
   ```

5. **Save Changes**
   - Click "Save" at the bottom of the page

### Option 2: Environment Variables (For Self-Hosted Supabase)

If using self-hosted Supabase, add these to your `.env`:

```bash
# Custom SMTP Configuration
GOTRUE_SMTP_HOST=smtp.unione.io
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=[Your Unione.io account email]
GOTRUE_SMTP_PASS=6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme
GOTRUE_SMTP_SENDER_NAME="Spicebush Montessori School"
GOTRUE_EXTERNAL_EMAIL_ENABLED=true
GOTRUE_MAILER_AUTOCONFIRM=false
```

## Email Templates

Supabase allows customizing email templates. In the dashboard:

1. Go to Authentication → Email Templates
2. Customize the Magic Link template:

```html
<h2>Sign in to Spicebush Montessori Admin</h2>
<p>Hello,</p>
<p>Follow this link to sign in to your admin account:</p>
<p><a href="{{ .ConfirmationURL }}">Sign in to Admin Panel</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request this email, you can safely ignore it.</p>
<br>
<p>Best regards,<br>Spicebush Montessori School</p>
```

## Testing

After configuration:

1. **Test Magic Link**:
   ```bash
   # Visit the magic login page
   https://spicebush-testing.netlify.app/auth/magic-login
   
   # Enter an admin email
   # Click "Send Magic Link"
   ```

2. **Verify Email Delivery**:
   - Check that email arrives from noreply@spicebushmontessori.org
   - Verify "Spicebush Montessori School" appears as sender
   - Confirm link works correctly

## Benefits of Using Unione.io SMTP

1. **Branded Emails**: All emails come from @spicebushmontessori.org
2. **Better Deliverability**: Dedicated sending reputation
3. **Email Analytics**: Track open rates and delivery status
4. **Consistent Experience**: Same email service for all communications

## Troubleshooting

- **Emails not sending**: Verify SMTP credentials in Supabase dashboard
- **SPF/DKIM issues**: Ensure domain is verified in Unione.io
- **Rate limits**: Check Unione.io dashboard for sending limits
- **Test mode**: Ensure you're not in Supabase test mode

## Current Status

- ✅ Unione.io API working (tested successfully)
- ✅ Region identified as US
- ✅ API key verified and functional
- ⏳ Awaiting SMTP configuration in Supabase dashboard