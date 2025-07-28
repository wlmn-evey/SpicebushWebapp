# Docker and Supabase Stack Fixes

*Date: 2025-07-17*
*Issue: Docker build hanging on file permissions*
*Status: Fixed - Ready for testing*

## Problem Identified

The full Supabase Docker stack was hanging during build due to:
- `chown -R astro:nodejs /app` command in Dockerfile.dev
- This operation on the entire /app directory (including node_modules) causes infinite hangs
- Common issue with Docker on macOS due to filesystem performance

## Solutions Implemented

### 1. Fixed Original Dockerfile.dev
- Modified to only chown node_modules directory (faster)
- Copy source code with --chown flag to avoid separate permission change
- Switch to non-root user before copying source

### 2. Created Optimized Dockerfile (Dockerfile.dev.optimized)
- Uses built-in `node` user instead of creating custom user
- Sets ownership during directory creation and copy operations
- Avoids recursive chown operations entirely
- More efficient and macOS-friendly approach

### 3. Created Fixed Docker Compose (docker-compose.fixed.yml)
- Uses the optimized Dockerfile
- Includes full Supabase stack configuration
- Fixed service dependencies and networking
- Added `:delegated` flag for better macOS volume performance

### 4. Added NPM Scripts
```bash
npm run docker:dev:fixed      # Start fixed full stack
npm run docker:down:fixed     # Stop fixed stack
npm run docker:reset:fixed    # Reset and rebuild fixed stack
```

## Testing Instructions

1. **Ensure Docker Desktop is running**
   - Open Docker Desktop application
   - Wait for Docker Engine to start

2. **Start the fixed Supabase stack:**
   ```bash
   npm run docker:dev:fixed
   ```

3. **Access services:**
   - Astro App: http://localhost:4321
   - Supabase Studio: http://localhost:3000
   - Supabase API: http://localhost:54321
   - MailHog: http://localhost:8025
   - PostgreSQL: localhost:54322

4. **If you encounter issues:**
   - Try the reset command: `npm run docker:reset:fixed`
   - Check Docker logs: `docker-compose -f docker-compose.fixed.yml logs`
   - Fall back to simple mode: `npm run docker:dev:simple`

## Key Changes from Original

1. **Permission Strategy**: Instead of recursive chown on entire directory, we:
   - Use --chown flag during COPY operations
   - Only chown specific directories when needed
   - Use built-in node user for simplicity

2. **Build Optimization**: 
   - Install dependencies before switching users
   - Copy source after user switch with proper ownership
   - Avoid operations that trigger macOS filesystem issues

3. **Volume Performance**:
   - Added `:delegated` flag for better performance on macOS
   - Kept node_modules as anonymous volume

## Next Steps

1. Test the fixed configuration with full Supabase stack
2. Monitor build times and performance
3. If successful, update main docker-compose.yml with fixes
4. Update DOCKER_DEVELOPMENT.md documentation

## Environment Details

- All Supabase services use default demo credentials (safe for local dev)
- JWT secret configured for local development
- Email testing via MailHog on port 1025/8025
- Database accessible on port 54322 with password from .env.local