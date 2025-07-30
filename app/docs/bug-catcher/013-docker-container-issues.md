---
id: 013
title: "Docker Container Configuration Issues"
severity: high
status: open
category: functionality
affected_pages: ["all pages - infrastructure level"]
related_bugs: [002, 014]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 013: Docker Container Configuration Issues

## Description
Docker containers are experiencing configuration problems including resource constraints, networking issues, and environment variable misconfigurations. This contributes to application instability and performance problems.

## Steps to Reproduce
1. Run `docker-compose up`
2. Monitor container logs
3. Observe memory/CPU usage spikes
4. Notice intermittent container restarts
5. Database connection timeouts occur

## Expected Behavior
- Containers run stably without restarts
- Resource usage within defined limits
- All services communicate properly
- Environment variables properly configured
- Graceful handling of failures

## Actual Behavior
- Containers restart frequently
- Out of memory errors
- Services cannot communicate
- Environment variables missing/incorrect
- Cascading failures across services

## Docker Analysis
```
Container Issues Found:
1. App Container
   - Memory limit too low (512MB)
   - No health checks defined
   - Missing restart policy
   - Incorrect NODE_ENV

2. Database Container
   - No persistent volume mounts
   - Connection pool exhaustion
   - Missing backup configuration
   - Insufficient shared memory

3. API Container
   - CORS misconfiguration
   - JWT secrets not set
   - Rate limiting missing
   - No request logging

4. Nginx Container
   - Proxy timeouts too short
   - Missing gzip compression
   - No SSL termination
   - Cache headers incorrect

Network Issues:
- Services on different networks
- DNS resolution problems
- Port conflicts
- No service discovery
```

## Affected Files
- `/docker-compose.yml` - Main configuration
- `/docker-compose.prod.yml` - Production overrides
- `/Dockerfile` - App container definition
- `/docker/` - Configuration files
- Environment variable files

## Potential Causes
1. **Resource Constraints**
   - Default limits too low
   - No consideration for load
   - Memory leaks in application

2. **Configuration Errors**
   - Copy-paste from examples
   - Missing production settings
   - Incorrect environment setup

3. **Networking Issues**
   - Complex network topology
   - Missing service links
   - Port binding conflicts

## Suggested Fixes

### Option 1: Optimized docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NODE_ENV: ${NODE_ENV:-production}
    image: spicebush-app:latest
    container_name: spicebush-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      DATABASE_URL: ${DATABASE_URL}
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    networks:
      - spicebush-network
    volumes:
      - ./public/uploads:/app/public/uploads
      - node_modules:/app/node_modules

  db:
    image: postgres:15-alpine
    container_name: spicebush-db
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ${DB_USER:-spicebush}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME:-spicebush}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-spicebush}"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/volumes/db/init:/docker-entrypoint-initdb.d
    networks:
      - spicebush-network
    command: >
      postgres
      -c shared_buffers=256MB
      -c max_connections=200
      -c effective_cache_size=1GB
      -c maintenance_work_mem=64MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c random_page_cost=1.1
      -c effective_io_concurrency=200

  nginx:
    image: nginx:alpine
    container_name: spicebush-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./public:/usr/share/nginx/html:ro
      - nginx_cache:/var/cache/nginx
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    networks:
      - spicebush-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    container_name: spicebush-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - spicebush-network
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  node_modules:
  nginx_cache:
  redis_data:

networks:
  spicebush-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Option 2: Production Dockerfile Optimization
```dockerfile
# Multi-stage build for smaller image
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/public ./public
COPY --chown=nodejs:nodejs package*.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server.js"]
```

### Option 3: Environment Configuration
```bash
# .env.production
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@db:5432/spicebush
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

# Redis
REDIS_URL=redis://redis:6379
REDIS_TTL=3600

# Application
SESSION_SECRET=xxx
JWT_SECRET=xxx
CORS_ORIGIN=https://spicebushmontessori.org

# Monitoring
SENTRY_DSN=xxx
LOG_LEVEL=info

# Performance
ENABLE_CACHE=true
CACHE_TTL=3600
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

## Testing Requirements
1. Load test with realistic traffic
2. Monitor resource usage over time
3. Test container recovery from crashes
4. Verify inter-service communication
5. Test with production data volumes
6. Simulate network failures
7. Verify health checks work properly

## Related Issues
- Bug #002: Server 500 errors may be from container issues
- Bug #014: Database connections affected by Docker networking

## Additional Notes
- Consider using Docker Swarm or Kubernetes for production
- Implement proper logging aggregation
- Add monitoring with Prometheus/Grafana
- Use secrets management for sensitive data
- Regular security scanning of images
- Implement backup and disaster recovery