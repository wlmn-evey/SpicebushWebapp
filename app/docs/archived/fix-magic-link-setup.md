# Fix Magic Link - Environment Variable Setup

## Problem
The magic link functionality is not working because Supabase environment variables are missing in Netlify.

## Root Cause
- The Supabase client cannot initialize without `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`
- These environment variables are not set in the Netlify deployment
- This causes the magic link button to do nothing when clicked

## Solution

### Option 1: Via Netlify Dashboard (Recommended)

1. Go to: https://app.netlify.com/projects/spicebush-testing
2. Navigate to: **Site configuration** → **Environment variables**
3. Click **Add a variable** and add each of these:

#### Required Variables:
```
PUBLIC_SUPABASE_URL = [copy from .env.local]
PUBLIC_SUPABASE_ANON_KEY = [copy from .env.local]
SUPABASE_SERVICE_ROLE_KEY = [copy from .env.local]
PUBLIC_SITE_URL = https://spicebush-testing.netlify.app
```

#### Optional but Recommended:
```
DATABASE_URL = [copy from .env.local]
DIRECT_URL = [copy from .env.local]
```

4. For each variable:
   - Key: Enter the variable name exactly as shown
   - Values: Paste the value from your `.env.local` file
   - Scopes: Select all (Deploy Previews, Branch deploys, Production)

5. Click **Save** after adding all variables

### Option 2: Via Netlify CLI

Due to current CLI issues, use this format:

```bash
# First, link to the site
npx netlify link --id 27a429f4-9a58-4421-bc1f-126d70d81aa1

# Then set each variable
npx netlify env:set PUBLIC_SUPABASE_URL "your-url-here"
npx netlify env:set PUBLIC_SUPABASE_ANON_KEY "your-key-here"
npx netlify env:set SUPABASE_SERVICE_ROLE_KEY "your-service-key-here"
npx netlify env:set PUBLIC_SITE_URL "https://spicebush-testing.netlify.app"
```

## After Setting Variables

1. **Trigger a new deployment**:
   ```bash
   git commit --allow-empty -m "Trigger deployment with env vars" && git push
   ```

2. **Or via Netlify Dashboard**:
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Deploy site**

3. **Verify the fix**:
   - Wait for deployment to complete (2-3 minutes)
   - Visit: https://spicebush-testing.netlify.app/auth/magic-login
   - Enter an admin email (@spicebushmontessori.org or @eveywinters.com)
   - Click "Send Magic Link"
   - You should see the success message

## Testing Script

After deployment, run this to verify:
```bash
node scripts/check-supabase-config.js
```

## Expected Result
- Magic link emails will be sent via Supabase's default email service
- Users will receive an email with a login link
- The success message will show after clicking "Send Magic Link"

## Note
The browser extension errors you saw are unrelated to this issue and can be ignored. They come from password managers or other browser extensions trying to interact with the form.