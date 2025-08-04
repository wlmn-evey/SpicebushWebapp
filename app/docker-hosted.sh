#!/bin/bash
# Docker startup script for Spicebush webapp with hosted Supabase
# This script ensures the correct configuration for connecting to the hosted Supabase instance

set -e

echo "Starting Spicebush webapp with hosted Supabase configuration..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "Error: .env.local file not found!"
    echo "Please ensure .env.local exists with your hosted Supabase credentials."
    exit 1
fi

# Source the environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Verify critical environment variables are set
if [ -z "$PUBLIC_SUPABASE_URL" ] || [ -z "$PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "Error: Required Supabase environment variables are not set!"
    echo "Please check your .env.local file."
    exit 1
fi

echo "Using Supabase URL: $PUBLIC_SUPABASE_URL"

# Stop any running containers
echo "Stopping any existing containers..."
docker compose down

# Build and start with the simple docker-compose.yml (which uses hosted Supabase)
echo "Starting Docker containers with hosted Supabase configuration..."
docker compose -f docker-compose.yml up --build

# Note: The -f flag explicitly uses docker-compose.yml, not docker-compose.dev.yml