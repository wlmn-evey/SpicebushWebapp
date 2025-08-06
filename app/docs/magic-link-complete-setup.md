# Magic Link Complete Setup Guide

## ✅ Current Status: WORKING

The magic link functionality is now fully configured and operational on the testing site.

## Configuration Summary

### 1. Supabase Configuration ✅
- **URL**: https://xnzweuepchbfffsegkml.supabase.co
- **Anon Key**: sb_publishable_3Ja6qCU9VfJ-V68G63ZZNQ_Yc2wBvEN
- **Environment**: Properly configured in build script

### 2. Unione.io Email Service ✅
- **API Key**: 6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme
- **Region**: US (not EU)
- **Status**: Successfully tested and working
- **From Email**: noreply@spicebushmontessori.org

### 3. Build Configuration ✅
- Environment variables are exported during build via `build-with-env.sh`
- All required credentials are included
- Deployment succeeds with proper configuration

## How It Works

1. **User visits**: https://spicebush-testing.netlify.app/auth/magic-login
2. **User enters**: Admin email (@spicebushmontessori.org or @eveywinters.com)
3. **System sends**: Magic link via Supabase's email service
4. **Email arrives**: With login link valid for 1 hour
5. **User clicks**: Link and is authenticated

## Testing the Magic Link

### Quick Test
1. Visit: https://spicebush-testing.netlify.app/auth/magic-login
2. Enter: test@spicebushmontessori.org (or your admin email)
3. Click: "Send Magic Link"
4. Check: Email inbox for the magic link

### What to Expect
- **Success Message**: "Check Your Email!" appears
- **Email Sender**: Supabase (default) or Spicebush Montessori (if SMTP configured)
- **Link Format**: Contains authentication token
- **Validity**: 1 hour from sending

## Optional Enhancement: Branded Emails

To send magic links from noreply@spicebushmontessori.org:

1. **Log into Supabase Dashboard**
2. **Go to**: Settings → Authentication → SMTP Settings
3. **Configure**:
   ```
   Host: smtp.unione.io
   Port: 587
   Username: [Your Unione.io email]
   Password: 6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme
   Sender: noreply@spicebushmontessori.org
   ```

## Environment Variables (Already Set)

In `build-with-env.sh`:
```bash
# Supabase (for magic links)
PUBLIC_SUPABASE_URL="https://xnzweuepchbfffsegkml.supabase.co"
PUBLIC_SUPABASE_ANON_KEY="sb_publishable_3Ja6qCU9VfJ-V68G63ZZNQ_Yc2wBvEN"

# Unione.io (for other emails)
UNIONE_API_KEY="6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme"
UNIONE_REGION="us"
```

## Troubleshooting

### If magic link doesn't send:
1. Check browser console for errors
2. Verify email domain is authorized
3. Check Supabase dashboard for auth logs

### If email doesn't arrive:
1. Check spam folder
2. Verify email address is correct
3. Check Supabase rate limits

### Browser errors (can ignore):
- Extension errors from password managers
- These don't affect functionality

## Security Notes

- Only authorized domains can receive magic links
- Links expire after 1 hour
- Each link can only be used once
- Admin role verified after authentication

## Next Steps

1. **Production Deployment**: Move credentials to Netlify environment variables
2. **SMTP Configuration**: Set up branded emails in Supabase
3. **Email Templates**: Customize magic link email design
4. **Monitoring**: Set up email delivery tracking

The magic link system is fully operational and ready for use!