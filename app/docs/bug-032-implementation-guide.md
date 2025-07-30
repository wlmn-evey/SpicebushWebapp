# Bug #032 - Docker Missing Dependencies: Implementation Guide

## Quick Start

If you need to fix this issue immediately:

```bash
# 1. Run the recovery script
./scripts/docker-recovery.sh

# 2. If recovery fails, use the fixed Docker configuration
cp docker/Dockerfile.dev.fixed Dockerfile.dev
cp docker-entrypoint-fixed.sh docker-entrypoint.sh
chmod +x docker-entrypoint.sh

# 3. Rebuild with the fixed configuration
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

## Detailed Implementation Steps

### Step 1: Diagnosis

First, verify the issue exists:

```bash
# Check current state
./scripts/docker-debug.sh
```

Expected output showing missing packages:
- ✗ lucide-astro - MISSING
- ✗ bcryptjs - MISSING
- ✗ decap-cms-app - MISSING
- etc.

### Step 2: Validate Package Files

```bash
# Check if package-lock.json is valid
node scripts/validate-package-lock.js
```

If validation fails, the lock file needs regeneration.

### Step 3: Apply the Fix

#### Option A: Automated Recovery (Recommended)

```bash
# This will handle everything automatically
./scripts/docker-recovery.sh
```

The recovery script will:
1. Stop all containers
2. Remove problematic volumes
3. Clear Docker cache
4. Regenerate package-lock.json
5. Rebuild containers
6. Run diagnostics

#### Option B: Manual Fix

If automated recovery fails:

1. **Stop and clean Docker environment:**
   ```bash
   docker-compose down -v
   docker system prune -f
   ```

2. **Apply fixed Dockerfile:**
   ```bash
   cp docker/Dockerfile.dev.fixed Dockerfile.dev
   cp docker-entrypoint-fixed.sh docker-entrypoint.sh
   chmod +x docker-entrypoint.sh
   ```

3. **Regenerate package-lock.json:**
   ```bash
   rm package-lock.json
   npm install --package-lock-only --legacy-peer-deps
   ```

4. **Use fixed docker-compose:**
   ```bash
   cp docker-compose.dev.fixed.yml docker-compose.yml
   ```

5. **Rebuild and start:**
   ```bash
   docker-compose build --no-cache
   docker-compose up
   ```

### Step 4: Verify the Fix

After applying the fix, verify everything works:

```bash
# Run diagnostic
./scripts/docker-debug.sh

# Check container logs
docker-compose logs -f app

# Test the application
curl http://localhost:4321
```

Expected results:
- All critical packages show as ✓ installed
- Container starts without errors
- Application responds on port 4321

## Understanding the Fix

### Root Causes Addressed

1. **Permission Issues**
   - Fixed by ensuring consistent ownership throughout build
   - User 'astro' (UID 1001) owns all application files

2. **Missing System Dependencies**
   - Added comprehensive Alpine packages for native modules
   - Includes cairo, pango, giflib for image processing

3. **npm Install Failures**
   - Added retry logic and verbose logging
   - Verification step ensures all packages installed

4. **Volume Mount Conflicts**
   - Proper volume exclusion for node_modules
   - Added npm cache volume for faster rebuilds

5. **Build Layer Optimization**
   - Multi-stage build with proper caching
   - Resource limits prevent OOM errors

### Key Changes in Fixed Dockerfile

```dockerfile
# Enhanced system dependencies
RUN apk add --no-cache \
    cairo-dev jpeg-dev pango-dev giflib-dev \
    pixman-dev pangomm-dev libjpeg-turbo-dev freetype-dev

# Improved npm configuration
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000

# Package verification
RUN node -e "verify all critical packages..."

# Better error handling
RUN npm ci || (cat npm-debug.log && exit 1)
```

### Key Changes in Docker Compose

```yaml
# Resource management
deploy:
  resources:
    limits:
      memory: 4G
    reservations:
      memory: 2G

# Volume optimization
volumes:
  - .:/app:delegated
  - /app/node_modules  # Preserve from image
  - npm-cache:/home/astro/.npm  # Cache npm

# Extended health check
healthcheck:
  start_period: 120s  # Allow time for npm dev
```

## Troubleshooting

### Issue: Container keeps restarting

Check logs for specific errors:
```bash
docker-compose logs --tail 100 app | grep -i error
```

### Issue: Permission denied errors

Reset ownership:
```bash
docker-compose exec app chown -R astro:nodejs /app
```

### Issue: Out of memory during build

Increase Docker memory allocation or use:
```bash
docker-compose build --no-cache --memory 6g app
```

### Issue: Network timeouts during npm install

Add proxy configuration if behind firewall:
```bash
docker-compose build --build-arg HTTP_PROXY=$HTTP_PROXY app
```

## Prevention

To prevent this issue in the future:

1. **Commit package-lock.json** after any package changes
2. **Run validation** before pushing:
   ```bash
   node scripts/validate-package-lock.js
   ```
3. **Test Docker builds** in CI/CD pipeline
4. **Monitor container health** in production

## Rollback Plan

If the fix causes issues:

1. Restore original files:
   ```bash
   git checkout Dockerfile.dev docker-entrypoint.sh docker-compose.yml
   ```

2. Use backup package-lock.json:
   ```bash
   cp package-lock.json.backup.* package-lock.json
   ```

3. Rebuild with original configuration

## Additional Resources

- [Docker build best practices](https://docs.docker.com/develop/dev-best-practices/)
- [npm install in Docker](https://docs.npmjs.com/cli/v8/commands/npm-ci)
- [Alpine Linux package management](https://wiki.alpinelinux.org/wiki/Alpine_Linux_package_management)

## Support

If issues persist after following this guide:

1. Collect diagnostic information:
   ```bash
   ./scripts/docker-debug.sh > docker-debug.log 2>&1
   docker-compose logs > docker-logs.log 2>&1
   ```

2. Check for similar issues in project journal:
   ```bash
   grep -r "docker\|npm\|dependencies" journal/
   ```

3. Document findings in new journal entry for future reference