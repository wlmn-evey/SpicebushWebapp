# Production Deployment Guide - Spicebush Montessori

## ⚠️ Important: Development vs Production

### NOT for Production:
- ❌ Docker Compose (development orchestration only)
- ❌ Supabase CLI (local development only)
- ❌ Any local database instance
- ❌ Self-hosted Supabase (unless you have DevOps expertise)

### FOR Production:
- ✅ Supabase Cloud (managed database + auth)
- ✅ Vercel or Netlify (for Astro app)
- ✅ Proper environment variables
- ✅ SSL/TLS encryption

## 🏗️ Production Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   Your Users    │────────▶│ CDN (Vercel/     │
└─────────────────┘         │ Netlify)         │
                            └────────┬─────────┘
                                     │
                            ┌────────▼─────────┐
                            │  Your Astro App  │
                            │  (Static Build)  │
                            └────────┬─────────┘
                                     │ HTTPS
                            ┌────────▼─────────┐
                            │ Supabase Cloud   │
                            │ - PostgreSQL     │
                            │ - Auth           │
                            │ - REST API      │
                            │ - Realtime       │
                            │ - Storage        │
                            └──────────────────┘
```

## 📋 Step-by-Step Production Deployment

### Step 1: Set Up Supabase Cloud

1. **Create Account**
   - Go to [app.supabase.com](https://app.supabase.com)
   - Sign up for free account
   - Create new project (choose region close to your users)

2. **Save Your Keys**
   ```
   Project URL: https://[your-project-id].supabase.co
   Anon Key: [your-anon-key]
   Service Role Key: [your-service-key] (keep this SECRET!)
   ```

3. **Run Migrations**
   - Go to SQL Editor in Supabase Dashboard
   - Run each migration file from `/supabase/migrations/` in order
   - Verify tables are created and data is populated

### Step 2: Deploy Astro App

#### Option A: Deploy to Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   cd /path/to/SpicebushWebapp/app
   vercel
   ```

3. **Set Environment Variables in Vercel Dashboard**
   ```
   PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
   PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
   STRIPE_SECRET_KEY=[your-stripe-secret-key]
   PUBLIC_STRIPE_PUBLISHABLE_KEY=[your-stripe-publishable-key]
   ```

#### Option B: Deploy to Netlify

1. **Install Netlify CLI**
   ```bash
   npm i -g netlify-cli
   ```

2. **Deploy**
   ```bash
   cd /path/to/SpicebushWebapp/app
   netlify deploy
   netlify deploy --prod
   ```

3. **Set Environment Variables in Netlify Dashboard**
   - Same variables as Vercel above

### Step 3: Configure Production Settings

1. **Enable Row Level Security (RLS)**
   - In Supabase Dashboard → Authentication → Policies
   - Ensure all tables have appropriate RLS policies
   - Test with different user roles

2. **Set Up Custom Domain**
   - In Vercel/Netlify: Add your domain
   - Update DNS records
   - SSL is automatic

3. **Configure Email**
   - Supabase Dashboard → Authentication → Email Templates
   - Customize email templates for your school
   - Set up SMTP if needed (SendGrid, etc.)

### Step 4: Production Environment Variables

Create `.env.production` (DO NOT COMMIT) and mirror the same keys in Netlify → Site Settings → Environment Variables:
```env
# Supabase
PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Site configuration
PUBLIC_SITE_URL=https://spicebushmontessori.org

# Clerk authentication
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Email service (Unione or alternate provider)
EMAIL_FROM=info@spicebushmontessori.org
EMAIL_FROM_NAME=Spicebush Montessori
UNIONE_API_KEY=...
UNIONE_REGION=us

# Stripe (optional donations/payments)
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

> **Tip:** If you are not using donations yet, omit the Stripe variables to keep the environment minimal.

### Step 5: Security Checklist

- [ ] RLS policies enabled on all tables
- [ ] Service role key NOT exposed in client code
- [ ] Environment variables properly set
- [ ] HTTPS enabled (automatic with Vercel/Netlify)
- [ ] API rate limiting configured
- [ ] Backup strategy in place
- [ ] Error monitoring set up (Sentry, etc.)
- [ ] Analytics configured (if needed)

### Step 6: Testing Production

1. **Test Authentication**
   - Sign up flow
   - Login/logout
   - Password reset

2. **Check Public Pages**
   - Homepage content renders from Supabase
   - Blog posts, contact form, and schedule tour flow load correctly
   - Maintenance placeholders (Tuition Calculator/Admin) show expected copy until rebuilt

3. **Validate Authenticated Endpoints**
   - Clerk login/logout
   - `/api/auth/check` confirms admin status for approved emails
   - Newsletter/communications APIs return data using Supabase service role key

### Step 7: Monitoring & Maintenance

1. **Set Up Monitoring**
   - Vercel/Netlify Analytics
   - Supabase Dashboard metrics
   - Uptime monitoring (UptimeRobot, etc.)

2. **Regular Tasks**
   - Check Supabase usage (free tier limits)
   - Monitor error logs
   - Update dependencies
   - Backup database regularly

## 🚀 Deployment Commands Summary

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Deploy to Netlify
netlify deploy --prod

# Check production build locally
npm run preview
```

## 📊 Cost Considerations

### Free Tiers Available:
- **Supabase Free**: 500MB database, 2GB bandwidth, 50K MAUs
- **Vercel Free**: Perfect for this project size
- **Netlify Free**: Also perfect for this project

### When to Upgrade:
- More than 50K monthly active users
- Need more than 500MB database
- Require phone/SMS authentication
- Need dedicated support

## 🆘 Troubleshooting Production Issues

### "Tuition calculator not loading"
- Check PUBLIC_SUPABASE_URL is correct
- Verify RLS policies allow public read
- Check browser console for errors

### "Can't log in as admin"
- Verify user exists in production database
- Check authentication settings
- Ensure email confirmation is configured

### "Site is slow"
- Enable Vercel/Netlify caching
- Optimize images
- Check Supabase region (should be close to users)

## 📝 Final Notes

1. **Never commit secrets** - Use environment variables
2. **Test everything** - Especially auth and payments
3. **Monitor usage** - Stay within free tiers initially
4. **Keep local dev working** - For testing new features

Remember: Production is about reliability, security, and scalability. The local Docker setup is just for development!
