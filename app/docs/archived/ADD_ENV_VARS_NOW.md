# URGENT: Add Environment Variables to Netlify NOW

The site is deployed but **the database is NOT connected** because environment variables are missing.

## Quick Copy-Paste Instructions

### 1. Go to Netlify Environment Variables Page
Open this link:
👉 **https://app.netlify.com/sites/spicebush-testing/configuration/env**

### 2. Click "Add a variable" and add each of these:

Copy each line EXACTLY as shown (including the key and value):

```
Key: PUBLIC_SUPABASE_URL
Value: https://xnzweuepchbfffsegkml.supabase.co
```

```
Key: PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuendldWVwY2hiZmZmc2Vna21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAzMzE3NDQsImV4cCI6MjA0NTkwNzc0NH0.qMScf8b6LJCcG0_M2AWQZOmAjJwcd4DdMhX69a0sVK0
```

```
Key: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuendldWVwY2hiZmZmc2Vna21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDMzMTc0NCwiZXhwIjoyMDQ1OTA3NzQ0fQ.uPFaOqYbMIxqBDQsWLFCmFLI9xmuxlD7QZm1a9YN5vg
```

```
Key: PUBLIC_SITE_URL
Value: https://spicebush-testing.netlify.app
```

```
Key: UNIONE_API_KEY
Value: 6rtwau1npm9161y9g4fmezdc7zpbx8phthop6rsa
```

```
Key: UNIONE_REGION
Value: us
```

```
Key: EMAIL_FROM
Value: noreply@spicebushmontessori.org
```

```
Key: EMAIL_FROM_NAME
Value: Spicebush Montessori School
```

```
Key: EMAIL_SERVICE
Value: unione
```

### 3. After Adding All Variables:
1. Click "Save" if there's a save button
2. Go to: https://app.netlify.com/sites/spicebush-testing/deploys
3. Click "Trigger deploy" → "Deploy site"

### 4. Wait 2-3 Minutes for Deployment

### 5. Test That It Worked:
```bash
curl https://spicebush-testing.netlify.app/api/health
```

Should return:
```json
{
  "status": "ok",
  "database": "healthy"
}
```

## Why This Is Urgent

Without these environment variables:
- ❌ Database is not connected
- ❌ Teacher data can't be loaded (shows old/fake data)
- ❌ Footer and certification fixes won't show
- ❌ Admin login won't work
- ❌ Email service won't function

With these environment variables:
- ✅ All fixes will be visible
- ✅ Correct teacher data will show
- ✅ Footer will be fixed
- ✅ Admin login will work
- ✅ Email service will function (with HTTPS)

## Alternative: Use Netlify CLI (if you have access)

If you have Netlify CLI access with proper authentication:

```bash
# Login to Netlify
netlify login

# Link to the site
netlify link --name spicebush-testing

# Set all variables at once
netlify env:import .env.production

# Deploy
netlify deploy --prod
```

## After Environment Variables Are Set

Once the database is connected, all the following fixes will be active:
- Footer logo properly sized
- Login link correct color
- Schedule tour page has header/footer
- Only real teachers shown (Kirsti, Leah, Kira)
- Correct certifications (AMS not AMI)
- Email service working with HTTPS

**ACTION REQUIRED: Add these environment variables NOW to fix all issues!**