# Deployment Pipeline Documentation

## Overview
This document outlines the deployment pipeline for the Spicebush Montessori website, covering development, staging (if applicable), and production environments. It includes CI/CD configuration, environment-specific settings, and rollback procedures.

## Environment Overview

### Development Environment
- **Purpose**: Local development and testing
- **Infrastructure**: Docker Compose on developer machines
- **Database**: Local PostgreSQL in Docker
- **URLs**: 
  - App: http://localhost:4321
  - Supabase: http://localhost:54321

### Staging Environment (Planned)
- **Purpose**: Pre-production testing
- **Infrastructure**: Similar to production
- **Database**: Separate Supabase project
- **URL**: https://staging.spicebushmontessori.org

### Production Environment
- **Purpose**: Live website
- **Infrastructure**: Cloud hosting (Netlify/Vercel/Custom)
- **Database**: Supabase Cloud
- **URL**: https://spicebushmontessori.org

## CI/CD Configuration

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type checking
        run: npm run typecheck
      
      - name: Run tests
        run: npm test
      
      - name: Run linting
        run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        env:
          PUBLIC_SUPABASE_URL: ${{ secrets.PUBLIC_SUPABASE_URL }}
          PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.PUBLIC_SUPABASE_ANON_KEY }}
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-output
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-output
          path: dist/
      
      - name: Deploy to production
        run: |
          # Deployment script here
          echo "Deploying to production..."
```

### Pre-deployment Checklist

```bash
#!/bin/bash
# scripts/pre-deploy-check.sh

echo "Running pre-deployment checks..."

# 1. Check environment variables
required_vars=(
  "PUBLIC_SUPABASE_URL"
  "PUBLIC_SUPABASE_ANON_KEY"
  "DATABASE_URL"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Error: $var is not set"
    exit 1
  fi
done

# 2. Run tests
npm test || exit 1

# 3. Check build
npm run build || exit 1

# 4. Verify database migrations
echo "Checking database migrations..."
# Add migration check logic

echo "Pre-deployment checks passed!"
```

## Production Deployment Process

### 1. Build Process
```bash
# Install production dependencies only
npm ci --production

# Build with production optimizations
NODE_ENV=production npm run build

# Generate sitemap
npm run generate:sitemap

# Optimize images
npm run optimize:images
```

### 2. Environment Configuration

#### Production Environment Variables
```bash
# Supabase
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-key

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Application
NODE_ENV=production
SITE_URL=https://spicebushmontessori.org

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key

# Security
JWT_SECRET=production-secret-min-32-chars
SESSION_SECRET=production-session-secret

# Optional Services
STRIPE_SECRET_KEY=sk_live_...
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 3. Database Migrations

```bash
# Migration script for production
#!/bin/bash

echo "Running database migrations..."

# Export connection details
export PGHOST=$DATABASE_HOST
export PGUSER=$DATABASE_USER
export PGPASSWORD=$DATABASE_PASSWORD
export PGDATABASE=$DATABASE_NAME

# Run migrations in order
for migration in supabase/migrations/*.sql; do
  echo "Applying $migration..."
  psql -f "$migration"
  
  if [ $? -ne 0 ]; then
    echo "Migration failed: $migration"
    exit 1
  fi
done

echo "Migrations completed successfully"
```

### 4. Deployment Steps

#### Option A: Netlify Deployment
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
```

#### Option B: Docker Deployment
```dockerfile
# Dockerfile.production
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

EXPOSE 3000
CMD ["npm", "start"]
```

#### Option C: Traditional VPS
```bash
# Deploy script
#!/bin/bash

# Build locally
npm run build

# Transfer files
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.env.local' \
  dist/ user@server:/var/www/spicebush/

# Install dependencies on server
ssh user@server "cd /var/www/spicebush && npm ci --production"

# Restart application
ssh user@server "pm2 restart spicebush"
```

## Environment-Specific Configurations

### Development Overrides
```javascript
// config/development.js
export default {
  debug: true,
  cache: false,
  minify: false,
  sourceMaps: true,
  hotReload: true
}
```

### Production Optimizations
```javascript
// config/production.js
export default {
  debug: false,
  cache: true,
  minify: true,
  sourceMaps: false,
  compression: 'gzip',
  cdn: {
    enabled: true,
    url: 'https://cdn.spicebushmontessori.org'
  }
}
```

## Rollback Procedures

### Automated Rollback
```yaml
# GitHub Action for rollback
name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to rollback to'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - name: Rollback to version
        run: |
          # Rollback logic here
          echo "Rolling back to version ${{ github.event.inputs.version }}"
```

### Manual Rollback Steps
1. **Identify the issue**
   ```bash
   # Check application logs
   tail -f /var/log/spicebush/app.log
   
   # Check error rates
   curl https://api.monitoring.com/errors
   ```

2. **Rollback database if needed**
   ```sql
   -- Rollback migration
   BEGIN;
   -- Rollback SQL here
   COMMIT;
   ```

3. **Redeploy previous version**
   ```bash
   # Using Git tags
   git checkout v1.2.3
   npm run deploy:production
   
   # Using Docker
   docker pull spicebush:v1.2.3
   docker stop spicebush-current
   docker run -d --name spicebush spicebush:v1.2.3
   ```

4. **Verify rollback**
   ```bash
   # Health check
   curl https://spicebushmontessori.org/api/health
   
   # Version check
   curl https://spicebushmontessori.org/api/version
   ```

## Monitoring and Alerts

### Health Checks
```typescript
// pages/api/health.ts
export async function GET() {
  const checks = {
    app: 'healthy',
    database: await checkDatabase(),
    storage: await checkStorage(),
    email: await checkEmail()
  };
  
  const healthy = Object.values(checks).every(v => v === 'healthy');
  
  return new Response(JSON.stringify({
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString()
  }), {
    status: healthy ? 200 : 503,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Deployment Notifications
```bash
# Send deployment notification
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-type: application/json' \
  -d '{
    "text": "Deployment completed",
    "attachments": [{
      "color": "good",
      "fields": [{
        "title": "Version",
        "value": "'$VERSION'",
        "short": true
      }, {
        "title": "Environment",
        "value": "Production",
        "short": true
      }]
    }]
  }'
```

## Security Considerations

### Pre-deployment Security Scan
```bash
# Security audit
npm audit --production

# Dependency check
npm run check:dependencies

# Secret scanning
git secrets --scan
```

### Production Security Headers
```nginx
# nginx.conf
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
```

## Post-Deployment Verification

### Automated Tests
```bash
# Run smoke tests
npm run test:smoke

# Run E2E tests against production
PLAYWRIGHT_BASE_URL=https://spicebushmontessori.org npm run test:e2e
```

### Manual Verification Checklist
- [ ] Homepage loads correctly
- [ ] Navigation works
- [ ] Forms submit successfully
- [ ] Images load properly
- [ ] Admin panel accessible
- [ ] Database queries work
- [ ] Email notifications sent
- [ ] SSL certificate valid

This deployment pipeline ensures reliable, secure deployments with proper testing, monitoring, and rollback capabilities. Always follow the checklist and verify deployments thoroughly.