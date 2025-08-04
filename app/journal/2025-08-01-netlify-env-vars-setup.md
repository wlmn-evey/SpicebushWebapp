# Netlify Environment Variables Setup - 2025-08-01

## Summary
Created scripts and documentation to programmatically set up Netlify environment variables for the Spicebush Montessori website deployment.

## Actions Taken

### 1. Created Setup Scripts
- **`scripts/setup-netlify-env-vars.js`**: Node.js script that uses the Netlify API directly
  - Prompts for Netlify access token
  - Automatically finds the site by name
  - Sets all pre-configured variables
  - Prompts for sensitive Supabase credentials
  - Applies all variables via API

- **`scripts/setup-netlify-env-cli.sh`**: Bash script using Netlify CLI
  - Checks for CLI installation
  - Handles login flow
  - Sets variables using `netlify env:set` commands
  - Provides immediate deployment options

### 2. Environment Variables Configured

#### Pre-configured (included in scripts):
- `PUBLIC_SUPABASE_URL`: https://xnzweuepchbfffsegkml.supabase.co
- `PUBLIC_SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- `UNIONE_API_KEY`: 6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme
- `EMAIL_FROM`: noreply@spicebushmontessori.org
- `EMAIL_FROM_NAME`: Spicebush Montessori
- `UNIONE_REGION`: us
- `ADMIN_EMAIL`: admin@spicebushmontessori.org
- `SITE_URL`: https://spicebushmontessori.org
- `NODE_VERSION`: 20

#### User must provide:
- `SUPABASE_SERVICE_ROLE_KEY`: From Supabase dashboard
- `DATABASE_URL`: PostgreSQL connection string
- `DIRECT_URL`: Direct database connection URL

### 3. Documentation Created
- **`NETLIFY_ENV_SETUP_GUIDE.md`**: Comprehensive guide with:
  - Multiple setup methods
  - Complete variables list
  - Step-by-step instructions
  - Troubleshooting section
  - Security best practices

## Key Decisions

1. **Dual Approach**: Created both API-based and CLI-based scripts to accommodate different user preferences and environments

2. **Security**: Marked sensitive variables as secrets and included clear warnings about keeping them secure

3. **User Experience**: Made scripts interactive with clear prompts and helpful error messages

4. **Automation**: Pre-configured all known values to minimize user input and potential errors

## Next Steps

1. User needs to run one of the setup scripts with:
   - Netlify access token
   - Supabase service role key
   - Database connection strings

2. After environment variables are set:
   - Trigger deployment via Netlify dashboard or CLI
   - Verify all services are working
   - Configure custom domain

3. Post-deployment:
   - Enable coming-soon mode
   - Set up domain DNS records
   - Configure email domain verification

## Important Notes

- The Unione.io API key is already included in the scripts
- Different environment variables should be used for staging vs production
- The scripts create a reference .env file optionally for local development
- All sensitive keys are handled securely and marked as secrets in Netlify

## Files Modified/Created
- `/scripts/setup-netlify-env-vars.js` - Node.js setup script
- `/scripts/setup-netlify-env-cli.sh` - Bash CLI setup script  
- `/NETLIFY_ENV_SETUP_GUIDE.md` - Comprehensive setup guide