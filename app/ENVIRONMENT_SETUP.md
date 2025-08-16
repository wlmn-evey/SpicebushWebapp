# Environment Setup Guide

## Required Services

### 1. Supabase Account
- **URL**: https://supabase.com
- **Purpose**: Database and authentication
- **Required Credentials**:
  - `PUBLIC_SUPABASE_URL` - Found in: Settings → API → Project URL
  - `PUBLIC_SUPABASE_ANON_KEY` - Found in: Settings → API → anon public key
  - `SUPABASE_SERVICE_ROLE_KEY` - Found in: Settings → API → service_role key (keep secret!)

### 2. Unione.io Account (for email)
- **URL**: https://unione.io
- **Purpose**: Sending magic link emails
- **Required Credentials**:
  - `UNIONE_API_KEY` - Found in: Account → API
  - `UNIONE_REGION` - Use 'us' for US companies
- **Important**: Domain must be verified in Unione.io dashboard

### 3. Stripe Account (optional for payments)
- **URL**: https://stripe.com
- **Purpose**: Payment processing
- **Required Credentials**:
  - `PUBLIC_STRIPE_PUBLISHABLE_KEY` - Found in: Developers → API keys
  - `STRIPE_SECRET_KEY` - Found in: Developers → API keys (keep secret!)
- **Test Mode**: Use test keys (pk_test_, sk_test_) for development

## Quick Setup Instructions

### Step 1: Copy Environment Template
```bash
cp .env.example .env.local
```

### Step 2: Fill Required Values

Edit `.env.local` and update these required fields:

```env
# Supabase (required)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Site URL (required)
PUBLIC_SITE_URL=http://localhost:4321  # or https://yourdomain.com for production

# Email Service (required for admin login)
UNIONE_API_KEY=your-unione-api-key
UNIONE_REGION=us
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your School Name
```

### Step 3: Verify Setup
```bash
node scripts/check-env.cjs
```

Expected output:
```
✅ All required variables configured!
```

## Security Best Practices

### Never Commit Secrets
- ✅ `.env.local` is gitignored
- ❌ Never commit `.env.local` to git
- ❌ Never share service role keys
- ❌ Never expose keys in client-side code

### Use Different Keys for Each Environment
- **Development**: Use test/sandbox credentials
- **Staging**: Use separate staging credentials  
- **Production**: Use production credentials with restricted permissions

### Rotate Keys Regularly
- Change API keys every 90 days
- Immediately rotate if key is exposed
- Monitor usage for unauthorized access

## Deployment Configuration

### Netlify
1. Go to: Site Settings → Environment Variables
2. Add each variable from `.env.local`
3. Deploy and verify with `/api/health` endpoint

### Vercel
1. Go to: Project Settings → Environment Variables
2. Add variables for Production/Preview/Development
3. Redeploy after adding variables

### Docker
1. Use `docker-compose.yml` with environment variables
2. Or create `.env.production` for production builds
3. Never include `.env` files in Docker images

## Troubleshooting

### "Missing required variables" Error
- Run `node scripts/check-env.cjs` to see what's missing
- Check spelling of variable names
- Ensure no extra spaces in values

### Email Not Sending
- Verify `UNIONE_API_KEY` is correct
- Check domain is verified in Unione.io
- Ensure `UNIONE_REGION` matches your account region
- Test with `/test-email` page in development

### Database Connection Failed
- Verify Supabase project is active (not paused)
- Check `PUBLIC_SUPABASE_URL` format
- Ensure keys match your project
- Test with `/api/health` endpoint

### Stripe Not Working
- Ensure using correct key type (test vs live)
- Public key must start with `pk_`
- Secret key must start with `sk_` or `rk_`
- Check keys match the Stripe account

## Environment Variables Reference

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `PUBLIC_SUPABASE_URL` | Supabase project URL | https://abc.supabase.co |
| `PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key | eyJhbG... |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (secret) | eyJhbG... |
| `PUBLIC_SITE_URL` | Your website URL | https://example.com |

### Email Configuration
| Variable | Description | Default |
|----------|-------------|---------|
| `UNIONE_API_KEY` | Unione.io API key | - |
| `UNIONE_REGION` | API region | us |
| `EMAIL_FROM` | Sender email | noreply@domain.com |
| `EMAIL_FROM_NAME` | Sender name | Your Organization |
| `EMAIL_SERVICE` | Email provider | unione |

### Payment Configuration (Optional)
| Variable | Description | Example |
|----------|-------------|---------|
| `PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key | pk_test_... |
| `STRIPE_SECRET_KEY` | Stripe secret key | sk_test_... |
| `STRIPE_WEBHOOK_SECRET` | Webhook endpoint secret | whsec_... |

## Getting Help

1. Check environment with: `node scripts/check-env.cjs`
2. Review this guide for missing steps
3. Check service dashboards for correct values
4. Ensure all services are active/not suspended
5. Contact service support if credentials aren't working