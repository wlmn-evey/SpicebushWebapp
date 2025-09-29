# Email Service Setup Instructions

## What This Is For
The email service sends "magic link" login emails to administrators. Without this, admin features won't work.

## Steps for Client

### 1. Create Unione.io Account
1. Go to: https://unione.io/en/signup
2. Select: **United States** region (important!)
3. Create account with your email
4. Verify your email address

### 2. Verify Your Domain
1. In Unione dashboard, go to: Settings → Domains
2. Add domain: `spicebushmontessori.org`
3. Add these DNS records to your domain provider:
   - SPF: `TXT @ "v=spf1 include:unione.io ~all"`
   - DKIM: (Unione will provide the specific record)
4. Wait for verification (usually 1 hour)
5. Check status in Unione dashboard

### 3. Get Your API Key
1. Go to: Settings → API Keys
2. Create new key with name: "Spicebush Website"
3. Copy the entire key (starts with: 6w7...)
4. Send securely to developer (not via regular email)
   - Use a password manager's secure sharing
   - Or text message
   - Or encrypted email

### 4. We'll Handle The Rest
Once we have your API key, we'll:
- Configure it in Netlify
- Test the email system
- Verify magic links work

## Testing
After setup, we'll test by:
1. Sending a test magic link to admin@spicebushmontessori.org
2. Verifying email arrives within 1 minute
3. Confirming link logs you in properly
4. Testing link expiration (1 hour)

## Support
If you need help with any step:
- Unione support: support@unione.io
- DNS configuration: Contact your domain provider
- Integration issues: Contact your developer