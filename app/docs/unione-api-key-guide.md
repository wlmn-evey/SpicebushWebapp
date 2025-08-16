# Getting a Valid Unione.io API Key

## Problem
The API keys provided are invalid:
- `6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme` - Invalid
- `6rtwau1npm9161y9g4fmezdc7zpbx8phthop6rsa` - Invalid

Both keys return "API key validation failed" errors.

## Solution: Create a New Unione.io Account

### Step 1: Sign Up
1. Go to: https://unione.io/en/signup
2. **IMPORTANT**: Select **United States** region
3. Create account with email: admin@spicebushmontessori.org
4. Verify your email

### Step 2: Get Your API Key
1. Log in to Unione.io
2. Go to: Account → API Access
3. Click "Generate New API Key"
4. Name it: "Spicebush Website"
5. Copy the ENTIRE key (it's long!)

### Step 3: Verify the Key Format
A valid Unione.io API key should:
- Be 40+ characters long
- Contain only letters and numbers
- Look like: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 4: Test the Key
Before adding to Netlify, test locally:
```bash
# Update .env.local with new key
UNIONE_API_KEY=your_new_key_here

# Test it
node scripts/test-email.cjs
```

Should see:
```
✅ API key is valid
Account email: your@email.com
Account status: active
```

### Step 5: Add Domain Verification
1. In Unione.io dashboard: Settings → Domains
2. Add: spicebushmontessori.org
3. Add DNS records they provide to your domain
4. Wait for verification

## Alternative: Contact Unione Support

If you have an existing account but the key isn't working:
- Email: support@unione.io
- Include your account email
- Ask for help verifying your API key

## What the API Key is For

The Unione.io API key is required for:
- Sending magic link emails to administrators
- Password reset emails (if implemented)
- Any transactional emails from the website

Without a valid key:
- Admin login won't work (no magic links sent)
- Contact forms may not send notifications
- Tour scheduling confirmations won't be sent

## Current Status

✅ **Working:**
- All visual fixes (header, footer, logo, etc.)
- Database connection (once env vars added)
- Public pages and content

❌ **Not Working (needs valid API key):**
- Admin magic link login
- Email notifications
- Contact form emails

## Next Steps

1. Create Unione.io account (or fix existing one)
2. Get valid API key
3. Test locally with scripts/test-email.cjs
4. Add to Netlify environment variables
5. Deploy and verify