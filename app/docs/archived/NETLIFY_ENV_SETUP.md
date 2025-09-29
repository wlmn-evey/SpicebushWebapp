# Netlify Environment Variables Setup

## Manual Setup Required

Since the Netlify CLI has issues with setting environment variables programmatically, you'll need to add them manually through the Netlify dashboard.

## Steps:

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com/projects/spicebush-testing
   - Or go to app.netlify.com and select your site

2. **Navigate to Environment Variables**
   - Click on "Site configuration" in the left sidebar
   - Click on "Environment variables"
   - Or go directly to: Site Settings → Environment Variables

3. **Add Each Variable**
   Click "Add a variable" and add each of these:

   - `PUBLIC_CLERK_PUBLISHABLE_KEY` (Value starts with: pk_live_...)
   - `CLERK_SECRET_KEY` (Value starts with: sk_live_...)
   - `PUBLIC_CLERK_SIGN_IN_URL` = `/auth/sign-in`
   - `PUBLIC_CLERK_SIGN_UP_URL` = `/auth/sign-up`
   - `PUBLIC_CLERK_AFTER_SIGN_IN_URL` = `/admin`
   - `PUBLIC_CLERK_AFTER_SIGN_UP_URL` = `/admin`

4. **Deploy the Site**
   - After adding all variables, trigger a new deployment
   - You can do this by pushing a commit or clicking "Trigger deploy" in Netlify

## Important Security Notes:
- Never commit API keys to git
- Always use environment variables for sensitive data
- The keys have been provided to you separately for security

## Verification:
After deployment, visit your site and test the authentication at:
- https://spicebush-testing.netlify.app/auth/sign-in