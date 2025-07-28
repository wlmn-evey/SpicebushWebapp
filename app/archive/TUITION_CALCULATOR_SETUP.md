# Tuition Calculator Setup Guide

## The Issue

The tuition calculator is not showing data because:
1. The Docker Supabase setup has some image version issues
2. The app expects a full Supabase instance at `http://localhost:54321`
3. The migrations need Supabase-specific functions to run properly

## Quick Solution - Use Supabase CLI

Since the Docker setup is having issues, the simplest solution is to use Supabase CLI:

### 1. Install Supabase CLI (if not installed)
```bash
brew install supabase/tap/supabase
```

### 2. Start Local Supabase
```bash
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app
supabase start
```

This will start a local Supabase instance with:
- PostgreSQL database
- Auth service
- REST API
- All required components

### 3. The Data Should Load Automatically
The migrations in `/supabase/migrations/` will run automatically when Supabase starts, creating:
- 4 tuition programs
- 16 tuition rates (4 tiers × 4 programs)
- Default settings

### 4. Verify It's Working
```bash
# Check if services are running
supabase status

# Open the app
npm run dev
# Visit http://localhost:4321/admissions/tuition-calculator
```

## Alternative - Fix Docker Setup

If you prefer Docker, the issue is:
1. The Supabase Studio image version `20240729-b1fd2db` doesn't exist
2. The vector service configuration has been fixed
3. Some services have complex dependencies

To fix Docker:
1. Update the Supabase Studio image version in docker-compose.yml
2. Or comment out the studio service if not needed
3. Ensure all services start in the correct order

## Why This Happens

The tuition calculator code in `/src/pages/admissions/tuition-calculator.astro`:
- Fetches data server-side using Supabase client
- Expects Supabase to be running at `PUBLIC_SUPABASE_URL`
- Passes data to the component as props

Without Supabase running, the queries return empty arrays.

## Current Status

✅ The code is correct (server-side data fetching)
✅ The migrations are correct (create tables and seed data)
✅ The database schema is correct
❌ The Docker Supabase setup has configuration issues
✅ Supabase CLI is a simpler alternative

## Recommendation

Use Supabase CLI for local development:
- It's simpler than Docker
- It's the official tool
- It handles all the complex service dependencies
- It runs the migrations automatically