#!/bin/bash
# Quick test script for Docker development setup

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Testing Docker Development Setup${NC}"
echo "=================================="

# Check Docker
echo -n "Checking Docker... "
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Docker is not running${NC}"
    exit 1
fi

# Check Docker Compose
echo -n "Checking Docker Compose... "
if docker compose version > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Docker Compose not found${NC}"
    exit 1
fi

# Validate docker-compose.dev.yml
echo -n "Validating docker-compose.dev.yml... "
if docker compose -f docker-compose.dev.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Invalid configuration${NC}"
    exit 1
fi

# Check required files
echo -n "Checking required files... "
missing_files=()
[ ! -f "Dockerfile.dev" ] && missing_files+=("Dockerfile.dev")
[ ! -f "docker-compose.dev.yml" ] && missing_files+=("docker-compose.dev.yml")
[ ! -f "docker/volumes/api/kong.yml" ] && missing_files+=("kong.yml")

if [ ${#missing_files[@]} -eq 0 ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Missing files: ${missing_files[*]}${NC}"
    exit 1
fi

# Check ports
echo -n "Checking port availability... "
ports_in_use=()
for port in 4321 54321 54322 1025 8025; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        ports_in_use+=($port)
    fi
done

if [ ${#ports_in_use[@]} -eq 0 ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Ports in use: ${ports_in_use[*]}${NC}"
    echo "  You may need to stop conflicting services or change ports in docker-compose.dev.yml"
fi

# Check environment
echo -n "Checking environment setup... "
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ .env.local exists${NC}"
elif [ -f ".env.docker.development" ]; then
    echo -e "${YELLOW}⚠ .env.local not found, but .env.docker.development exists${NC}"
    echo "  Run: cp .env.docker.development .env.local"
else
    echo -e "${RED}✗ No environment file found${NC}"
fi

echo ""
echo -e "${GREEN}Setup appears to be ready!${NC}"
echo ""
echo "To start development:"
echo "  ./docker-dev.sh up"
echo ""
echo "Or if you prefer docker compose directly:"
echo "  docker compose -f docker-compose.dev.yml up"