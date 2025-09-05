#!/bin/bash

# Build script for Netlify deployment
# This script checks for required environment variables and builds the project

echo "Starting build process..."

# Check for required environment variables (without exposing values)
check_env_var() {
  if [ -z "${!1}" ]; then
    echo "Warning: $1 is not set. Build may fail if this variable is required."
  else
    echo "✓ $1 is set"
  fi
}

echo "Checking environment variables..."

# Supabase variables
check_env_var "PUBLIC_SUPABASE_URL"
check_env_var "PUBLIC_SUPABASE_ANON_KEY"
check_env_var "SUPABASE_SERVICE_ROLE_KEY"

# Clerk authentication variables
check_env_var "PUBLIC_CLERK_PUBLISHABLE_KEY"
check_env_var "CLERK_SECRET_KEY"
check_env_var "PUBLIC_CLERK_SIGN_IN_URL"
check_env_var "PUBLIC_CLERK_SIGN_UP_URL"
check_env_var "PUBLIC_CLERK_AFTER_SIGN_IN_URL"
check_env_var "PUBLIC_CLERK_AFTER_SIGN_UP_URL"

# Feature flags
check_env_var "USE_CLERK_AUTH"
check_env_var "USE_REAL_CLERK_VALIDATION"
check_env_var "COMING_SOON_MODE"

# Site configuration
check_env_var "PUBLIC_SITE_URL"

echo "Environment check complete."
echo "Running build command..."

# Run the actual build
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "Build completed successfully!"
else
  echo "Build failed. Please check the logs above for errors."
  exit 1
fi