# Configuring Supabase to Use Custom SMTP for Magic Links

Supabase can be configured to use custom SMTP providers for sending authentication emails, including magic links. This allows you to use Unione.io or any other email service for all authentication emails.

## Unione.io SMTP Configuration

### Step 1: Get SMTP Credentials from Unione.io

1. Log in to your Unione.io dashboard
2. Navigate to **Settings → SMTP**
3. Create SMTP credentials:
   - **SMTP Server**: 
     - EU: `smtp.eu1.unione.io`
     - US: `smtp.us1.unione.io`
   - **Port**: `587` (TLS) or `465` (SSL)
   - **Username**: Your SMTP username (provided by Unione)
   - **Password**: Your SMTP password (provided by Unione)

### Step 2: Configure Supabase

#### For Hosted Supabase (supabase.com):

1. Go to your project dashboard
2. Navigate to **Settings → Auth**
3. Scroll to **SMTP Settings**
4. Toggle "Enable Custom SMTP"
5. Enter the following:

```
Host: smtp.eu1.unione.io (or smtp.us1.unione.io)
Port: 587
Username: [Your Unione SMTP Username]
Password: [Your Unione SMTP Password]
Sender email: noreply@yourdomain.org
Sender name: Spicebush Montessori
```

6. Click "Save"

#### For Self-Hosted Supabase:

Add these environment variables to your Supabase configuration:

```bash
# Enable custom SMTP
GOTRUE_SMTP_HOST=smtp.eu1.unione.io
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=your-smtp-username
GOTRUE_SMTP_PASS=your-smtp-password
GOTRUE_SMTP_ADMIN_EMAIL=noreply@yourdomain.org
GOTRUE_MAILER_AUTOCONFIRM=false
GOTRUE_SMTP_MAX_FREQUENCY=1s
```

## Alternative: Using the Email Service API

If you prefer to keep using Supabase's default email system and only use custom email for other transactional emails, you can:

1. Let Supabase handle magic links with their built-in email
2. Use the custom email service for:
   - Contact form notifications
   - Tour scheduling confirmations
   - Newsletter subscriptions
   - Other transactional emails

## Email Templates

When using custom SMTP, you can customize the email templates in Supabase:

1. Go to **Authentication → Email Templates**
2. Customize the following templates:
   - Magic Link
   - Confirm Email
   - Reset Password
   - Change Email

### Example Magic Link Template:

```html
<h2>Magic Link for Spicebush Montessori</h2>
<p>Hello,</p>
<p>You requested a magic link to sign in to the Spicebush Montessori admin panel.</p>
<p><a href="{{ .ConfirmationURL }}">Click here to sign in</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request this, please ignore this email.</p>
<p>Best regards,<br>Spicebush Montessori Team</p>
```

## Testing the Configuration

After configuring custom SMTP:

1. Test magic link authentication:
   ```bash
   npm run dev
   # Visit /auth/login and request a magic link
   ```

2. Check email delivery:
   - Verify the email arrives
   - Check that links work correctly
   - Ensure proper formatting

3. Monitor delivery:
   - Check Unione.io dashboard for sent emails
   - Verify delivery rates
   - Monitor for any bounces or issues

## Troubleshooting

### Emails not sending?
- Verify SMTP credentials are correct
- Check Unione.io dashboard for any errors
- Ensure sender domain is verified
- Check Supabase logs for SMTP errors

### Authentication failing?
- Ensure redirect URLs are correctly configured in Supabase
- Verify the site URL matches in Supabase settings
- Check that email templates have correct variables

### Rate limiting issues?
- Unione.io SMTP allows up to 5000 emails/hour per connection
- Adjust `GOTRUE_SMTP_MAX_FREQUENCY` if needed
- Consider implementing rate limiting in your application

## Benefits of Custom SMTP

1. **Unified email management** - All emails go through one provider
2. **Better deliverability** - Use a specialized email service
3. **Advanced analytics** - Track open rates, clicks, etc.
4. **Consistent branding** - Full control over email templates
5. **Cost efficiency** - May be more cost-effective at scale