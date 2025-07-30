#!/bin/sh
# Enhanced Docker entrypoint script for development
# Fixes Bug #032 - Docker Missing Dependencies
set -e

echo "=== Docker Entrypoint Starting ==="
echo "Date: $(date)"
echo "User: $(whoami) (UID: $(id -u), GID: $(id -g))"
echo "Working directory: $(pwd)"
echo "NODE_ENV: ${NODE_ENV}"
echo "NODE_PATH: ${NODE_PATH}"

# Function to check if a package exists
check_package() {
    if [ -d "node_modules/$1" ]; then
        echo "✓ $1"
        return 0
    else
        echo "✗ $1 - MISSING!"
        return 1
    fi
}

# Check if node_modules exists and has content
if [ ! -d "node_modules" ]; then
    echo "ERROR: node_modules directory does not exist!"
    echo "This indicates the Docker build failed to install dependencies."
    echo "Please check the Docker build logs."
    exit 1
fi

NODE_MODULE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
echo "Found $NODE_MODULE_COUNT packages in node_modules"

if [ "$NODE_MODULE_COUNT" -lt 10 ]; then
    echo "ERROR: node_modules appears to be empty or incomplete!"
    echo "Expected many packages but found only $NODE_MODULE_COUNT"
    exit 1
fi

# Verify critical packages using shell commands (more reliable in Alpine)
echo ""
echo "=== Verifying critical packages ==="
MISSING_PACKAGES=""

# Check each critical package
for package in "astro" "lucide-astro" "bcryptjs" "decap-cms-app" "jsonwebtoken" "sharp" "@astrojs/node" "@astrojs/react" "@astrojs/tailwind" "@supabase/supabase-js"; do
    if ! check_package "$package"; then
        MISSING_PACKAGES="$MISSING_PACKAGES $package"
    fi
done

if [ -n "$MISSING_PACKAGES" ]; then
    echo ""
    echo "ERROR: The following packages are missing:$MISSING_PACKAGES"
    echo ""
    echo "This is likely due to:"
    echo "1. Corrupted package-lock.json"
    echo "2. Network issues during npm install"
    echo "3. Incompatible package versions"
    echo ""
    echo "To fix this, try:"
    echo "1. Run: docker-compose down -v"
    echo "2. Delete package-lock.json and regenerate it"
    echo "3. Run: docker-compose build --no-cache"
    exit 1
fi

echo "All critical packages verified ✓"

# Check .astro directory
echo ""
echo "=== Checking .astro directory ==="
if [ ! -d ".astro" ]; then
    echo "Creating .astro directory..."
    mkdir -p .astro
fi

# Test write permissions
if touch .astro/.test 2>/dev/null; then
    echo "✓ .astro directory is writable"
    rm -f .astro/.test
else
    echo "✗ WARNING: .astro directory is not writable"
    echo "Attempting to fix permissions..."
    # Try to take ownership if we can
    if [ -w "." ]; then
        rm -rf .astro 2>/dev/null || true
        mkdir -p .astro
        echo "✓ Recreated .astro directory"
    else
        echo "✗ Cannot fix permissions. This may cause issues."
    fi
fi

# Check for common issues
echo ""
echo "=== Environment Check ==="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "✗ ERROR: package.json not found in current directory"
    echo "Current directory contents:"
    ls -la
    exit 1
fi

# Check NODE_PATH
if [ -z "$NODE_PATH" ]; then
    echo "⚠ NODE_PATH not set, setting to /app/node_modules"
    export NODE_PATH=/app/node_modules
fi

# Ensure node can find modules
echo "Testing node module resolution..."
node -e "try { require('astro'); console.log('✓ Node can resolve modules correctly'); } catch(e) { console.error('✗ Node cannot resolve modules:', e.message); process.exit(1); }"

# Memory check
echo ""
echo "=== System Resources ==="
free -h 2>/dev/null || echo "Memory info not available"
df -h . | grep -E "(Filesystem|/app)" || echo "Disk info not available"

# Final status
echo ""
echo "=== Startup Complete ==="
echo "All checks passed. Starting application..."
echo "Command: $@"
echo ""

# Execute the main command
exec "$@"