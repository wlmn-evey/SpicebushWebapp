# Environment Variables Documentation

This document describes all environment variables used in the Spicebush Montessori application.

## Required Environment Variables

These variables MUST be set for the application to function properly.

### Core Configuration

#### `PUBLIC_SITE_URL`
- **Description**: The full URL of the site (including https://)
- **Example**: `https://spicebushmontessori.org` (production), `https://spicebush-testing.netlify.app` (testing)
- **Used by**: Astro configuration, sitemap generation, canonical URLs

### Supabase Configuration

#### `PUBLIC_SUPABASE_URL`
- **Description**: Your Supabase project URL
- **Example**: `https://xnzweuepchbfffsegkml.supabase.co`
- **Used by**: All database connections and authentication

#### `PUBLIC_SUPABASE_ANON_KEY`
- **Description**: Supabase anonymous/public key for client-side operations
- **Example**: `eyJhbGciOiJIUzI1NiIsInR...` or `sb_publishable_...`
- **Used by**: Client-side Supabase client initialization
- **Note**: This is safe to expose in client-side code

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Description**: Supabase service role key for server-side operations
- **Example**: `eyJhbGciOiJIUzI1NiIsInR...` or `sb_secret_...`
- **Used by**: Server-side API routes for admin operations
- **Security**: NEVER expose this in client-side code

### Database Configuration

#### `DATABASE_URL`
- **Description**: PostgreSQL connection string
- **Example**: `postgresql://postgres:password@db.project.supabase.co:5432/postgres`
- **Used by**: Direct database connections (if needed)

#### `DIRECT_URL` (Optional)
- **Description**: Direct database URL (usually same as DATABASE_URL)
- **Used by**: Database migrations and direct connections

### Stripe Payment Configuration

#### `PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Description**: Stripe publishable key for client-side
- **Example**: `pk_live_...` (production), `pk_test_...` (testing)
- **Used by**: Stripe Elements and payment forms

#### `STRIPE_SECRET_KEY`
- **Description**: Stripe secret or restricted key for server-side
- **Example**: `sk_live_...` or `rk_live_...` (production), `sk_test_...` (testing)
- **Used by**: Server-side payment processing
- **Security**: NEVER expose this in client-side code

#### `STRIPE_WEBHOOK_SECRET` (Optional)
- **Description**: Stripe webhook endpoint signing secret
- **Example**: `whsec_...`
- **Used by**: Webhook verification

### Email Configuration

#### `ADMIN_EMAIL`
- **Description**: Primary admin email address
- **Default**: `info@spicebushmontessori.org`
- **Used by**: Admin notifications, form submissions

#### `EMAIL_FROM`
- **Description**: From email address for system emails
- **Default**: `info@spicebushmontessori.org`
- **Used by**: Email sending services

#### `EMAIL_FROM_NAME`
- **Description**: Display name for system emails
- **Example**: `Spicebush Montessori` (production), `Spicebush Montessori (Testing)` (testing)
- **Used by**: Email headers

## Optional Environment Variables

### Email Service Providers

#### `UNIONE_API_KEY`
- **Description**: Unione email service API key
- **Used by**: Magic link authentication emails

#### `SENDGRID_API_KEY`
- **Description**: SendGrid API key (alternative to Unione)
- **Used by**: Email sending (if configured)

### Development/Testing

#### `ENVIRONMENT`
- **Description**: Current environment identifier
- **Values**: `production`, `testing`, `development`
- **Used by**: Environment-specific features and logging

#### `NODE_ENV`
- **Description**: Node.js environment
- **Values**: `production`, `development`
- **Set by**: Netlify automatically based on context

## Environment Variable Aliases

For backward compatibility, the following aliases are supported:

- `PUBLIC_SUPABASE_PUBLIC_KEY` → Falls back to `PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY` → Should use `SUPABASE_SERVICE_ROLE_KEY`

## Setting Environment Variables

### Local Development
1. Copy `.env.example` to `.env.local`
2. Fill in your values
3. Never commit `.env.local` to version control

### Netlify Dashboard
1. Go to Site Settings → Environment Variables
2. Add each variable with its value
3. Deploy to apply changes

### Using the Setup Script
```bash
cd app
./scripts/configure-netlify-testing-simple.sh
```

## Security Best Practices

1. **Never commit sensitive keys** to version control
2. **Use different keys** for production and testing
3. **Rotate keys regularly**
4. **Limit key permissions** where possible (e.g., use Stripe restricted keys)
5. **Monitor usage** for unauthorized access

## Troubleshooting

### Missing Environment Variable Errors
- Check the error message for the specific variable name
- Ensure the variable is set in your environment
- Verify the variable name matches exactly (case-sensitive)

### Build Failures
- Check Netlify build logs for specific missing variables
- Ensure all required variables are set
- Verify variable values are properly formatted (no extra quotes)

### Authentication Issues
- Verify Supabase keys match your project
- Check that service role key has proper permissions
- Ensure URLs include the protocol (https://)