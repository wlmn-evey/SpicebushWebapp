# Required GitHub Secrets

This repository requires the following secrets to be configured in GitHub:

## Repository Secrets (Settings > Secrets and variables > Actions)

### Required for CI/CD
- `PUBLIC_SUPABASE_URL`: Your Supabase project URL (e.g., `https://yourproject.supabase.co`)
- `PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Required for Deployment (Phase 2.2)
- `NETLIFY_AUTH_TOKEN`: Netlify authentication token (if using Netlify)
- `NETLIFY_SITE_ID`: Netlify site identifier (if using Netlify)
- `GOOGLE_CLOUD_SA_KEY`: Google Cloud Service Account key (if using GCP)

### Optional Security Scanning
- `SNYK_TOKEN`: Snyk authentication token (for advanced security scanning)

## Setting Up Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions  
3. Click "New repository secret"
4. Add each secret with its corresponding value

## Environment-Specific Secrets

### Development/Testing
Use non-production values for testing workflows.

### Production
Use production values only for main branch deployments.

## Security Notes

- Never commit actual secret values to the repository
- Rotate secrets regularly (every 90 days recommended)
- Use principle of least privilege
- Monitor secret usage in Actions logs
- Use environment-specific secrets when possible

## Local Development

For local development, create a `.env.local` file in the `app/` directory with:
```bash
PUBLIC_SUPABASE_URL=http://localhost:54321
PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
# ... other local environment variables
```

This file is gitignored and should never be committed.