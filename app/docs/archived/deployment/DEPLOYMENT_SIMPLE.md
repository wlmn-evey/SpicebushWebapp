# Simple Deployment Guide for Spicebush Montessori

This guide will help you deploy your website to Netlify in simple steps.

## Prerequisites

1. **GitHub Account**: Create one at https://github.com (free)
2. **Netlify Account**: Create one at https://netlify.com (free)
3. **Supabase Account**: Create one at https://supabase.com (free)

## Step 1: Set Up Supabase (Database)

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - Project name: `spicebush-montessori`
   - Database password: (save this somewhere safe!)
   - Region: Choose the closest to you
4. Click "Create new project" and wait for setup
5. Once ready, go to Settings > API
6. Copy these values (you'll need them later):
   - Project URL
   - anon public key
   - service_role key (keep this secret!)

## Step 2: Upload Code to GitHub

1. Sign in to GitHub
2. Click the "+" icon (top right) > "New repository"
3. Name it: `spicebush-webapp`
4. Keep it Private
5. Click "Create repository"
6. Follow the instructions shown to upload your code

## Step 3: Connect to Netlify

1. Sign in to Netlify
2. Click "Add new site" > "Import an existing project"
3. Choose "GitHub"
4. Select your `spicebush-webapp` repository
5. Keep the default settings and click "Deploy site"

## Step 4: Configure Environment Variables

1. In Netlify, go to Site Settings > Environment Variables
2. Click "Add a variable" for each of these:

### Required Variables:
```
PUBLIC_SUPABASE_URL = [Your Supabase Project URL]
PUBLIC_SUPABASE_ANON_KEY = [Your Supabase anon key]
SUPABASE_SERVICE_ROLE_KEY = [Your Supabase service role key]
ADMIN_EMAIL = [Your admin email address]
```

### Database URLs:
```
DATABASE_URL = [Copy from Supabase Settings > Database]
DIRECT_URL = [Same as DATABASE_URL]
```

## Step 5: Set Up Your Domain (Optional)

1. In Netlify, go to Domain Settings
2. Click "Add custom domain"
3. Enter your domain (e.g., spicebushmontessori.com)
4. Follow the instructions to update your domain's DNS

## Step 6: Initial Admin Setup

1. Once deployed, visit your site
2. Go to `/admin`
3. Enter your admin email
4. Check your email for the magic link
5. Click the link to sign in

## Troubleshooting

### Site won't build?
- Check that all environment variables are set correctly
- Look at the deploy log in Netlify for error messages

### Can't sign in to admin?
- Make sure ADMIN_EMAIL matches exactly
- Check spam folder for magic link email
- Ensure Supabase is properly configured

### Images not showing?
- Upload images through the admin panel
- Check that storage is enabled in Supabase

## Getting Help

- Netlify Support: https://www.netlify.com/support/
- Supabase Docs: https://supabase.com/docs
- Common issues are usually related to:
  - Missing environment variables
  - Incorrect Supabase keys
  - Domain configuration

## Next Steps

After deployment:
1. Update your school information in Admin > Settings
2. Add staff members
3. Update program information
4. Test the newsletter signup
5. Configure payment processing (if needed)

Remember to keep your service role key and admin email secure!