# Fix Magic Link - Quick Instructions

## The Problem
The custom Unione email hook is likely interfering with Supabase's magic links.

## The Fix (5 minutes)

### Step 1: Disable Custom Email Hook
1. Go to: https://supabase.com/dashboard/project/xnzweuepchbfffsegkml
2. Navigate to: **Authentication** → **Hooks**
3. Find **Email Hook** section
4. If "Enable Email Hook" is **ON**, toggle it **OFF**
5. Click **Save**

### Step 2: Test Magic Link
1. Visit: https://spicebush-testing.netlify.app/auth/magic-login
2. Enter: Your admin email
3. Click: "Send Magic Link"
4. Check: Your email (including spam folder)
5. Click: The link in the email

## That's It!

**If it works:** You're done! Supabase's default email service is free for up to 3 emails/hour, which is plenty for admin access.

**If it still doesn't work:** 
1. Visit: https://spicebush-testing.netlify.app/auth/magic-link-debug
2. Click "Test Simple Magic Link" and note any errors
3. The error message will tell you what's wrong

## Why This Works

- Supabase's default email service is **FREE** and **reliable**
- The custom Unione hook adds complexity without benefit for magic links
- The callback page has been fixed to work with default Supabase emails

## Note
The custom Unione hook was for sending emails from your domain, but:
- It's not necessary for magic links to work
- Supabase's default emails are trusted and have good deliverability
- You can still use Unione for other transactional emails (contact forms, etc.)