# Unione.io Email Setup Instructions

## Current Status
- ✅ Unione.io integration code is complete
- ✅ API key is configured
- ❌ Authentication error (user not found)

## Setup Steps Required

### 1. Verify Your Unione.io Account
The error "User with id '7046704' not found" suggests:
- The API key might be from a different account
- The account might not be activated
- The region might be incorrect (currently set to EU)

### 2. Domain Verification
Before sending emails from `noreply@spicebushmontessori.org`, you need to:

1. **Log into Unione.io Dashboard**
   - EU: https://eu1.unione.io/
   - US: https://us1.unione.io/

2. **Add and Verify Domain**
   - Go to Settings → Sending Domains
   - Add `spicebushmontessori.org`
   - Add the required DNS records:
     - SPF record
     - DKIM records
     - DMARC (optional but recommended)

3. **Verify API Key**
   - Go to Settings → API Keys
   - Confirm the key matches: `6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme`
   - Note which region (EU or US) your account is in

### 3. Update Configuration if Needed
If your account is in the US region, update `.env.local`:
```
UNIONE_REGION=us
```

### 4. Test Email Sending
Once domain is verified:
```bash
node scripts/send-unione-email-direct.js
```

## Alternative: Use Supabase Email for Magic Links
While setting up Unione.io, magic links can work with Supabase's built-in email:
- Magic links will be sent from Supabase's default email
- Other emails (contact form, etc.) will use Unione.io once configured

## Troubleshooting
- **401 Error**: Check API key and account status
- **403 Error**: Domain not verified
- **Rate limits**: Check Unione.io dashboard for limits

## Support
- Unione.io Support: https://eu1.unione.io/en/support
- API Documentation: https://docs.unione.io/