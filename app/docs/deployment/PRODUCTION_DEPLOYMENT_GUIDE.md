# Production Deployment Guide

This guide provides comprehensive instructions for deploying the Spicebush Montessori website to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Build Process](#build-process)
4. [Deployment Options](#deployment-options)
5. [Post-Deployment Checklist](#post-deployment-checklist)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying to production, ensure you have:

- [ ] Docker installed (v20.10 or higher)
- [ ] Production Supabase project created
- [ ] Domain name configured
- [ ] SSL certificates ready (or using a service that provides them)
- [ ] Backup strategy in place

## Environment Configuration

### 1. Create Production Environment File

```bash
cp .env.production.example .env.production
```

### 2. Configure Required Variables

Edit `.env.production` with your production values:

```env
# Required
PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key-here

# Optional
PUBLIC_STRAPI_URL=https://your-cms.com
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### 3. Validate Configuration

Ensure all required environment variables are set:

```bash
# This will validate your .env.production file
./scripts/build-with-env.sh --validate-only
```

## Build Process

### Option 1: Using Build Script (Recommended)

```bash
# Build with production environment
ENV_FILE=.env.production ./scripts/build-with-env.sh
```

### Option 2: Manual Docker Build

```bash
# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Build Docker image
docker build \
  --target production \
  --build-arg PUBLIC_SUPABASE_URL="$PUBLIC_SUPABASE_URL" \
  --build-arg PUBLIC_SUPABASE_ANON_KEY="$PUBLIC_SUPABASE_ANON_KEY" \
  -t spicebush-montessori:production .
```

### Option 3: Build Without Docker

```bash
# Install dependencies
npm ci --production=false

# Build static site
npm run build

# The built files will be in the dist/ directory
```

## Deployment Options

### Option 1: Netlify (Recommended for Static Sites)

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Build and Deploy**:
   ```bash
   # Build the site
   npm run build
   
   # Deploy to Netlify
   netlify deploy --prod --dir=dist
   ```

3. **Configure Environment Variables in Netlify**:
   - Go to Site Settings > Environment Variables
   - Add `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`

4. **Set up netlify.toml** (already included):
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"
   
   [build.environment]
     NPM_FLAGS = "--prefix=/dev/null"
   
   [[headers]]
     for = "/*"
     [headers.values]
       X-Frame-Options = "DENY"
       X-Content-Type-Options = "nosniff"
       X-XSS-Protection = "1; mode=block"
   ```

### Option 2: Docker Deployment (VPS/Cloud)

1. **Push Image to Registry**:
   ```bash
   # Tag for your registry
   docker tag spicebush-montessori:production your-registry.com/spicebush-montessori:latest
   
   # Push to registry
   docker push your-registry.com/spicebush-montessori:latest
   ```

2. **Deploy on Server**:
   ```bash
   # Pull latest image
   docker pull your-registry.com/spicebush-montessori:latest
   
   # Run container
   docker run -d \
     --name spicebush-web \
     -p 80:4321 \
     --restart unless-stopped \
     your-registry.com/spicebush-montessori:latest
   ```

3. **With Docker Compose**:
   ```yaml
   # docker-compose.prod.yml
   version: '3.8'
   services:
     web:
       image: your-registry.com/spicebush-montessori:latest
       ports:
         - "80:4321"
       restart: unless-stopped
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:4321"]
         interval: 30s
         timeout: 10s
         retries: 3
   ```

### Option 3: Google Cloud Run

1. **Build and Push to Google Container Registry**:
   ```bash
   # Configure Docker for GCR
   gcloud auth configure-docker
   
   # Tag image
   docker tag spicebush-montessori:production gcr.io/YOUR_PROJECT_ID/spicebush-montessori
   
   # Push to GCR
   docker push gcr.io/YOUR_PROJECT_ID/spicebush-montessori
   ```

2. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy spicebush-montessori \
     --image gcr.io/YOUR_PROJECT_ID/spicebush-montessori \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 4321
   ```

### Option 4: Static File Hosting (S3/CloudFront)

1. **Build the site**:
   ```bash
   npm run build
   ```

2. **Upload to S3**:
   ```bash
   aws s3 sync dist/ s3://your-bucket-name --delete
   ```

3. **Invalidate CloudFront cache**:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id YOUR_DISTRIBUTION_ID \
     --paths "/*"
   ```

## Post-Deployment Checklist

### Security

- [ ] SSL certificate is active and valid
- [ ] Security headers are configured
- [ ] CORS policies are properly set
- [ ] Environment variables are not exposed
- [ ] Rate limiting is configured

### Performance

- [ ] Images are optimized and loading correctly
- [ ] CSS and JS are minified
- [ ] Caching headers are set appropriately
- [ ] CDN is configured (if applicable)

### Functionality

- [ ] All pages load without errors
- [ ] Forms submit correctly
- [ ] Authentication works (admin login)
- [ ] Payment processing works (if enabled)
- [ ] Contact forms send emails

### SEO

- [ ] Sitemap is accessible at /sitemap-index.xml
- [ ] Robots.txt is properly configured
- [ ] Meta tags are present on all pages
- [ ] Canonical URLs are set

### Monitoring

- [ ] Error tracking is set up
- [ ] Analytics are configured
- [ ] Uptime monitoring is active
- [ ] Backup schedule is configured

## Troubleshooting

### Build Failures

**Issue**: Environment variables not found during build
```bash
# Solution: Ensure variables are passed as build args
docker build --build-arg PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL ...
```

**Issue**: Out of memory during build
```bash
# Solution: Increase Docker memory limit
docker build --memory=4g ...
```

### Runtime Issues

**Issue**: Container exits immediately
```bash
# Check logs
docker logs spicebush-web

# Common fix: Ensure port binding is correct
docker run -p 4321:4321 ...
```

**Issue**: Cannot connect to Supabase
- Verify `PUBLIC_SUPABASE_URL` is correct
- Check if Supabase project is active
- Ensure anon key has proper permissions

### Performance Issues

**Issue**: Slow page loads
- Enable caching headers
- Use a CDN for static assets
- Optimize images (already handled by build process)

**Issue**: High memory usage
- Use production Node.js optimizations
- Implement proper caching strategies
- Consider horizontal scaling

## CI/CD Setup

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ secrets.REGISTRY_URL }}
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: ${{ secrets.REGISTRY_URL }}/spicebush-montessori:latest
        build-args: |
          PUBLIC_SUPABASE_URL=${{ secrets.PUBLIC_SUPABASE_URL }}
          PUBLIC_SUPABASE_ANON_KEY=${{ secrets.PUBLIC_SUPABASE_ANON_KEY }}
    
    - name: Deploy to production
      run: |
        # Add your deployment commands here
        echo "Deploying to production..."
```

## Rollback Strategy

In case of issues, follow these steps:

1. **Immediate Rollback**:
   ```bash
   # If using Docker
   docker stop spicebush-web
   docker run -d --name spicebush-web-rollback previous-image:tag
   
   # If using Netlify
   netlify rollback
   ```

2. **Database Rollback** (if needed):
   - Use Supabase dashboard to restore from backup
   - Or use Supabase CLI: `supabase db reset`

3. **DNS Rollback** (if needed):
   - Point domain to previous deployment
   - Clear CDN cache

## Support

For deployment issues:
1. Check the [troubleshooting section](#troubleshooting)
2. Review logs: `docker logs spicebush-web`
3. Check Supabase dashboard for API issues
4. Contact your hosting provider's support

Remember to always test in a staging environment before deploying to production!