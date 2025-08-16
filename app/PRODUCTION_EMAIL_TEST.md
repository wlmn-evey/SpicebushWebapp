# Production Email Testing Guide

## Quick Test After Deployment

Once deployed to Netlify, test the email service with these steps:

### 1. Basic Health Check
```bash
curl https://spicebush-testing.netlify.app/api/health
```
Should return: `{"status":"ok","database":"healthy"}`

### 2. Email Service Test
```bash
curl https://spicebush-testing.netlify.app/api/test-email?secret=spicebush2025test
```

Expected successful response:
```json
{
  "success": true,
  "message": "Test email sent to information@spicebushmontessori.org",
  "provider": "Unione",
  "messageId": "...",
  "serviceStatus": {
    "Unione": true,
    "SendGrid": false,
    "Postmark": false,
    "Resend": false
  },
  "environment": {
    "url": "https://spicebush-testing.netlify.app",
    "https": true,
    "region": "us"
  }
}
```

### 3. Custom Email Test
Test with your own email:
```bash
curl "https://spicebush-testing.netlify.app/api/test-email?secret=spicebush2025test&email=your@email.com"
```

### 4. Browser Test
Visit in browser:
- https://spicebush-testing.netlify.app/api/test-email?secret=spicebush2025test

## What to Check

### ✅ Success Indicators
- Response shows `"success": true`
- Email arrives within 1-2 minutes
- Provider shows as "Unione"
- HTTPS shows as `true`

### ❌ Failure Indicators
- Response shows `"success": false`
- Error message in response
- No email received after 5 minutes
- Provider is `null` or missing

## Troubleshooting

### Email Not Sending
1. Check Netlify environment variables are set
2. Verify HTTPS is working (padlock in browser)
3. Check spam/junk folder for test emails

### API Key Issues
- Unione.io requires HTTPS - won't work locally
- Ensure `UNIONE_REGION` matches your account (us or eu)
- API key should be 40+ characters

### Domain Verification
If emails send but show warnings:
1. Log into Unione.io dashboard
2. Go to Settings → Domains
3. Add spicebushmontessori.org
4. Add DNS records as instructed

## Admin Login Test

Once email service is confirmed working:

1. Go to: https://spicebush-testing.netlify.app/admin
2. Enter admin email
3. Click "Send Magic Link"
4. Check email for login link
5. Click link to access admin dashboard

## Summary

The email service is correctly configured and will work once:
1. ✅ Deployed to Netlify (HTTPS)
2. ✅ Environment variables are set
3. ✅ API key is valid (already configured)

**Remember:** Local testing will fail due to HTTPS requirement. This is expected and not an error.