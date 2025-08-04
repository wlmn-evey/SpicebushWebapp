# Email Service Setup Guide

Email functionality is **CRITICAL** for the Spicebush Montessori application to work properly. Without it:
- ❌ Magic link authentication won't work
- ❌ Admin panel will be inaccessible  
- ❌ Contact forms can't send notifications
- ❌ Tour scheduling confirmations can't be sent

## Quick Setup (5 minutes)

### Option 1: Unione.io (Recommended - No Package Installation Required)

1. **Sign up at [unione.io](https://unione.io)** (free tier available)

2. **Verify your sender domain**
   - Dashboard → Sending Domains → Add Domain
   - Follow DNS verification steps

3. **Create an API key:**
   - Settings → API Keys → Create New Key
   - Copy the key

4. **Add to your `.env` file:**
   ```bash
   UNIONE_API_KEY=your-api-key-here
   EMAIL_FROM=noreply@yourdomain.org
   EMAIL_FROM_NAME=Spicebush Montessori
   UNIONE_REGION=eu  # or 'us' for US region
   ```

5. **Test the configuration:**
   ```bash
   npm run test:email
   ```

   ✅ **No package installation required** - Unione.io uses the native fetch API

### Option 2: Resend (Also Recommended for Quick Setup)

1. **Sign up at [resend.com](https://resend.com)** (free tier available)

2. **Verify your domain** or use their test domain

3. **Create an API key:**
   - Go to API Keys → Create API Key
   - Copy the key (starts with `re_`)

4. **Add to your `.env` file:**
   ```bash
   RESEND_API_KEY=re_your-api-key-here
   EMAIL_FROM=noreply@yourdomain.org
   ```

5. **Install the package:**
   ```bash
   npm install resend
   ```

6. **Test the configuration:**
   ```bash
   npm run test:email
   ```

### Option 3: SendGrid

1. **Sign up at [sendgrid.com](https://sendgrid.com)** (free tier: 100 emails/day)

2. **Verify your sender identity:**
   - Settings → Sender Authentication
   - Add either a single sender or domain

3. **Create an API key:**
   - Settings → API Keys → Create API Key
   - Choose "Full Access" for initial setup
   - Copy the key (starts with `SG.`)

4. **Add to your `.env` file:**
   ```bash
   SENDGRID_API_KEY=SG.your-api-key-here
   EMAIL_FROM=noreply@yourdomain.org
   EMAIL_FROM_NAME=Spicebush Montessori
   ```

5. **Install the package:**
   ```bash
   npm install @sendgrid/mail
   ```

6. **Test the configuration:**
   ```bash
   npm run test:email
   ```

### Option 4: Postmark

1. **Sign up at [postmarkapp.com](https://postmarkapp.com)**

2. **Verify your domain**

3. **Get your Server API token**

4. **Add to your `.env` file:**
   ```bash
   POSTMARK_SERVER_TOKEN=your-server-token
   POSTMARK_FROM_EMAIL=noreply@yourdomain.org
   ```

5. **Install the package:**
   ```bash
   npm install postmark
   ```

6. **Test the configuration:**
   ```bash
   npm run test:email
   ```

## Testing Your Setup

We've created a test script to verify your email configuration:

```bash
# Run the email service tester
node scripts/test-email-service.js
```

This will:
- ✅ Check which email services are configured
- ✅ Send a test email
- ✅ Provide setup instructions if needed

## Production Deployment

### For Netlify:

1. Go to Site Settings → Environment Variables
2. Add your email service variables
3. Mark API keys as "Secret"
4. Redeploy your site

### Environment Variables Required:

Choose ONE of these sets:

**Unione.io:**
- `UNIONE_API_KEY` (secret)
- `EMAIL_FROM`
- `EMAIL_FROM_NAME` (optional)
- `UNIONE_REGION` (optional, defaults to 'eu', can be 'us')

**Resend:**
- `RESEND_API_KEY` (secret)
- `EMAIL_FROM`

**SendGrid:**
- `SENDGRID_API_KEY` (secret)
- `EMAIL_FROM`
- `EMAIL_FROM_NAME` (optional)

**Postmark:**
- `POSTMARK_SERVER_TOKEN` (secret)
- `POSTMARK_FROM_EMAIL`

## Troubleshooting

### Email not sending?

1. **Check your email service dashboard** for failed sends
2. **Verify domain/sender** is authenticated
3. **Check API key permissions**
4. **Run the test script** to diagnose

### Magic links not working?

1. **Ensure email service is configured**
2. **Check Supabase settings** for correct redirect URLs
3. **Verify admin emails** are in the allowed list
4. **Check spam folder** for magic link emails

### Need help?

Run the diagnostic script:
```bash
node scripts/test-email-service.js
```

This will identify what's missing and provide specific instructions.

## Security Notes

- Never commit API keys to git
- Use environment variables for all secrets
- In production, restrict API key permissions to only what's needed
- Monitor your email service dashboard for unusual activity