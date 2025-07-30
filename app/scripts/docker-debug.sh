#!/bin/bash
# Docker NPM Debugging Script
# For Bug #032 - Docker Missing Dependencies

echo "=== Docker NPM Debug Script ==="
echo "Date: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose not found${NC}"
    exit 1
fi

# Get container name/ID
CONTAINER=$(docker-compose ps -q app 2>/dev/null)
if [ -z "$CONTAINER" ]; then
    echo -e "${RED}❌ App container is not running${NC}"
    echo "Trying to find any app container..."
    CONTAINER=$(docker ps -q -f "name=app" | head -1)
    if [ -z "$CONTAINER" ]; then
        echo -e "${RED}No app container found at all${NC}"
        exit 1
    fi
fi

echo "Container ID: $CONTAINER"
CONTAINER_NAME=$(docker inspect -f '{{.Name}}' $CONTAINER | sed 's/^\/*//')
echo "Container Name: $CONTAINER_NAME"
echo ""

# Function to run command in container
run_in_container() {
    docker exec $CONTAINER sh -c "$1" 2>&1
}

# Check if container is actually running
STATE=$(docker inspect -f '{{.State.Running}}' $CONTAINER)
if [ "$STATE" != "true" ]; then
    echo -e "${RED}❌ Container exists but is not running${NC}"
    echo "Container state:"
    docker inspect -f '{{json .State}}' $CONTAINER | jq '.' 2>/dev/null || docker inspect -f '{{.State}}' $CONTAINER
    exit 1
fi

# Basic environment info
echo "=== Container Environment ==="
run_in_container "node --version"
run_in_container "npm --version"
run_in_container "echo 'User: $(whoami) (UID: $(id -u), GID: $(id -g))'"
run_in_container "echo 'Working directory: $(pwd)'"
echo ""

# Check node_modules
echo "=== Node Modules Status ==="
MODULE_COUNT=$(run_in_container "find node_modules -maxdepth 1 -type d 2>/dev/null | wc -l")
echo "Total packages in node_modules: $MODULE_COUNT"

if [ "$MODULE_COUNT" -lt 10 ]; then
    echo -e "${RED}⚠️  Very few packages found! Expected hundreds.${NC}"
fi

# Show first few packages
echo "Sample of installed packages:"
run_in_container "ls node_modules 2>/dev/null | head -10"
echo ""

# Check specific critical packages
echo "=== Checking Critical Packages ==="
PACKAGES=(
    "astro"
    "lucide-astro"
    "bcryptjs"
    "decap-cms-app"
    "jsonwebtoken"
    "sharp"
    "@astrojs/node"
    "@astrojs/react"
    "@astrojs/tailwind"
    "@astrojs/sitemap"
    "@supabase/supabase-js"
    "@stripe/stripe-js"
    "tailwindcss"
    "typescript"
    "react"
    "react-dom"
)

MISSING_COUNT=0
for pkg in "${PACKAGES[@]}"; do
    if run_in_container "test -d node_modules/$pkg" >/dev/null 2>&1; then
        # Get package version
        VERSION=$(run_in_container "cat node_modules/$pkg/package.json 2>/dev/null | grep '\"version\"' | head -1 | sed 's/.*\"version\": \"\(.*\)\".*/\1/'" 2>/dev/null)
        echo -e "${GREEN}✓${NC} $pkg (${VERSION:-unknown version})"
    else
        echo -e "${RED}✗${NC} $pkg - ${RED}MISSING${NC}"
        ((MISSING_COUNT++))
    fi
done

if [ $MISSING_COUNT -gt 0 ]; then
    echo ""
    echo -e "${RED}Found $MISSING_COUNT missing packages!${NC}"
fi
echo ""

# Check package.json and package-lock.json
echo "=== Package Files ==="
if run_in_container "test -f package.json" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} package.json exists"
    PKG_SIZE=$(run_in_container "wc -c < package.json" 2>/dev/null)
    echo "  Size: $PKG_SIZE bytes"
else
    echo -e "${RED}✗${NC} package.json NOT FOUND"
fi

if run_in_container "test -f package-lock.json" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} package-lock.json exists"
    LOCK_SIZE=$(run_in_container "wc -c < package-lock.json" 2>/dev/null)
    echo "  Size: $LOCK_SIZE bytes"
    # Check if it's valid JSON
    if run_in_container "node -e 'JSON.parse(require(\"fs\").readFileSync(\"package-lock.json\"))'" >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Valid JSON"
    else
        echo -e "  ${RED}✗${NC} Invalid JSON!"
    fi
else
    echo -e "${RED}✗${NC} package-lock.json NOT FOUND"
fi
echo ""

# Check npm configuration
echo "=== NPM Configuration ==="
run_in_container "npm config get registry"
run_in_container "npm config get cache"
echo ""

# Check file permissions
echo "=== File Permissions ==="
echo "App directory:"
run_in_container "ls -la . | grep -E '(node_modules|package|\.astro)' | head -10"
echo ""
echo "node_modules ownership:"
run_in_container "ls -la node_modules 2>/dev/null | head -3"
echo ""

# Check disk space
echo "=== Disk Space ==="
run_in_container "df -h /app 2>/dev/null || df -h ."
echo ""

# Check for .astro directory issues
echo "=== Astro Build Directory ==="
if run_in_container "test -d .astro" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} .astro directory exists"
    ASTRO_PERMS=$(run_in_container "ls -ld .astro")
    echo "  Permissions: $ASTRO_PERMS"
    if run_in_container "touch .astro/.test && rm .astro/.test" >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Directory is writable"
    else
        echo -e "  ${RED}✗${NC} Directory is NOT writable"
    fi
else
    echo -e "${YELLOW}⚠${NC} .astro directory does not exist (will be created on first run)"
fi
echo ""

# Check recent logs
echo "=== Recent Container Logs ==="
echo "Last 20 lines:"
docker logs --tail 20 $CONTAINER 2>&1 | sed 's/^/  /'
echo ""

# Summary
echo "=== Summary ==="
if [ $MISSING_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ All critical packages are installed${NC}"
else
    echo -e "${RED}✗ $MISSING_COUNT critical packages are missing${NC}"
    echo ""
    echo "Recommended actions:"
    echo "1. Run: docker-compose down -v"
    echo "2. Run: docker-compose build --no-cache"
    echo "3. Run: docker-compose up"
fi

# Export useful info for other scripts
export DOCKER_APP_CONTAINER=$CONTAINER
export DOCKER_MISSING_PACKAGES=$MISSING_COUNT