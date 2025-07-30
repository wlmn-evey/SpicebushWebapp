# Docker Known Issues Documentation

This document provides comprehensive information about known Docker environment issues and their workarounds for the SpicebushWebapp project.

## Table of Contents
1. [Overview](#overview)
2. [Known Issues](#known-issues)
3. [Workarounds and Solutions](#workarounds-and-solutions)
4. [Platform-Specific Considerations](#platform-specific-considerations)
5. [Best Practices](#best-practices)
6. [Quick Reference](#quick-reference)

## Overview

The SpicebushWebapp uses Docker for local development with a comprehensive Supabase stack. While the system is functional and production-ready, there are some known issues that developers may encounter during setup or development.

**Current Status**: All critical and high-priority Docker issues have been resolved. The remaining items documented here are edge cases and informational notes for future developers.

## Known Issues

### 1. Auth Schema Ownership Conflicts

**Issue**: When running migrations, you might see warnings about schema ownership for the `auth` schema.

**Symptoms**:
```
WARNING: auth schema ownership conflict
ERROR: permission denied for schema auth
```

**Impact**: Low - The application functions correctly despite these warnings.

**Root Cause**: Supabase's auth schema is created by the auth service with specific permissions that may conflict with migration user permissions.

### 2. Storage Container Initial Setup

**Issue**: The storage container may fail on first run if the storage directory doesn't exist.

**Symptoms**:
```
supabase-storage | Error: ENOENT: no such file or directory
supabase-storage | Failed to initialize storage backend
```

**Impact**: Low - Only affects first-time setup.

**Root Cause**: The storage volume directory needs to be created before the container starts.

### 3. Vector Service Configuration

**Issue**: The Vector logging service is currently commented out due to configuration complexity.

**Symptoms**: No centralized logging aggregation in development.

**Impact**: Low - Logging still works through individual container logs.

**Root Cause**: Vector requires specific permissions and Docker socket access that can be complex to configure across different platforms.

### 4. Platform-Specific Build Times

**Issue**: Docker builds may be slower on Apple Silicon (M1/M2) Macs due to platform emulation.

**Symptoms**: 
- Build times 2-3x slower than on Intel machines
- `platform: linux/amd64` warnings during build

**Impact**: Low - Only affects development build times, not runtime performance.

### 5. Analytics Service Dependency

**Issue**: Some services have commented-out dependencies on the analytics service.

**Symptoms**: Services start without waiting for analytics to be healthy.

**Impact**: None - Services handle this gracefully.

## Workarounds and Solutions

### Auth Schema Ownership

**Workaround 1**: Ignore the warnings
```bash
# The warnings can be safely ignored as they don't affect functionality
docker compose up -d
```

**Workaround 2**: Run migrations with superuser
```bash
# Connect to the database
docker compose exec supabase-db psql -U postgres

# Grant necessary permissions
GRANT ALL ON SCHEMA auth TO supabase_admin;
```

### Storage Container Initialization

**Solution**: Create the storage directory before first run
```bash
# Create necessary directories
mkdir -p docker/volumes/storage

# Set proper permissions (Linux/Mac)
chmod 755 docker/volumes/storage

# Then start the containers
docker compose up -d
```

### Vector Service Alternative

**Alternative 1**: Use Docker's built-in logging
```bash
# View logs for a specific service
docker compose logs -f app

# View all logs
docker compose logs -f

# Save logs to file
docker compose logs > docker-logs.txt
```

**Alternative 2**: Use lightweight logging solution
```yaml
# Add to docker-compose.yml if needed
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Platform-Specific Build Optimization

**For Apple Silicon Macs**:
```bash
# Use buildx for better performance
docker buildx create --use

# Build with cache
docker compose build --build-arg BUILDKIT_INLINE_CACHE=1

# Or use native arm64 images where possible
# (Note: Some Supabase images may not have arm64 versions)
```

## Platform-Specific Considerations

### macOS
- Ensure Docker Desktop has sufficient resources allocated (at least 4GB RAM)
- File sharing performance can be improved by using delegated mounts
- Use `.dockerignore` to exclude `node_modules` from build context

### Linux
- May need to run Docker commands with `sudo` or add user to docker group
- Ensure proper permissions on volume directories
- SELinux users may need to add `:Z` flag to volume mounts (already included)

### Windows
- Use WSL2 backend for better performance
- Ensure line endings are LF, not CRLF
- Volume paths may need adjustment for Windows paths

## Best Practices

### 1. Resource Management
```yaml
# Add to services that need limits
deploy:
  resources:
    limits:
      memory: 2G
    reservations:
      memory: 1G
```

### 2. Health Checks
All critical services already have health checks configured. Ensure any new services include them:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:PORT/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### 3. Network Isolation
All services use the `spicebush-network` for isolation. Continue this pattern for new services.

### 4. Environment Variables
Always use the `.env.example` as a template:
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

## Quick Reference

### Common Commands
```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f [service-name]

# Rebuild after changes
docker compose build --no-cache app

# Reset everything (WARNING: destroys data)
docker compose down -v
rm -rf docker/volumes/db/data
```

### Service URLs
- App: http://localhost:4321
- Supabase Studio: http://localhost:3000
- API Gateway: http://localhost:54321
- MailHog: http://localhost:8025
- Database: localhost:54322

### Debugging Commands
```bash
# Check service health
docker compose ps

# Inspect a service
docker compose exec [service-name] sh

# Check resource usage
docker stats

# Clean up unused resources
docker system prune -a
```

## Notes for Future Development

1. **Vector Service**: Could be re-enabled with proper configuration for production logging needs
2. **Resource Limits**: Consider adding explicit resource limits for production deployment
3. **Secret Management**: Current setup uses default secrets - use proper secret management for production
4. **Backup Strategy**: Implement automated backups for the database volume
5. **Monitoring**: Consider adding Prometheus/Grafana for production monitoring

## Conclusion

The Docker setup is production-ready with all critical issues resolved. The items documented here are minor edge cases that don't affect the application's functionality. Most developers will not encounter these issues during normal development.

For any new issues discovered, please update this documentation and consider contributing fixes back to the project.