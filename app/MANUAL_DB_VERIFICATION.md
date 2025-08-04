# Manual Database Verification Checklist

## Quick Verification Steps

### 1. Check Environment Variables
```bash
# Verify these are set in your .env file:
grep -E "PUBLIC_SUPABASE_URL|PUBLIC_SUPABASE_PUBLIC_KEY|SUPABASE_SERVICE_ROLE_KEY" .env
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Test Newsletter Subscription
Visit http://localhost:4321/coming-soon and:
1. Scroll to the contact form
2. Fill out the form with test data
3. Submit and verify it processes successfully

### 4. Check Server Logs
The development server console should show:
- No errors about missing environment variables
- Successful database connections
- API route responses

### 5. Verify Client-Side Security
```bash
# Check that no sensitive keys are exposed in the browser
curl http://localhost:4321 | grep -E "SERVICE_ROLE_KEY|DB_PASSWORD|DATABASE_URL"
# Should return nothing
```

### 6. Test Admin Panel (if you have admin access)
1. Visit http://localhost:4321/admin
2. Log in with admin credentials
3. Verify you can view/edit content

## Expected Results

✅ **Working:**
- Newsletter subscriptions save to database
- Coming soon page loads with school information
- API routes respond with 200/201 status codes
- No sensitive keys in client-side code

❌ **Not Working (and that's good!):**
- Direct database access from browser console
- Accessing service role key from client code
- Viewing database credentials in browser DevTools

## Troubleshooting

### If database connections fail:

1. **Check Supabase is running (if using local):**
   ```bash
   npx supabase status
   npx supabase start  # if not running
   ```

2. **Verify environment variables are loaded:**
   ```bash
   node -e "require('dotenv').config(); console.log(process.env.PUBLIC_SUPABASE_URL)"
   ```

3. **Test direct connection:**
   ```bash
   npm run test:db
   ```

### If you see 301 redirects in local development:
This is due to Netlify redirect rules and doesn't affect actual functionality. The application should still work correctly.

## Production Verification

After deploying to Netlify/Vercel:
1. Check that environment variables are set in the hosting dashboard
2. Test the live site's forms and functionality
3. Monitor error logs for any database connection issues