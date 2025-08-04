# Docker Development Setup

This guide consolidates Docker-related documentation for local development.

## Prerequisites

- Docker Desktop installed and running
- Node.js 20+ installed locally
- Git

## Quick Start

```bash
# Clone the repository
git clone [repository-url]
cd SpicebushWebapp

# Copy environment variables
cp app/.env.example app/.env.local

# Start Docker services
docker-compose up -d

# Install dependencies
cd app
npm install

# Run development server
npm run dev
```

## Docker Services

### Current Services

1. **PostgreSQL Database**
   - Port: 5432
   - Used by Supabase

2. **Supabase Services**
   - Studio: http://localhost:54323
   - API: http://localhost:54321
   - Includes Auth, Realtime, Storage

## Docker Commands

### Basic Operations

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Restart a service
docker-compose restart [service-name]
```

### Database Operations

```bash
# Access PostgreSQL
docker exec -it spicebush-postgres psql -U postgres

# Run migrations
npm run db:migrate

# Reset database
npm run db:reset
```

## Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   # Check what's using a port
   lsof -i :5432
   
   # Change port in docker-compose.yml if needed
   ```

2. **Docker Desktop not running**
   - Ensure Docker Desktop is started
   - Check Docker daemon: `docker ps`

3. **Permission issues**
   ```bash
   # Fix volume permissions
   docker-compose down -v
   docker-compose up -d
   ```

4. **Out of disk space**
   ```bash
   # Clean up Docker
   docker system prune -a
   ```

## Development Workflow

1. **Start Docker services**
   ```bash
   docker-compose up -d
   ```

2. **Verify services are running**
   ```bash
   docker-compose ps
   ```

3. **Run the application**
   ```bash
   cd app
   npm run dev
   ```

4. **Access the application**
   - App: http://localhost:3000
   - Supabase Studio: http://localhost:54323

## Best Practices

1. **Always use Docker for databases** to ensure consistency
2. **Keep Docker images updated** with `docker-compose pull`
3. **Use volumes for persistent data**
4. **Document any custom configurations**
5. **Commit docker-compose.yml changes**

## Production Considerations

- Production uses managed services (Supabase cloud)
- Docker is for local development only
- Environment variables differ between environments
- Always test with production-like data volumes

## Maintenance

### Regular Tasks

- Update base images monthly
- Clean unused images/volumes
- Monitor disk usage
- Review security updates

### Backup Local Data

```bash
# Backup PostgreSQL
docker exec spicebush-postgres pg_dump -U postgres > backup.sql

# Restore PostgreSQL
docker exec -i spicebush-postgres psql -U postgres < backup.sql
```