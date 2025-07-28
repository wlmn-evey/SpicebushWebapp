# Docker Development Guide

This guide explains how to use Docker for local development of the Spicebush Montessori website.

## Quick Start

1. **Install Docker Desktop** (if not already installed)
   - [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)

2. **Start the development environment**
   ```bash
   ./docker-dev.sh up
   ```

3. **Access the services**
   - Astro App: http://localhost:4321
   - Supabase: http://localhost:54321
   - MailHog (email testing): http://localhost:8025
   - PostgreSQL: localhost:54322

## Docker Setup Details

### File Structure

- `Dockerfile.dev` - Optimized development Dockerfile with hot reload support
- `docker-compose.dev.yml` - Development services configuration
- `.env.docker.development` - Environment variables for Docker development
- `docker-dev.sh` - Helper script for common Docker commands

### Key Features

1. **Hot Reload**: Changes to source files are immediately reflected without rebuilding
2. **Optimized Caching**: Node modules are cached in a Docker volume for fast rebuilds
3. **Permission Handling**: Uses UID 1000 to match common host user IDs
4. **Email Testing**: MailHog captures all emails sent by the application
5. **Minimal Services**: Only essential Supabase services are included for faster startup

### Common Commands

```bash
# Start development environment
./docker-dev.sh up

# Start in background
./docker-dev.sh up:bg

# View logs
./docker-dev.sh logs

# Stop everything
./docker-dev.sh down

# Open shell in app container
./docker-dev.sh shell

# Install new npm package
./docker-dev.sh install package-name

# Connect to database
./docker-dev.sh db

# Reset everything (WARNING: deletes data)
./docker-dev.sh reset
```

## Troubleshooting

### Permission Issues

If you encounter permission errors:

1. Ensure your user ID is 1000 (check with `id -u`)
2. If different, update the Dockerfile.dev to match your UID
3. Rebuild with `./docker-dev.sh rebuild`

### Port Conflicts

If ports are already in use:

1. Check what's using the port: `lsof -i :4321`
2. Stop the conflicting service or change the port in docker-compose.dev.yml

### Slow Performance on Mac/Windows

Docker Desktop can be slow with file syncing. The configuration uses:
- `delegated` mounts for better performance
- Volume for node_modules to avoid sync overhead
- Minimal file watching

### Hot Reload Not Working

If changes aren't reflected:

1. Check that volumes are mounted correctly: `docker compose -f docker-compose.dev.yml ps`
2. Ensure files are saved
3. Check app logs: `./docker-dev.sh logs`
4. Restart the app service: `docker compose -f docker-compose.dev.yml restart app`

## Environment Variables

The `.env.docker.development` file contains all necessary environment variables for local development. These are automatically loaded when using the Docker setup.

To use custom values:
1. Copy `.env.docker.development` to `.env.local`
2. Modify values as needed
3. The Docker setup will use `.env.local` if it exists

## Database Access

To connect to the PostgreSQL database:

```bash
# Using docker-dev.sh
./docker-dev.sh db

# Or directly
docker compose -f docker-compose.dev.yml exec supabase-db psql -U postgres

# Connection details for GUI tools:
Host: localhost
Port: 54322
Database: postgres
Username: postgres
Password: your-super-secret-and-long-postgres-password
```

## Email Testing with MailHog

All emails sent by the application are captured by MailHog:

1. View emails at: http://localhost:8025
2. SMTP settings are pre-configured
3. No emails actually leave your machine

## Adding New Dependencies

To add new npm packages:

```bash
# Using the helper script
./docker-dev.sh install package-name

# Or manually
docker compose -f docker-compose.dev.yml exec app npm install package-name
```

The package will be installed and saved to package.json.

## Performance Tips

1. **Use the helper script**: `./docker-dev.sh` handles common tasks efficiently
2. **Background mode**: Use `./docker-dev.sh up:bg` to free up your terminal
3. **Selective service startup**: Comment out unused services in docker-compose.dev.yml
4. **Regular cleanup**: Run `docker system prune` periodically to free up space

## Production Build Testing

To test a production build locally:

```bash
# Use the original Dockerfile and docker-compose.yml
docker compose up --build
```

This will build and run the production version of the application.