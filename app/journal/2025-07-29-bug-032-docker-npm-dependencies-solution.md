# Bug #032 - Docker Missing Dependencies Solution Design

## Date: 2025-07-29
## Author: Claude (Project Architect)
## Bug ID: #032
## Status: Solution Designed

## Executive Summary

Docker build is failing due to npm packages not being properly installed or accessible within the container. This critical issue prevents the development environment from starting, blocking all containerized development work.

## Root Cause Analysis

After examining the Docker configuration, I've identified several potential root causes:

### 1. **Volume Mount Conflicts**
- The `docker-compose.yml` mounts the entire app directory but excludes `node_modules` with a separate volume
- This can create permission issues and stale module problems

### 2. **Permission Issues**
- The Dockerfiles switch between root and non-root users during build
- npm install runs as root, but the app runs as the `astro` user
- This can cause permission mismatches on the node_modules directory

### 3. **Docker Layer Caching Issues**
- The current setup copies package*.json files before running npm install
- If package-lock.json is out of sync or corrupted, npm install may not install all dependencies

### 4. **npm Install Flags**
- Using `--legacy-peer-deps` can sometimes skip certain dependencies
- The production install uses `--only=production` which might miss dev dependencies needed for build

### 5. **Missing Platform-Specific Binaries**
- Packages like `sharp` require platform-specific binaries
- These might not be properly compiled for the Alpine Linux container

## Comprehensive Solution Design

### Phase 1: Immediate Fixes

#### 1.1 Enhanced Dockerfile with Better Dependency Management

```dockerfile
# Stage 1: Base image with all system dependencies
FROM node:20-alpine AS base

# Install ALL required system dependencies upfront
RUN apk add --no-cache \
    git \
    vips-dev \
    fftw-dev \
    build-base \
    gcc \
    g++ \
    make \
    python3 \
    libc6-compat \
    # Additional dependencies for various npm packages
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

WORKDIR /app

# Create user with proper UID/GID
RUN addgroup -g 1001 -S nodejs && \
    adduser -S astro -u 1001 -G nodejs

# Stage 2: Dependency resolver
FROM base AS deps

# Copy package files with explicit ownership
COPY --chown=astro:nodejs package*.json ./

# Clear npm cache and set up fresh install
RUN npm cache clean --force && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000

# Install dependencies with error handling
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --loglevel verbose || \
    (cat npm-debug.log && exit 1)

# Verify critical packages are installed
RUN node -e "
    const requiredPackages = [
        'lucide-astro',
        'bcryptjs',
        'decap-cms-app',
        'jsonwebtoken',
        'sharp',
        'astro',
        '@astrojs/node',
        '@astrojs/react',
        '@astrojs/tailwind',
        '@supabase/supabase-js'
    ];
    requiredPackages.forEach(pkg => {
        try {
            require.resolve(pkg);
            console.log(`✓ ${pkg} found`);
        } catch (e) {
            console.error(`✗ ${pkg} NOT FOUND`);
            process.exit(1);
        }
    });
"

# Fix permissions after install
RUN chown -R astro:nodejs /app
```

#### 1.2 Improved Docker Compose Configuration

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
      target: development
      # Add build args for better caching
      args:
        - NODE_ENV=development
    ports:
      - "4321:4321"
    volumes:
      # Mount source but preserve node_modules
      - .:/app:delegated
      - /app/node_modules
      - /app/.astro
      # Add npm cache volume for faster rebuilds
      - npm-cache:/home/astro/.npm
    environment:
      - NODE_ENV=development
      - NPM_CONFIG_LOGLEVEL=verbose
      # Force npm to use the container's node_modules
      - NODE_PATH=/app/node_modules
    # Add init flag for proper signal handling
    init: true
    # Resource limits to prevent OOM during install
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G

volumes:
  npm-cache:
    driver: local
```

#### 1.3 Enhanced Entrypoint Script

```bash
#!/bin/sh
set -e

echo "=== Docker Entrypoint Starting ==="
echo "User: $(whoami) (UID: $(id -u), GID: $(id -g))"
echo "Working directory: $(pwd)"

# Check if node_modules exists and has content
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
    echo "ERROR: node_modules is missing or empty!"
    echo "This indicates the Docker build failed to install dependencies."
    exit 1
fi

# Verify critical packages
echo "=== Verifying installed packages ==="
node -e "
const packages = ['astro', 'lucide-astro', 'sharp', 'bcryptjs'];
packages.forEach(pkg => {
    try {
        const path = require.resolve(pkg);
        console.log('✓ ' + pkg + ': ' + path);
    } catch (e) {
        console.error('✗ ' + pkg + ': NOT FOUND');
        process.exit(1);
    }
});
"

# Check and fix .astro directory permissions
if [ ! -d ".astro" ]; then
    echo "Creating .astro directory..."
    mkdir -p .astro
fi

# Ensure we own the .astro directory
if [ -w ".astro" ]; then
    echo "✓ .astro directory is writable"
else
    echo "✗ .astro directory is not writable"
    ls -la . | grep astro || true
fi

echo "=== Starting application ==="
exec "$@"
```

### Phase 2: Build Optimization

#### 2.1 Multi-stage Build with Verification

```dockerfile
# Development stage with full debugging
FROM deps AS development

# Install development tools
RUN npm install -g \
    npm-check \
    npm-audit-resolver \
    node-gyp

# Copy source with ownership
COPY --chown=astro:nodejs . .

# Create necessary directories with proper permissions
RUN mkdir -p .astro && \
    chown -R astro:nodejs .astro && \
    chmod 755 .astro

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4321', (r) => {if (r.statusCode !== 200 && r.statusCode !== 404) throw new Error(r.statusCode)})" || exit 1

USER astro

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "4321"]
```

#### 2.2 Package Lock Validation Script

Create `scripts/validate-package-lock.js`:

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('Validating package-lock.json...');

try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const lockJson = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
    
    // Check lock file version
    if (lockJson.lockfileVersion !== 3) {
        console.warn('⚠️  package-lock.json is not version 3, consider running npm install with npm 9+');
    }
    
    // Verify all dependencies exist in lock file
    const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
    };
    
    let missing = [];
    for (const [pkg, version] of Object.entries(allDeps)) {
        if (!lockJson.packages[`node_modules/${pkg}`]) {
            missing.push(`${pkg}@${version}`);
        }
    }
    
    if (missing.length > 0) {
        console.error('❌ Missing packages in package-lock.json:');
        missing.forEach(pkg => console.error(`   - ${pkg}`));
        process.exit(1);
    }
    
    console.log('✅ package-lock.json is valid');
} catch (error) {
    console.error('❌ Error validating package-lock.json:', error.message);
    process.exit(1);
}
```

### Phase 3: Debugging and Recovery Tools

#### 3.1 Docker Debug Script

Create `scripts/docker-debug.sh`:

```bash
#!/bin/bash

echo "=== Docker NPM Debug Script ==="

# Check if container is running
CONTAINER=$(docker-compose ps -q app)
if [ -z "$CONTAINER" ]; then
    echo "❌ App container is not running"
    exit 1
fi

echo "Container ID: $CONTAINER"

# Check node_modules in container
echo -e "\n=== Checking node_modules in container ==="
docker exec $CONTAINER sh -c "ls -la node_modules | head -20"

# Check specific packages
echo -e "\n=== Checking for missing packages ==="
PACKAGES=(
    "lucide-astro"
    "bcryptjs"
    "decap-cms-app"
    "jsonwebtoken"
    "sharp"
    "@astrojs/node"
    "@astrojs/react"
    "@astrojs/tailwind"
    "@supabase/supabase-js"
)

for pkg in "${PACKAGES[@]}"; do
    if docker exec $CONTAINER sh -c "test -d node_modules/$pkg"; then
        echo "✅ $pkg exists"
    else
        echo "❌ $pkg is MISSING"
    fi
done

# Check npm config
echo -e "\n=== NPM Configuration ==="
docker exec $CONTAINER npm config list

# Check file permissions
echo -e "\n=== File Permissions ==="
docker exec $CONTAINER sh -c "ls -la . | grep -E '(node_modules|package|\.astro)'"

# Check disk space
echo -e "\n=== Disk Space ==="
docker exec $CONTAINER df -h /app
```

#### 3.2 Recovery Procedure

Create `scripts/docker-recovery.sh`:

```bash
#!/bin/bash

echo "=== Docker NPM Recovery Procedure ==="

# Stop containers
echo "1. Stopping containers..."
docker-compose down

# Remove problematic volumes
echo "2. Removing node_modules volume..."
docker volume rm spicebushwebapp_node_modules 2>/dev/null || true

# Clear Docker build cache
echo "3. Clearing Docker build cache..."
docker builder prune -f

# Remove package-lock if corrupted
echo "4. Regenerating package-lock.json..."
cp package-lock.json package-lock.json.backup
rm package-lock.json
npm install --package-lock-only

# Rebuild with no cache
echo "5. Rebuilding containers..."
docker-compose build --no-cache

# Start services
echo "6. Starting services..."
docker-compose up -d

# Wait for startup
echo "7. Waiting for services to start..."
sleep 10

# Run diagnostic
echo "8. Running diagnostic..."
./scripts/docker-debug.sh
```

### Phase 4: Long-term Improvements

#### 4.1 GitHub Actions for Docker Build Validation

```yaml
name: Docker Build Validation

on:
  push:
    paths:
      - 'package*.json'
      - 'Dockerfile*'
      - 'docker-compose*.yml'
  pull_request:
    paths:
      - 'package*.json'
      - 'Dockerfile*'
      - 'docker-compose*.yml'

jobs:
  validate-docker-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate package-lock.json
        run: node scripts/validate-package-lock.js
      
      - name: Build Docker image
        run: docker build -f Dockerfile.dev --target development -t test-build .
      
      - name: Test container startup
        run: |
          docker run -d --name test-app test-build
          sleep 30
          docker exec test-app node -e "require('astro')"
          docker exec test-app node -e "require('sharp')"
```

#### 4.2 Docker Compose Override for Development

Create `docker-compose.override.yml`:

```yaml
# Development overrides - not committed to git
services:
  app:
    build:
      args:
        - BUILDKIT_INLINE_CACHE=1
    environment:
      - DEBUG=*
      - NPM_CONFIG_LOGLEVEL=silly
    volumes:
      # Mount npm cache from host for faster rebuilds
      - ~/.npm:/home/astro/.npm:cached
```

## Implementation Plan

### Step 1: Immediate Actions (Day 1)
1. Update Dockerfile.dev with enhanced dependency installation
2. Add package verification step to build process
3. Implement the enhanced entrypoint script
4. Update docker-compose.yml with resource limits and npm cache volume

### Step 2: Validation and Testing (Day 1-2)
1. Run docker-recovery.sh to clean environment
2. Test build with all required packages
3. Verify hot reload functionality
4. Document any remaining issues

### Step 3: Optimization (Day 2-3)
1. Implement build caching improvements
2. Add GitHub Actions validation
3. Create debugging and recovery scripts
4. Update developer documentation

## Success Metrics

1. All 11+ missing packages successfully install
2. Docker build completes without errors
3. Container starts and serves the application
4. Hot reload works in development
5. Build time reduced by 50% with proper caching
6. No permission errors in logs

## Risk Mitigation

1. **Backup current working setup** before implementing changes
2. **Test in isolated environment** first
3. **Keep recovery scripts** ready
4. **Document all changes** in journal
5. **Monitor for regression** in CI/CD pipeline

## Notes for Implementation

- Always run `npm ci` instead of `npm install` in Docker for reproducible builds
- Use `--mount=type=cache` for npm cache in BuildKit
- Set proper NODE_ENV for each stage
- Verify sharp binary compatibility with Alpine Linux
- Consider using npm workspaces if monorepo structure emerges