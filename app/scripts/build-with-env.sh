#!/bin/bash
# Build script that handles environment variables for Docker builds
# This script ensures environment variables are properly passed during build time

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check if .env file exists
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    # Try .env.production as fallback
    ENV_FILE=".env.production"
    if [ ! -f "$ENV_FILE" ]; then
        print_message $RED "Error: No .env or .env.production file found"
        print_message $YELLOW "Please create a .env file with required environment variables"
        print_message $YELLOW "Example:"
        echo "PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
        echo "PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here"
        exit 1
    fi
fi

print_message $GREEN "Using environment file: $ENV_FILE"

# Validate required environment variables
required_vars=(
    "PUBLIC_SUPABASE_URL"
    "PUBLIC_SUPABASE_ANON_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" "$ENV_FILE"; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_message $RED "Error: Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

# Export environment variables for the build
set -a
source "$ENV_FILE"
set +a

# Build command based on environment
BUILD_TARGET="${BUILD_TARGET:-production}"
DOCKER_TAG="${DOCKER_TAG:-spicebush-montessori:latest}"

print_message $YELLOW "Building Docker image..."
print_message $YELLOW "Target: $BUILD_TARGET"
print_message $YELLOW "Tag: $DOCKER_TAG"

# Build Docker image with build arguments
docker build \
    --target "$BUILD_TARGET" \
    --build-arg PUBLIC_SUPABASE_URL="$PUBLIC_SUPABASE_URL" \
    --build-arg PUBLIC_SUPABASE_ANON_KEY="$PUBLIC_SUPABASE_ANON_KEY" \
    --build-arg PUBLIC_STRAPI_URL="${PUBLIC_STRAPI_URL:-}" \
    -t "$DOCKER_TAG" \
    .

if [ $? -eq 0 ]; then
    print_message $GREEN "✓ Docker image built successfully: $DOCKER_TAG"
    print_message $YELLOW "To run the container:"
    echo "docker run -p 4321:4321 $DOCKER_TAG"
else
    print_message $RED "✗ Docker build failed"
    exit 1
fi