# Environment Variables Strategy

This document outlines the strategy for managing environment variables across different deployment environments for the Spicebush Montessori website.

## Overview

The Spicebush Montessori website uses environment variables for configuration that changes between environments (development, staging, production). Since this is an Astro static site, environment variables are primarily needed at **build time**.

## Variable Categories

### 1. Public Variables (Client-Side)

These variables are prefixed with `PUBLIC_` and are accessible in the browser:

| Variable | Purpose | Required | Example |
|----------|---------|----------|---------|
| `PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ Yes | `https://abc123.supabase.co` |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ Yes | `eyJhbGc...` |
| `PUBLIC_STRAPI_URL` | Strapi CMS URL | ❌ No | `https://cms.example.com` |
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | ❌ No | `pk_live_...` |

### 2. Private Variables (Server-Side)

These are only used during build or in API routes:

| Variable | Purpose | Required | Example |
|----------|---------|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret key | ❌ No | `sk_live_...` |
| `SMTP_HOST` | Email server host | ❌ No | `smtp.sendgrid.net` |
| `SMTP_PORT` | Email server port | ❌ No | `587` |
| `SMTP_USER` | Email username | ❌ No | `apikey` |
| `SMTP_PASS` | Email password | ❌ No | `SG.xxx...` |

## Environment-Specific Configuration

### Development Environment

File: `.env.local` (git-ignored)

```env
# Local Supabase instance
PUBLIC_SUPABASE_URL=http://localhost:54321
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Local Strapi instance
PUBLIC_STRAPI_URL=http://localhost:1337

# Test Stripe keys
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Staging Environment

File: `.env.staging` (git-ignored)

```env
# Staging Supabase project
PUBLIC_SUPABASE_URL=https://staging-abc123.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Staging CMS
PUBLIC_STRAPI_URL=https://staging-cms.spicebushmontessori.org

# Test Stripe keys (same as dev)
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Production Environment

File: `.env.production` (git-ignored)

```env
# Production Supabase project
PUBLIC_SUPABASE_URL=https://prod-xyz789.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Production CMS
PUBLIC_STRAPI_URL=https://cms.spicebushmontessori.org

# Live Stripe keys
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# Production email configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.actual-api-key-here
```

## Build-Time vs Runtime Variables

Since Astro generates a static site, most environment variables are resolved at **build time**:

### Build-Time Variables (Compiled into the code)
- All `PUBLIC_*` variables
- Variables used in `astro.config.mjs`
- Variables used in `.astro` components

### Runtime Variables (Not applicable for static sites)
- Static sites don't have runtime variables
- All configuration must be done at build time

## Security Best Practices

### 1. Never Commit Sensitive Data
```bash
# .gitignore should include:
.env
.env.local
.env.production
.env.staging
```

### 2. Use Different Keys Per Environment
- Never use production keys in development
- Use test payment keys for non-production
- Rotate keys regularly

### 3. Minimal Permissions
- Supabase anon keys should have minimal permissions
- Use Row Level Security (RLS) in Supabase
- API keys should be scoped to necessary permissions only

### 4. Validate Variables at Build Time
```javascript
// src/lib/env-validation.ts
const requiredEnvVars = [
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!import.meta.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
```

## Deployment Platform Configuration

### Netlify

1. **Via UI**: Site Settings → Environment Variables
2. **Via CLI**: `netlify env:set PUBLIC_SUPABASE_URL "value"`
3. **Via netlify.toml**: Build-time variables only

### Vercel

1. **Via UI**: Project Settings → Environment Variables
2. **Via CLI**: `vercel env add`
3. **Scope**: Production, Preview, Development

### Docker

1. **Build Args**: Pass during build
   ```bash
   docker build --build-arg PUBLIC_SUPABASE_URL=value
   ```

2. **Runtime**: Not applicable for static builds

### Google Cloud Run

1. **Build Config**: Use Cloud Build with substitutions
2. **Deploy**: Variables are baked into the image

## Variable Management Workflow

### 1. Adding a New Variable

1. Add to `.env.example` with description
2. Add to `.env.local` for development
3. Document in this file
4. Add validation if required
5. Update build scripts if needed

### 2. Updating Variables

1. Update in deployment platform
2. Trigger new build/deployment
3. Verify in deployment logs
4. Test functionality

### 3. Rotating Secrets

1. Generate new keys/tokens
2. Update in deployment platform
3. Deploy with new values
4. Verify functionality
5. Revoke old keys

## Troubleshooting

### Variable Not Found During Build

```bash
# Check if variable is set
echo $PUBLIC_SUPABASE_URL

# For Docker builds, ensure it's passed as build arg
docker build --build-arg PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
```

### Variable Not Available in Browser

1. Ensure variable starts with `PUBLIC_`
2. Rebuild the application
3. Check browser console for the value

### Different Values in Production

1. Clear build cache
2. Verify deployment platform settings
3. Check for typos in variable names
4. Ensure latest build is deployed

## Examples

### Local Development Setup

```bash
# Copy example file
cp .env.example .env.local

# Edit with your values
nano .env.local

# Start development
npm run dev
```

### Production Build

```bash
# Using build script
ENV_FILE=.env.production ./scripts/build-with-env.sh

# Manual build
export $(cat .env.production | xargs)
npm run build
```

### CI/CD Pipeline

```yaml
# GitHub Actions example
env:
  PUBLIC_SUPABASE_URL: ${{ secrets.PUBLIC_SUPABASE_URL }}
  PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.PUBLIC_SUPABASE_ANON_KEY }}

steps:
  - name: Build
    run: npm run build
```

## Monitoring and Alerts

### 1. Build Failures
- Set up alerts for failed builds due to missing variables
- Monitor deployment logs

### 2. API Key Usage
- Monitor Supabase dashboard for usage
- Set up alerts for rate limits
- Track Stripe API usage

### 3. Security Monitoring
- Regular audit of environment variables
- Check for exposed keys in logs
- Monitor for unauthorized access

## Migration Guide

When migrating between environments:

1. **Export current variables**:
   ```bash
   netlify env:list > current-vars.txt
   ```

2. **Review and update values**

3. **Import to new environment**:
   ```bash
   netlify env:import updated-vars.txt
   ```

4. **Test thoroughly** before switching DNS

Remember: Environment variables are critical for security and functionality. Always handle them with care and follow security best practices.