# Phase 2.2: Deployment Automation - Detailed Micro-Instructions
Date: 2025-07-28
Time: 15:45:00

## Prerequisites Verification
Before starting Phase 2.2, ensure Phase 2.1 completion:
- ✅ GitHub Actions CI/CD pipeline implemented
- ✅ Security scanning with CodeQL and dependency audits configured
- ✅ Git repository initialized and committed
- ✅ Multi-Node.js version testing setup

## Phase 2.2 Overview
Configure automated deployment to Google Cloud Run with fallback options for other platforms. Each instruction is atomic and includes verification steps.

---

## Section A: Platform Selection and Adapter Installation

### A.1: Install Google Cloud Run Adapter
**Action**: Install the official Astro Node.js adapter for Google Cloud Run
```bash
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app
npm install @astrojs/node
```

**Verification**:
```bash
grep -q "@astrojs/node" package.json && echo "✅ Adapter installed" || echo "❌ Installation failed"
```

**Success Criteria**: `@astrojs/node` appears in package.json dependencies

**Rollback**: 
```bash
npm uninstall @astrojs/node
```

---

### A.2: Configure Astro for Node.js/Docker Deployment
**Action**: Update astro.config.mjs to use Node.js adapter
```javascript
// Edit astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://spicebushmontessori.org',
  integrations: [
    tailwind(),
    sitemap(),
    react()
  ],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  vite: {
    define: {
      'process.env': {}
    }
  }
});
```

**Verification**:
```bash
grep -q "adapter: node" app/astro.config.mjs && echo "✅ Adapter configured" || echo "❌ Configuration failed"
```

**Success Criteria**: astro.config.mjs contains `adapter: node({ mode: 'standalone' })`

**Rollback**: Revert astro.config.mjs to previous version

---

### A.3: Test Local Build with Adapter
**Action**: Build project to verify adapter configuration
```bash
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app
npm run build
```

**Verification**:
```bash
ls -la dist/ | grep -q "server" && echo "✅ Server build created" || echo "❌ Build failed"
```

**Success Criteria**: dist/server/ directory exists with server files

**Rollback**: Clean build artifacts
```bash
rm -rf dist/
```

---

## Section B: Docker Configuration for Cloud Run

### B.1: Create Production Dockerfile
**Action**: Create optimized Dockerfile for Google Cloud Run
```dockerfile
# Create Dockerfile.production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build the app
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 astro

# Copy built application
COPY --from=builder --chown=astro:nodejs /app/dist ./dist
COPY --from=deps --chown=astro:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=astro:nodejs /app/package.json ./package.json

USER astro

EXPOSE 8080

CMD ["node", "./dist/server/entry.mjs"]
```

**Verification**:
```bash
test -f Dockerfile.production && echo "✅ Production Dockerfile created" || echo "❌ Dockerfile missing"
```

**Success Criteria**: Dockerfile.production exists with multi-stage build configuration

**Rollback**: 
```bash
rm Dockerfile.production
```

---

### B.2: Create .dockerignore for Production
**Action**: Create optimized .dockerignore to reduce build context
```
# Create .dockerignore
node_modules
npm-debug.log*
.npm
.git
.gitignore
.env*
!.env.production.template
README.md
docs/
journal/
backups/
test-results/
coverage/
.astro/
dist/
*.test.js
*.spec.ts
e2e/
playwright-report/
test-plans/
tests/
```

**Verification**:
```bash
test -f .dockerignore && grep -q "node_modules" .dockerignore && echo "✅ .dockerignore created" || echo "❌ .dockerignore failed"
```

**Success Criteria**: .dockerignore exists and excludes development files

**Rollback**:
```bash
rm .dockerignore
```

---

### B.3: Test Docker Build Locally
**Action**: Build Docker image to verify configuration
```bash
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app
docker build -f Dockerfile.production -t spicebush-webapp:test .
```

**Verification**:
```bash
docker images | grep -q "spicebush-webapp:test" && echo "✅ Docker build successful" || echo "❌ Docker build failed"
```

**Success Criteria**: Docker image builds without errors

**Rollback**:
```bash
docker rmi spicebush-webapp:test
```

---

## Section C: Google Cloud Run Deployment Workflow

### C.1: Install Google Cloud CLI (if not present)
**Action**: Install gcloud CLI for local testing
```bash
# macOS with Homebrew
brew install google-cloud-sdk
# Or download from: https://cloud.google.com/sdk/docs/install
```

**Verification**:
```bash
gcloud --version && echo "✅ Google Cloud CLI installed" || echo "❌ CLI installation failed"
```

**Success Criteria**: `gcloud --version` returns version information

**Rollback**: 
```bash
brew uninstall google-cloud-sdk
```

---

### C.2: Create Cloud Run Deployment Workflow
**Action**: Create GitHub Actions workflow for Google Cloud Run
```yaml
# Create .github/workflows/deploy-cloud-run.yml
name: Deploy to Google Cloud Run

on:
  push:
    branches: [ main ]
    paths:
      - 'app/**'
  workflow_dispatch:

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  SERVICE_NAME: spicebush-webapp
  REGION: us-central1

jobs:
  deploy:
    name: Deploy to Cloud Run
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      id-token: write

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: app/package-lock.json

    - name: Install dependencies
      working-directory: ./app
      run: npm ci

    - name: Run tests
      working-directory: ./app
      run: npm test

    - name: Build application
      working-directory: ./app
      run: npm run build

    - name: Authenticate to Google Cloud
      uses: google-github-actions/auth@v2
      with:
        workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
        service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

    - name: Configure Docker for GCR
      run: gcloud auth configure-docker gcr.io

    - name: Build Docker image
      working-directory: ./app
      run: |
        docker build -f Dockerfile.production -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA .

    - name: Push Docker image
      run: |
        docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA

    - name: Deploy to Cloud Run
      run: |
        gcloud run deploy $SERVICE_NAME \
          --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA \
          --platform managed \
          --region $REGION \
          --allow-unauthenticated \
          --set-env-vars="NODE_ENV=production" \
          --memory=1Gi \
          --cpu=1 \
          --min-instances=0 \
          --max-instances=10 \
          --port=8080

    - name: Get service URL
      run: |
        SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')
        echo "Deployed to: $SERVICE_URL"
        echo "SERVICE_URL=$SERVICE_URL" >> $GITHUB_OUTPUT
```

**Verification**:
```bash
test -f .github/workflows/deploy-cloud-run.yml && echo "✅ Cloud Run workflow created" || echo "❌ Workflow creation failed"
```

**Success Criteria**: deploy-cloud-run.yml exists with complete workflow configuration

**Rollback**:
```bash
rm .github/workflows/deploy-cloud-run.yml
```

---

### C.3: Create Environment-Specific Configurations
**Action**: Create production environment configuration
```yaml
# Create .env.production (template)
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://readonly_user:password@db.host:5432/dbname

# Authentication
JWT_SECRET=your-jwt-secret-key
AUTH_REDIRECT_URL=https://your-domain.com/admin

# Site Configuration
SITE_URL=https://your-domain.com
```

**Verification**:
```bash
test -f .env.production && echo "✅ Production env template created" || echo "❌ Env template failed"
```

**Success Criteria**: .env.production contains all required environment variables

**Rollback**:
```bash
rm .env.production
```

---

## Section D: Alternative Deployment Configurations

### D.1: Create Netlify Deployment Configuration
**Action**: Create netlify.toml for alternative deployment
```toml
# Update existing netlify.toml or create new one
[build]
  base = "app/"
  publish = "app/dist/"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"
  NPM_FLAGS = "--prefix=app"

[[redirects]]
  from = "/admin/*"
  to = "/admin/index.html"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[functions]
  node_bundler = "esbuild"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

**Verification**:
```bash
test -f app/netlify.toml && grep -q "base = \"app/\"" app/netlify.toml && echo "✅ Netlify config updated" || echo "❌ Netlify config failed"
```

**Success Criteria**: netlify.toml configured for app/ subdirectory

**Rollback**: Revert netlify.toml to previous version

---

### D.2: Create Vercel Deployment Configuration
**Action**: Create vercel.json for alternative deployment
```json
{
  "version": 2,
  "buildCommand": "cd app && npm ci && npm run build",
  "outputDirectory": "app/dist",
  "installCommand": "npm install",
  "framework": "astro",
  "routes": [
    {
      "src": "/admin/(.*)",
      "dest": "/admin/index.html"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

**Verification**:
```bash
test -f vercel.json && jq -r '.buildCommand' vercel.json | grep -q "cd app" && echo "✅ Vercel config created" || echo "❌ Vercel config failed"
```

**Success Criteria**: vercel.json exists with app/ directory configuration

**Rollback**:
```bash
rm vercel.json
```

---

## Section E: Deployment Testing and Verification

### E.1: Create Deployment Health Check
**Action**: Create health check endpoint for deployment verification
```typescript
// Create app/src/pages/api/health.ts
export async function GET() {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  };

  return new Response(JSON.stringify(healthData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}
```

**Verification**:
```bash
test -f app/src/pages/api/health.ts && grep -q "status: 'healthy'" app/src/pages/api/health.ts && echo "✅ Health check created" || echo "❌ Health check failed"
```

**Success Criteria**: Health check endpoint returns JSON status

**Rollback**:
```bash
rm app/src/pages/api/health.ts
```

---

### E.2: Create Pre-deployment Test Script
**Action**: Create comprehensive pre-deployment test
```bash
#!/bin/bash
# Create scripts/pre-deployment-test.sh

set -e

echo "🚀 Starting pre-deployment tests..."

# Navigate to app directory
cd "$(dirname "$0")/../app"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting
echo "🔍 Running linting..."
npm run lint || echo "⚠️ Linting issues found"

# Run unit tests
echo "🧪 Running unit tests..."
npm test

# Build application
echo "🏗️ Building application..."
npm run build

# Verify build artifacts
if [ ! -d "dist/" ]; then
  echo "❌ Build failed - dist/ directory not found"
  exit 1
fi

if [ ! -f "dist/server/entry.mjs" ]; then
  echo "❌ Build failed - server entry not found"
  exit 1
fi

# Test Docker build (if Docker is available)
if command -v docker &> /dev/null; then
  echo "🐳 Testing Docker build..."
  docker build -f Dockerfile.production -t spicebush-test:latest .
  echo "✅ Docker build successful"
  docker rmi spicebush-test:latest
fi

# Verify environment template
if [ ! -f ".env.production" ]; then
  echo "❌ Production environment template missing"
  exit 1
fi

echo "✅ All pre-deployment tests passed!"
echo "🚀 Ready for deployment!"
```

**Verification**:
```bash
test -f scripts/pre-deployment-test.sh && chmod +x scripts/pre-deployment-test.sh && echo "✅ Pre-deployment test created" || echo "❌ Test script failed"
```

**Success Criteria**: Executable test script exists and runs without errors

**Rollback**:
```bash
rm scripts/pre-deployment-test.sh
```

---

### E.3: Run Complete Pre-deployment Test
**Action**: Execute full pre-deployment test suite
```bash
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp
./scripts/pre-deployment-test.sh
```

**Verification**: Script completes with "✅ All pre-deployment tests passed!"

**Success Criteria**: All tests pass and build artifacts are created

**Rollback**: Clean build artifacts if tests fail
```bash
cd app && rm -rf dist/ node_modules/.cache/
```

---

## Section F: Secrets and Environment Management

### F.1: Document Required Secrets for GitHub Actions
**Action**: Create comprehensive secrets documentation
```markdown
# Create docs/deployment/REQUIRED_SECRETS.md

# Required Secrets for Deployment

## GitHub Repository Secrets

### Google Cloud Run Deployment
- `GCP_PROJECT_ID`: Your Google Cloud Project ID
- `WIF_PROVIDER`: Workload Identity Federation Provider
- `WIF_SERVICE_ACCOUNT`: Service Account Email for WIF

### Database Secrets
- `SUPABASE_URL`: Production Supabase URL
- `SUPABASE_ANON_KEY`: Production Supabase Anonymous Key
- `SUPABASE_SERVICE_ROLE_KEY`: Production Service Role Key
- `DATABASE_URL`: Read-only database connection string

### Application Secrets
- `JWT_SECRET`: JWT signing secret (minimum 256-bit)
- `AUTH_REDIRECT_URL`: Production authentication redirect URL

## Setting Secrets in GitHub

1. Navigate to repository Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Add each secret with exact name and value
4. Verify all secrets are added before triggering deployment

## Google Cloud Setup (One-time)

1. Create Google Cloud Project
2. Enable Cloud Run API
3. Create Service Account for deployments
4. Set up Workload Identity Federation
5. Grant necessary permissions to service account

## Security Notes

- Never commit secrets to repository
- Use different secrets for production and staging
- Rotate secrets regularly
- Monitor secret usage in deployment logs
```

**Verification**:
```bash
test -f docs/deployment/REQUIRED_SECRETS.md && grep -q "GCP_PROJECT_ID" docs/deployment/REQUIRED_SECRETS.md && echo "✅ Secrets documentation created" || echo "❌ Documentation failed"
```

**Success Criteria**: Complete secrets documentation exists

**Rollback**:
```bash
rm docs/deployment/REQUIRED_SECRETS.md
```

---

### F.2: Create Deployment Checklist
**Action**: Create step-by-step deployment checklist
```markdown
# Create docs/deployment/DEPLOYMENT_CHECKLIST.md

# Deployment Checklist

## Pre-Deployment (Required)

### Code Preparation
- [ ] All changes committed and pushed to main branch
- [ ] No hardcoded secrets in codebase
- [ ] All tests passing locally
- [ ] Build process successful locally
- [ ] Health check endpoint functional

### Environment Setup
- [ ] Production environment variables configured
- [ ] Database migrations applied (if any)
- [ ] Read-only database user tested
- [ ] Backup of current production data created

### Security Verification
- [ ] SECURITY_DEPLOYMENT_CHECKLIST.md completed
- [ ] No test pages in production build
- [ ] Environment-specific configurations in place
- [ ] SSL/TLS certificates configured (handled by Cloud Run)

## Google Cloud Run Deployment

### Google Cloud Setup
- [ ] Google Cloud Project created
- [ ] Cloud Run API enabled
- [ ] Service Account created with necessary permissions
- [ ] Workload Identity Federation configured
- [ ] GitHub repository secrets configured

### Deployment Execution
- [ ] Push to main branch triggers deployment
- [ ] GitHub Actions workflow completes successfully
- [ ] Docker image builds and pushes successfully
- [ ] Cloud Run service deploys without errors
- [ ] Health check endpoint returns 200 OK
- [ ] Application loads correctly at deployment URL

## Post-Deployment Verification

### Functional Testing
- [ ] Home page loads correctly
- [ ] Admin authentication works
- [ ] Database connections functional
- [ ] Image loading and optimization working
- [ ] Contact forms submitting properly
- [ ] All navigation links functional

### Performance Testing
- [ ] Page load times under 3 seconds
- [ ] Images optimized and loading quickly
- [ ] Mobile responsiveness verified
- [ ] SEO meta tags present and correct

### Security Testing
- [ ] HTTPS enforced (automatic with Cloud Run)
- [ ] Security headers present
- [ ] No exposed sensitive information
- [ ] Admin panel access restricted
- [ ] Database access limited to read-only operations

## Rollback Procedure (if needed)

### Immediate Rollback
1. Navigate to Google Cloud Console > Cloud Run
2. Select the service
3. Go to Revisions tab
4. Select previous working revision
5. Click "Manage Traffic"
6. Route 100% traffic to previous revision

### Code Rollback
1. Identify last working commit: `git log --oneline`
2. Create rollback branch: `git checkout -b rollback-YYYY-MM-DD`
3. Revert to working commit: `git reset --hard <commit-hash>`
4. Push rollback: `git push origin rollback-YYYY-MM-DD`
5. Create PR to merge rollback to main
6. Deployment will trigger automatically

## Monitoring and Alerts

### Post-Deployment Monitoring
- [ ] Check Cloud Run logs for errors
- [ ] Monitor application performance metrics
- [ ] Verify database connection stability
- [ ] Test critical user journeys
- [ ] Monitor for any error reports

### Set Up Alerts (Recommended)
- [ ] Configure uptime monitoring
- [ ] Set up error rate alerts
- [ ] Monitor resource usage
- [ ] Set up notification channels

## Support Contacts

- **Primary Developer**: [Your contact information]
- **Google Cloud Support**: [Support plan details]
- **Database Administrator**: [Database support contact]
- **Emergency Contact**: [24/7 contact for critical issues]
```

**Verification**:
```bash
test -f docs/deployment/DEPLOYMENT_CHECKLIST.md && grep -q "Pre-Deployment" docs/deployment/DEPLOYMENT_CHECKLIST.md && echo "✅ Deployment checklist created" || echo "❌ Checklist failed"
```

**Success Criteria**: Complete deployment checklist exists

**Rollback**:
```bash
rm docs/deployment/DEPLOYMENT_CHECKLIST.md
```

---

## Section G: Final Integration and Testing

### G.1: Test Complete Deployment Pipeline (Dry Run)
**Action**: Test the deployment pipeline without actual deployment
```bash
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app

# Test GitHub Actions workflow syntax
echo "🔍 Validating GitHub Actions workflow..."
# Install act for local testing (optional)
# brew install act

# Validate workflow syntax
python3 -c "
import yaml
import sys
try:
    with open('.github/workflows/deploy-cloud-run.yml', 'r') as f:
        yaml.safe_load(f)
    print('✅ Workflow syntax valid')
except Exception as e:
    print(f'❌ Workflow syntax error: {e}')
    sys.exit(1)
"

# Test Docker build
echo "🐳 Testing Docker build..."
docker build -f Dockerfile.production -t spicebush-deploy-test .

# Test built image
echo "🧪 Testing built Docker image..."
docker run -d -p 8080:8080 --name spicebush-test spicebush-deploy-test

# Wait for startup
sleep 10

# Test health endpoint
echo "🏥 Testing health endpoint..."
curl -f http://localhost:8080/api/health && echo "✅ Health check passed" || echo "❌ Health check failed"

# Cleanup
docker stop spicebush-test
docker rm spicebush-test
docker rmi spicebush-deploy-test
```

**Verification**: All tests pass without errors

**Success Criteria**: Docker builds successfully and health check responds

**Rollback**: Clean up test containers and images
```bash
docker stop spicebush-test 2>/dev/null || true
docker rm spicebush-test 2>/dev/null || true
docker rmi spicebush-deploy-test 2>/dev/null || true
```

---

### G.2: Create Final Verification Script
**Action**: Create comprehensive verification script
```bash
#!/bin/bash
# Create scripts/verify-deployment-ready.sh

set -e

echo "🔍 Verifying deployment readiness..."

cd "$(dirname "$0")/../app"

# Check required files
echo "📄 Checking required files..."
required_files=(
  "astro.config.mjs"
  "Dockerfile.production"
  ".dockerignore"
  ".env.production"
  "src/pages/api/health.ts"
  ".github/workflows/deploy-cloud-run.yml"
  "../docs/deployment/REQUIRED_SECRETS.md"
  "../docs/deployment/DEPLOYMENT_CHECKLIST.md"
)

for file in "${required_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ Missing required file: $file"
    exit 1
  fi
done

# Check package.json has Node.js adapter
echo "🔌 Checking Astro adapter..."
if ! grep -q "@astrojs/node" package.json; then
  echo "❌ @astrojs/node adapter not installed"
  exit 1
fi

# Check astro.config.mjs has adapter configured
echo "⚙️ Checking adapter configuration..."
if ! grep -q "adapter: node" astro.config.mjs; then
  echo "❌ Node.js adapter not configured in astro.config.mjs"
  exit 1
fi

# Verify Docker configuration
echo "🐳 Verifying Docker configuration..."
if ! docker build -f Dockerfile.production -t verification-test . > /dev/null 2>&1; then
  echo "❌ Docker build failed"
  exit 1
fi

# Clean up test image
docker rmi verification-test > /dev/null 2>&1

# Check GitHub Actions workflow syntax
echo "🔄 Validating GitHub Actions workflow..."
python3 -c "
import yaml
with open('.github/workflows/deploy-cloud-run.yml', 'r') as f:
    yaml.safe_load(f)
print('✅ GitHub Actions workflow syntax is valid')
"

echo "✅ All deployment readiness checks passed!"
echo ""
echo "🚀 Ready to deploy! Next steps:"
echo "1. Configure GitHub repository secrets (see docs/deployment/REQUIRED_SECRETS.md)"
echo "2. Set up Google Cloud Project and Workload Identity Federation"
echo "3. Follow the deployment checklist (see docs/deployment/DEPLOYMENT_CHECKLIST.md)"
echo "4. Push to main branch to trigger deployment"

chmod +x scripts/verify-deployment-ready.sh
```

**Verification**:
```bash
./scripts/verify-deployment-ready.sh
```

**Success Criteria**: Script completes with "All deployment readiness checks passed!"

**Rollback**: Address any failing checks identified by the script

---

## Phase 2.2 Completion Summary

### Files Created/Modified:
1. **astro.config.mjs** - Added Node.js adapter configuration
2. **Dockerfile.production** - Multi-stage production Docker build
3. **.dockerignore** - Optimized build context exclusions
4. **.env.production** - Production environment template
5. **.github/workflows/deploy-cloud-run.yml** - Google Cloud Run deployment workflow
6. **app/netlify.toml** - Updated for alternative Netlify deployment
7. **vercel.json** - Created for alternative Vercel deployment
8. **app/src/pages/api/health.ts** - Health check endpoint
9. **scripts/pre-deployment-test.sh** - Comprehensive pre-deployment testing
10. **scripts/verify-deployment-ready.sh** - Final verification script
11. **docs/deployment/REQUIRED_SECRETS.md** - Secrets documentation
12. **docs/deployment/DEPLOYMENT_CHECKLIST.md** - Step-by-step deployment guide

### Dependencies Added:
- `@astrojs/node` - Node.js adapter for server-side rendering

### Key Features Implemented:
- ✅ Google Cloud Run deployment configuration
- ✅ Alternative deployment options (Netlify, Vercel)
- ✅ Production-optimized Docker configuration
- ✅ Automated GitHub Actions deployment workflow
- ✅ Health check endpoint for monitoring
- ✅ Comprehensive testing and verification scripts
- ✅ Detailed documentation and checklists
- ✅ Security-first deployment approach

### Next Steps:
1. **Configure Google Cloud Project** and Workload Identity Federation
2. **Set GitHub repository secrets** as documented
3. **Follow deployment checklist** for first deployment
4. **Monitor deployment** using health checks and logs

### Success Metrics:
- All verification scripts pass without errors
- Docker image builds successfully
- GitHub Actions workflow validates correctly
- Health check endpoint responds appropriately
- Documentation is complete and actionable

The application is now fully configured for automated deployment to Google Cloud Run with comprehensive fallback options and monitoring capabilities.