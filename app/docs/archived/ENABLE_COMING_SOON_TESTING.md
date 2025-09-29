# How to Enable Coming Soon Mode on Testing Site

## Quick Setup (2 minutes)

### Step 1: After this deployment completes
The code changes have been made to support environment-based coming soon mode.

### Step 2: Add Environment Variable in Netlify

1. Go to: https://app.netlify.com
2. Select the **spicebush-testing** site
3. Navigate to: **Site configuration** → **Environment variables**
4. Click **Add a variable**
5. Add:
   - **Key**: `COMING_SOON_MODE`
   - **Value**: `true`
   - **Scopes**: Deploy contexts → Select **All deploy contexts** (or just "Deploy previews" if you prefer)
6. Click **Save variable**

### Step 3: Trigger Redeploy

1. Go to: **Deploys** tab
2. Click **Trigger deploy** → **Clear cache and deploy site**
3. Wait for deployment to complete (2-3 minutes)

### Step 4: Verify

1. Visit: https://spicebush-testing.netlify.app
2. You should see the coming soon page
3. Admin access still works at: https://spicebush-testing.netlify.app/admin

## How It Works

- The middleware checks for `COMING_SOON_MODE` environment variable first
- If set to `true`, the site shows the coming soon page
- This overrides any database settings
- Admin paths (/admin, /auth) are still accessible
- Production site is unaffected (doesn't have this env var)

## To Disable Coming Soon Mode

1. Go back to Netlify environment variables
2. Either:
   - Delete the `COMING_SOON_MODE` variable, OR
   - Change its value to `false`
3. Trigger a redeploy

## Benefits

- ✅ No database changes needed
- ✅ Testing site can stay in coming soon mode permanently
- ✅ Easy to toggle on/off
- ✅ Production remains unaffected
- ✅ Each environment can have different settings

## Troubleshooting

**Coming soon page not showing?**
- Check that the environment variable is set correctly
- Make sure you triggered a redeploy after adding the variable
- Clear your browser cache

**Can't access admin panel?**
- The admin panel should still be accessible at /admin
- Make sure you're logged in with an admin account
- Try /auth/magic-login to get a new login link

---
*Date: August 28, 2025*
*This setup allows the testing site to display coming soon mode without affecting production.*