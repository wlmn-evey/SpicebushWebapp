#!/bin/bash
# Docker NPM Recovery Script
# For Bug #032 - Docker Missing Dependencies

echo "=== Docker NPM Recovery Procedure ==="
echo "Date: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Safety check
echo -e "${YELLOW}⚠️  WARNING: This script will reset your Docker environment${NC}"
echo "This includes:"
echo "- Stopping all containers"
echo "- Removing Docker volumes"
echo "- Clearing Docker cache"
echo "- Regenerating package-lock.json"
echo ""
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# Function to run command and check status
run_step() {
    local step_name="$1"
    local command="$2"
    
    echo ""
    echo -e "${YELLOW}>>> $step_name${NC}"
    if eval "$command"; then
        echo -e "${GREEN}✓ $step_name completed${NC}"
        return 0
    else
        echo -e "${RED}✗ $step_name failed${NC}"
        return 1
    fi
}

# Step 1: Stop containers
run_step "Stopping Docker containers" "docker-compose down" || true

# Step 2: Remove problematic volumes
echo ""
echo "=== Removing Docker volumes ==="
# Find and remove node_modules volumes
VOLUMES=$(docker volume ls -q | grep -E "(node_modules|npm)" || true)
if [ -n "$VOLUMES" ]; then
    echo "Found volumes to remove:"
    echo "$VOLUMES"
    for vol in $VOLUMES; do
        run_step "Removing volume $vol" "docker volume rm $vol" || true
    done
else
    echo "No node_modules volumes found"
fi

# Step 3: Clean Docker build cache
run_step "Clearing Docker build cache" "docker builder prune -f"

# Step 4: Backup and regenerate package-lock.json
if [ -f "package-lock.json" ]; then
    BACKUP_NAME="package-lock.json.backup.$(date +%Y%m%d_%H%M%S)"
    run_step "Backing up package-lock.json to $BACKUP_NAME" "cp package-lock.json $BACKUP_NAME"
    
    echo ""
    echo -e "${YELLOW}Checking package-lock.json validity...${NC}"
    if node -e "JSON.parse(require('fs').readFileSync('package-lock.json'))" 2>/dev/null; then
        echo -e "${GREEN}✓ package-lock.json is valid JSON${NC}"
    else
        echo -e "${RED}✗ package-lock.json is corrupted!${NC}"
        echo "Will regenerate it..."
    fi
fi

# Step 5: Regenerate package-lock.json
echo ""
echo -e "${YELLOW}>>> Regenerating package-lock.json${NC}"
echo "This may take a few minutes..."
rm -f package-lock.json
if npm install --package-lock-only --legacy-peer-deps; then
    echo -e "${GREEN}✓ package-lock.json regenerated${NC}"
else
    echo -e "${RED}✗ Failed to regenerate package-lock.json${NC}"
    echo "Trying without legacy-peer-deps flag..."
    npm install --package-lock-only
fi

# Step 6: Verify all dependencies are in lock file
echo ""
echo "=== Verifying package-lock.json ==="
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));

const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
let missing = [];

for (const [name, version] of Object.entries(allDeps)) {
    if (!lock.packages[\`node_modules/\${name}\`]) {
        missing.push(\`\${name}@\${version}\`);
    }
}

if (missing.length > 0) {
    console.error('❌ Missing in package-lock.json:');
    missing.forEach(m => console.error('  - ' + m));
    process.exit(1);
} else {
    console.log('✅ All dependencies found in package-lock.json');
}
"

# Step 7: Use the fixed Dockerfile if available
if [ -f "docker/Dockerfile.dev.fixed" ]; then
    echo ""
    echo -e "${YELLOW}Found fixed Dockerfile. Would you like to use it? (y/N)${NC}"
    read -p "" -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_step "Backing up current Dockerfile.dev" "cp Dockerfile.dev Dockerfile.dev.backup.$(date +%Y%m%d_%H%M%S)"
        run_step "Applying fixed Dockerfile" "cp docker/Dockerfile.dev.fixed Dockerfile.dev"
        
        if [ -f "docker-entrypoint-fixed.sh" ]; then
            run_step "Applying fixed entrypoint script" "cp docker-entrypoint-fixed.sh docker-entrypoint.sh"
            run_step "Making entrypoint executable" "chmod +x docker-entrypoint.sh"
        fi
    fi
fi

# Step 8: Rebuild containers
echo ""
echo -e "${YELLOW}>>> Rebuilding Docker containers${NC}"
echo "This will take several minutes..."
if docker-compose build --no-cache; then
    echo -e "${GREEN}✓ Docker build completed${NC}"
else
    echo -e "${RED}✗ Docker build failed${NC}"
    echo "Check the error messages above"
    exit 1
fi

# Step 9: Start services
run_step "Starting Docker services" "docker-compose up -d"

# Step 10: Wait for services
echo ""
echo "Waiting for services to start..."
for i in {1..30}; do
    if docker-compose ps | grep -q "app.*Up"; then
        echo -e "${GREEN}✓ App container is running${NC}"
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

# Step 11: Run diagnostic
if [ -f "scripts/docker-debug.sh" ]; then
    echo ""
    echo "=== Running diagnostic check ==="
    bash scripts/docker-debug.sh
else
    echo ""
    echo -e "${YELLOW}⚠️  No diagnostic script found${NC}"
    echo "Checking container status manually..."
    docker-compose ps
    echo ""
    echo "Container logs:"
    docker-compose logs --tail 50 app
fi

# Step 12: Final summary
echo ""
echo "=== Recovery Complete ==="
echo ""
echo "Next steps:"
echo "1. Check if the app is running at http://localhost:4321"
echo "2. If there are still issues, check logs with: docker-compose logs -f app"
echo "3. For persistent issues, try using the fixed Dockerfile"
echo ""
echo "Backup files created:"
ls -la *.backup.* 2>/dev/null || echo "No backups found"