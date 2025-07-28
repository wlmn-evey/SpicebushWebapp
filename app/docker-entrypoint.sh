#!/bin/sh
# Docker entrypoint script for development
# Ensures proper permissions for the .astro directory

echo "Starting Docker entrypoint script..."

# Ensure .astro directory exists and is writable
echo "Checking .astro directory..."
if [ ! -d "/app/.astro" ]; then
    echo "Creating .astro directory..."
    mkdir -p /app/.astro
fi

# Test if we can write to the directory
if ! touch /app/.astro/.test 2>/dev/null; then
    echo "ERROR: Cannot write to .astro directory. This is likely a volume permission issue."
    echo "Directory details:"
    ls -la /app/ | grep astro || echo "No .astro directory found"
    echo "Current user: $(whoami) ($(id))"
    echo "Attempting to create directory with proper permissions..."
    rm -rf /app/.astro 2>/dev/null || true
    mkdir -p /app/.astro
    chmod 755 /app/.astro
else
    echo ".astro directory is writable"
    rm -f /app/.astro/.test
fi

echo "Starting main application..."
# Execute the main command
exec "$@"