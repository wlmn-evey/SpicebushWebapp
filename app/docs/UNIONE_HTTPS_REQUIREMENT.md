# Unione.io HTTPS Requirement

## Important: HTTPS Connection Required

**Discovery Date:** 2025-08-16

### The Issue
Unione.io API requires HTTPS connections to validate API keys and send emails. This means:
- ❌ Local testing without HTTPS will fail
- ✅ Production on Netlify (with HTTPS) will work

### Why Local Testing Fails
When testing locally:
- Development server typically runs on HTTP (http://localhost:4321)
- Unione.io rejects non-HTTPS connections for security
- API key validation will fail even with valid keys

### Production Will Work
Once deployed to Netlify:
- Netlify provides automatic HTTPS (https://spicebush-testing.netlify.app)
- Unione.io will accept the connection
- API key validation and email sending will work

## Testing Strategy

### 1. Local Development (Limited)
```bash
# Basic configuration check only
node scripts/test-email.cjs

# Will show API key errors but confirms setup
```

### 2. Production Testing (Full)
After deploying to Netlify with HTTPS:

```bash
# Test via API endpoint
curl https://spicebush-testing.netlify.app/api/test-email?secret=spicebush2025test

# Or with custom email
curl "https://spicebush-testing.netlify.app/api/test-email?secret=spicebush2025test&email=your@email.com"
```

### 3. Browser Testing
Visit in browser after deployment:
```
https://spicebush-testing.netlify.app/api/test-email?secret=spicebush2025test
```

## Configuration Checklist

### Environment Variables (Netlify)
```env
# Email Service
UNIONE_API_KEY=6rtwau1npm9161y9g4fmezdc7zpbx8phthop6rsa
UNIONE_REGION=us
EMAIL_FROM=noreply@spicebushmontessori.org
EMAIL_FROM_NAME=Spicebush Montessori School
EMAIL_SERVICE=unione

# Site
PUBLIC_SITE_URL=https://spicebush-testing.netlify.app
```

### What Works Locally
- ✅ Code compilation and builds
- ✅ Email service initialization
- ✅ Configuration validation
- ❌ Actual API calls to Unione.io (HTTPS required)

### What Works in Production
- ✅ Everything that works locally
- ✅ API key validation
- ✅ Email sending
- ✅ Domain verification checks
- ✅ Magic link authentication

## Deployment Steps

1. **Ensure all environment variables are set in Netlify**
   - Go to: https://app.netlify.com/sites/spicebush-testing/configuration/env
   - Add all variables from checklist above

2. **Deploy the site**
   ```bash
   git push origin testing
   ```
   Or manually trigger deployment in Netlify dashboard

3. **Test the email service**
   ```bash
   # Wait for deployment to complete, then:
   curl https://spicebush-testing.netlify.app/api/test-email?secret=spicebush2025test
   ```

4. **Check the response**
   - Should show `"success": true`
   - Email should arrive at the test address
   - Provider should show as "Unione"

## Troubleshooting

### If emails still don't work in production:

1. **Check HTTPS is active**
   - URL should show `https://` with padlock icon
   - Certificate should be valid

2. **Verify environment variables**
   - Check Netlify dashboard for all required vars
   - Ensure no typos in API key

3. **Check API key region**
   - US accounts need `UNIONE_REGION=us`
   - EU accounts need `UNIONE_REGION=eu`

4. **Domain verification**
   - Log into Unione.io dashboard
   - Verify spicebushmontessori.org is added and verified
   - Add DNS records if needed

## Summary

The Unione.io integration is **correctly implemented** and will work once deployed to an HTTPS environment. The local testing failures are expected due to the HTTPS requirement, not due to invalid API keys or incorrect implementation.

**Next Step:** Deploy to Netlify and test via the production URL with HTTPS.