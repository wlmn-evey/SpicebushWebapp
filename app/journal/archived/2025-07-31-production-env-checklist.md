# Production Environment Variables Checklist

**Created**: 2025-07-31  
**Purpose**: Comprehensive checklist for deploying SpicebushWebapp to Netlify production

## Overview

This document provides a complete checklist of all environment variables required for production deployment, where to obtain them, and best practices for configuration.

## Required Environment Variables

### 1. Supabase Configuration (✅ Already Have)

```bash
# Primary Supabase settings
PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
PUBLIC_SUPABASE_PUBLIC_KEY=[YOUR-ANON-KEY]

# Service role key (server-side only - NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
```

**Where to get**: 
- Supabase Dashboard → Settings → API
- ✅ Already configured in `.env.local`

### 2. Stripe Configuration (🔲 Need to Add)

```bash
# Stripe API keys
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
```

**Where to get**:
- Stripe Dashboard → Developers → API keys
- Use LIVE keys for production (not test keys)
- Webhook secret from Webhooks → Add endpoint

### 3. Email Service Configuration (🔲 Need to Choose & Configure)

Choose one of these options:

#### Option A: SendGrid
```bash
SENDGRID_API_KEY=SG.xxxx
EMAIL_FROM=noreply@spicebushmontessori.org
EMAIL_FROM_NAME=Spicebush Montessori
```

#### Option B: Postmark
```bash
POSTMARK_SERVER_TOKEN=xxxx
POSTMARK_FROM_EMAIL=noreply@spicebushmontessori.org
```

#### Option C: Resend
```bash
RESEND_API_KEY=re_xxxx
EMAIL_FROM=noreply@spicebushmontessori.org
```

**Where to get**:
- Sign up for chosen service
- Verify domain ownership
- Generate API key from dashboard

### 4. Netlify-Specific Settings (✅ Auto-configured)

```bash
# These are provided automatically by Netlify
URL=$URL                          # Your site URL
DEPLOY_URL=$DEPLOY_URL           # URL for this deploy
CONTEXT=$CONTEXT                 # production, deploy-preview, etc.
NETLIFY_SITE_ID=$NETLIFY_SITE_ID
```

### 5. Optional Services

#### Google Analytics (if using)
```bash
PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

#### Sentry Error Tracking (if using)
```bash
SENTRY_DSN=https://xxxx@sentry.io/xxxx
SENTRY_ENVIRONMENT=production
```

## Production Environment Template

Create a `.env.production` file with this template:

```bash
# ========================================
# 🚀 PRODUCTION ENVIRONMENT VARIABLES
# ========================================
# DO NOT COMMIT THIS FILE TO VERSION CONTROL

# Supabase Configuration
PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
PUBLIC_SUPABASE_PUBLIC_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]

# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_live_[YOUR_LIVE_KEY]
STRIPE_PUBLISHABLE_KEY=pk_live_[YOUR_LIVE_KEY]
STRIPE_WEBHOOK_SECRET=whsec_[YOUR_WEBHOOK_SECRET]

# Email Service (choose one)
# SendGrid
SENDGRID_API_KEY=[YOUR_API_KEY]
EMAIL_FROM=noreply@spicebushmontessori.org
EMAIL_FROM_NAME=Spicebush Montessori

# Optional: Analytics
PUBLIC_GA_MEASUREMENT_ID=G-[YOUR_ID]

# Optional: Error Tracking
SENTRY_DSN=[YOUR_DSN]
SENTRY_ENVIRONMENT=production

# Node Environment
NODE_ENV=production
```

## Setting Environment Variables in Netlify

### Method 1: Netlify UI (Recommended)
1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add each variable individually
3. Mark sensitive variables (API keys) as "Secret"
4. Variables are automatically encrypted and secure

### Method 2: Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Set environment variables
netlify env:set STRIPE_SECRET_KEY "sk_live_xxxx" --secret
netlify env:set PUBLIC_SUPABASE_URL "https://[YOUR-PROJECT].supabase.co"
```

## Pre-Deployment Checklist

- [ ] **Supabase**
  - [ ] Verify all tables are created in production
  - [ ] Check Row Level Security (RLS) policies are enabled
  - [ ] Confirm auth settings match development
  - [ ] Test database connection with production URL

- [ ] **Stripe**
  - [ ] Switch from test to live API keys
  - [ ] Configure webhook endpoint in Stripe dashboard
  - [ ] Set webhook to: `https://yoursite.netlify.app/api/webhooks/stripe`
  - [ ] Test donation flow with small amount

- [ ] **Email Service**
  - [ ] Choose and configure email provider
  - [ ] Verify domain ownership (SPF, DKIM records)
  - [ ] Test email sending from production
  - [ ] Configure email templates if needed

- [ ] **Netlify Configuration**
  - [ ] Review `netlify.toml` settings
  - [ ] Set up custom domain
  - [ ] Enable HTTPS (automatic with Netlify)
  - [ ] Configure form notifications if using Netlify Forms

- [ ] **Security**
  - [ ] Ensure all sensitive keys use `SUPABASE_SERVICE_ROLE_KEY` pattern (no PUBLIC_ prefix)
  - [ ] Verify CORS settings in Supabase
  - [ ] Check that admin emails are properly configured
  - [ ] Test authentication flow end-to-end

## Post-Deployment Verification

1. **Test Critical Paths**:
   - [ ] Homepage loads correctly
   - [ ] Contact form submission works
   - [ ] Newsletter signup functions
   - [ ] Admin login and CMS access
   - [ ] Donation processing (with test card)

2. **Monitor Initial Deploy**:
   - [ ] Check Netlify build logs
   - [ ] Monitor browser console for errors
   - [ ] Verify all API endpoints respond
   - [ ] Check email delivery

3. **Performance Checks**:
   - [ ] Run Lighthouse audit
   - [ ] Test on mobile devices
   - [ ] Verify image optimization
   - [ ] Check page load times

## Environment Variable Security Best Practices

1. **Never commit secrets to git**
   - Use `.env.local` for development
   - Add to `.gitignore`
   - Use Netlify's encrypted environment variables

2. **Use appropriate prefixes**:
   - `PUBLIC_` for client-side safe variables
   - No prefix for server-side only variables
   - `VITE_` if using Vite (Astro uses `PUBLIC_`)

3. **Rotate keys regularly**:
   - Set calendar reminders
   - Update in Netlify UI
   - Test after rotation

4. **Monitor usage**:
   - Check API usage dashboards
   - Set up alerts for unusual activity
   - Review logs periodically

## Troubleshooting Common Issues

### Environment variables not working
- Ensure variable names match exactly (case-sensitive)
- Rebuild site after adding variables
- Check if using correct prefix for client/server

### Email not sending
- Verify domain DNS records
- Check API key permissions
- Test with email service's test tools

### Database connection issues
- Confirm Supabase project is not paused
- Check connection pooling settings
- Verify network connectivity

### Payment processing errors
- Ensure using live Stripe keys
- Check webhook signature verification
- Monitor Stripe dashboard for errors

## Support Resources

- **Supabase**: https://supabase.com/docs
- **Netlify**: https://docs.netlify.com
- **Stripe**: https://stripe.com/docs
- **Project Issues**: Create in project repository

---

**Last Updated**: 2025-07-31  
**Next Review**: Before production deployment