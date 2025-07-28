#!/bin/bash
# Docker Development Environment Reset Script
# This completely resets the Docker environment

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[Docker Reset]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[Warning]${NC} $1"
}

print_error() {
    echo -e "${RED}[Error]${NC} $1"
}

print_warning "This will completely reset your Docker development environment!"
print_warning "All data in the database will be lost!"
echo ""
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Reset cancelled."
    exit 0
fi

print_status "Stopping all containers..."
docker compose -f docker-compose.dev.yml down || true

print_status "Removing all volumes..."
docker compose -f docker-compose.dev.yml down -v || true

print_status "Removing any dangling volumes..."
docker volume prune -f || true

print_status "Cleaning build cache..."
docker builder prune -f || true

print_status "Removing old database data directory if it exists..."
rm -rf docker/volumes/db/data || true

print_status "Creating fresh .env.local from template..."
if [ -f .env.docker.development ]; then
    cp .env.docker.development .env.local
    print_status "Created .env.local from .env.docker.development"
else
    print_warning ".env.docker.development not found"
fi

print_status "Building fresh containers..."
docker compose -f docker-compose.dev.yml build --no-cache

print_status "Starting services..."
docker compose -f docker-compose.dev.yml up -d

print_status "Waiting for services to be ready..."
sleep 10

print_status "Checking service status..."
docker compose -f docker-compose.dev.yml ps

echo ""
print_status "Reset complete! Services should be starting up."
print_status "Run 'docker compose -f docker-compose.dev.yml logs -f' to view logs"
print_status "The Astro dev server will be available at http://localhost:4321 once it's ready"