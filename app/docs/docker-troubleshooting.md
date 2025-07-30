# Docker Troubleshooting Guide

This guide helps developers quickly resolve common Docker-related issues in the SpicebushWebapp project.

## Quick Diagnostics

Run this checklist first when encountering issues:

```bash
# 1. Check if Docker is running
docker --version
docker compose version

# 2. Check service status
docker compose ps

# 3. Check for errors in logs
docker compose logs --tail=50

# 4. Check resource usage
docker stats --no-stream
```

## Common Issues and Solutions

### 1. Services Won't Start

#### Symptom: `docker compose up` fails or hangs

**Solution A**: Check Docker resources
```bash
# macOS: Docker Desktop > Settings > Resources
# Ensure at least 4GB RAM and 2 CPUs allocated
```

**Solution B**: Clean start
```bash
docker compose down -v
docker system prune -a --volumes
docker compose up -d
```

**Solution C**: Check port conflicts
```bash
# Check if ports are already in use
lsof -i :4321  # App port
lsof -i :3000  # Supabase Studio
lsof -i :54321 # API Gateway
lsof -i :54322 # Database
```

### 2. Database Connection Errors

#### Symptom: "ECONNREFUSED" or "connection timeout"

**Solution A**: Wait for database to be ready
```bash
# Check database health
docker compose exec supabase-db pg_isready

# View database logs
docker compose logs supabase-db --tail=50
```

**Solution B**: Use correct connection string
```bash
# Local development connection
DATABASE_URL=postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:54322/postgres

# Container-to-container connection
DATABASE_URL=postgresql://postgres:your-super-secret-and-long-postgres-password@supabase-db:5432/postgres
```

### 3. Build Failures

#### Symptom: "npm install" fails or times out

**Solution A**: Clear Docker cache
```bash
docker compose build --no-cache app
```

**Solution B**: Increase build timeout
```bash
COMPOSE_HTTP_TIMEOUT=200 docker compose build
```

**Solution C**: Check network connectivity
```bash
# Test npm registry access
docker run --rm node:18-alpine npm ping
```

### 4. Permission Errors

#### Symptom: "Permission denied" on volumes

**Solution A**: Fix volume permissions (Linux/Mac)
```bash
# Find your user ID
id -u

# Set ownership
sudo chown -R $(id -u):$(id -g) docker/volumes/

# Set permissions
chmod -R 755 docker/volumes/
```

**Solution B**: Use proper mount flags
```yaml
# In docker-compose.yml
volumes:
  - ./path:/container/path:z  # SELinux systems
  - ./path:/container/path:delegated  # macOS performance
```

### 5. Out of Memory Errors

#### Symptom: Container exits with code 137

**Solution A**: Increase memory limits
```yaml
# In docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

**Solution B**: Check for memory leaks
```bash
# Monitor memory usage
docker stats

# Check Node.js memory
docker compose exec app node -e "console.log(process.memoryUsage())"
```

### 6. Slow Performance

#### Symptom: Development server very slow

**Solution A**: Optimize volume mounts (macOS)
```yaml
volumes:
  - .:/app:delegated
  - /app/node_modules  # Exclude node_modules
```

**Solution B**: Use .dockerignore
```bash
# Create .dockerignore
echo "node_modules
.git
dist
.next
coverage" > .dockerignore
```

### 7. Hot Reload Not Working

#### Symptom: Changes not reflected in browser

**Solution A**: Check volume mounts
```bash
# Verify files are mounted
docker compose exec app ls -la /app
```

**Solution B**: Check file watchers
```bash
# Increase watchers (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 8. Storage Issues

#### Symptom: "No space left on device"

**Solution A**: Clean up Docker
```bash
# Remove unused containers, images, volumes
docker system prune -a --volumes

# Check disk usage
docker system df
```

**Solution B**: Increase Docker disk space
```bash
# macOS: Docker Desktop > Settings > Resources > Disk image size
# Linux: Check filesystem where /var/lib/docker is mounted
```

## Environment-Specific Issues

### Apple Silicon (M1/M2) Macs

**Issue**: Slow builds due to platform emulation

**Fix**: Use platform flag
```yaml
services:
  app:
    platform: linux/amd64  # Already set in docker-compose.yml
```

### Windows (WSL2)

**Issue**: Line ending problems

**Fix**: Configure Git
```bash
git config --global core.autocrlf false
git config --global core.eol lf
```

### Linux with SELinux

**Issue**: Volume permission denied

**Fix**: Use Z flag
```yaml
volumes:
  - ./data:/data:Z  # Already included in docker-compose.yml
```

## Debugging Techniques

### 1. Interactive Debugging
```bash
# Enter a running container
docker compose exec app sh

# Start a new container for debugging
docker compose run --rm app sh

# Run with specific environment
docker compose run --rm -e DEBUG=true app npm run dev
```

### 2. Network Debugging
```bash
# List networks
docker network ls

# Inspect network
docker network inspect spicebushmontessori_spicebush-network

# Test connectivity between containers
docker compose exec app ping supabase-db
```

### 3. Log Analysis
```bash
# Follow logs in real-time
docker compose logs -f

# Search logs
docker compose logs | grep ERROR

# Export logs
docker compose logs > debug.log 2>&1
```

## Recovery Procedures

### Complete Reset
```bash
#!/bin/bash
# Save this as reset-docker.sh

echo "⚠️  This will delete all Docker data. Continue? (y/N)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    docker compose down -v
    docker system prune -a --volumes -f
    rm -rf docker/volumes/db/data
    rm -rf docker/volumes/storage
    mkdir -p docker/volumes/storage
    echo "✅ Docker environment reset complete"
    echo "Run 'docker compose up -d' to start fresh"
fi
```

### Backup Before Reset
```bash
# Backup database
docker compose exec supabase-db pg_dump -U postgres > backup.sql

# Backup storage
tar -czf storage-backup.tar.gz docker/volumes/storage/

# Restore after reset
docker compose exec -T supabase-db psql -U postgres < backup.sql
tar -xzf storage-backup.tar.gz
```

## Performance Optimization

### 1. Development Optimizations
```yaml
# docker-compose.override.yml
services:
  app:
    volumes:
      - .:/app:delegated
      - /app/node_modules
      - /app/.next
    environment:
      - NODE_OPTIONS=--max-old-space-size=2048
```

### 2. Build Optimizations
```dockerfile
# Use build cache
# Already implemented in Dockerfile.dev with cache mounts
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit
```

## When All Else Fails

1. **Check the documentation**:
   - [Docker Known Issues](./docker-known-issues.md)
   - Project README.md
   - Supabase documentation

2. **Get system information**:
   ```bash
   # Save this for bug reports
   docker version > docker-info.txt
   docker compose version >> docker-info.txt
   docker system info >> docker-info.txt
   uname -a >> docker-info.txt
   ```

3. **Enable debug logging**:
   ```bash
   # Verbose Docker Compose
   docker compose --verbose up
   
   # Docker daemon debug mode
   # Add to Docker Desktop settings or daemon.json:
   {
     "debug": true,
     "log-level": "debug"
   }
   ```

## Quick Health Check Script

Save as `check-docker-health.sh`:

```bash
#!/bin/bash

echo "🔍 Checking Docker health..."

# Check Docker daemon
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker daemon not running"
    exit 1
fi
echo "✅ Docker daemon running"

# Check Docker Compose
if ! docker compose version > /dev/null 2>&1; then
    echo "❌ Docker Compose not found"
    exit 1
fi
echo "✅ Docker Compose available"

# Check services
if docker compose ps | grep -q "Up"; then
    echo "✅ Services running"
    docker compose ps
else
    echo "⚠️  No services running"
fi

# Check resources
echo -e "\n📊 Resource usage:"
docker system df

echo -e "\n✅ Docker health check complete"
```

## Conclusion

Most Docker issues can be resolved by:
1. Ensuring adequate resources are allocated
2. Cleaning up old containers and volumes
3. Checking for port conflicts
4. Verifying environment variables

If you encounter issues not covered here, please update this guide for future developers.