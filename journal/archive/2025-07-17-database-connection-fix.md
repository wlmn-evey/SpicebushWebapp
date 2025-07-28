# Database Connection Fix - January 17, 2025

## Issue
The Tuition Calculator and other dynamic data weren't loading from the Supabase database.

## Root Cause
The JWT tokens in the environment variables didn't match the JWT secret being used by the PostgREST service. The demo JWT tokens provided in the `.env.local` file were generated with a different secret than what was configured in the docker-compose.

## Solution

1. **Generated New JWT Tokens**
   - Created `scripts/generate-tokens.cjs` to generate proper JWT tokens
   - Used the JWT secret from docker-compose: "your-super-secret-jwt-token-with-at-least-32-characters-long"
   - Generated both `anon` and `service_role` tokens with proper claims

2. **Updated Environment Variables**
   - Updated `.env.local` with new `PUBLIC_SUPABASE_ANON_KEY`
   - Updated `docker-compose.working.yml` with the new anon key
   - Ensured `PUBLIC_SUPABASE_URL` points to `http://postgrest:3000` inside the container

3. **Restarted Services**
   - Force recreated the app container to pick up new environment variables
   - Verified services are running with correct configuration

## Technical Details

### New JWT Tokens
- **Anon Token**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwiZXhwIjoxOTgzODEyOTk2LCJyb2xlIjoiYW5vbiIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJpYXQiOjE3NTI3ODg4MzR9.dATSc1K6ClMcdQUiK4_XWKZcYszT2037YlqqbD5muB4`
- **Service Role Token**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwiZXhwIjoxOTgzODEyOTk2LCJyb2xlIjoic2VydmljZV9yb2xlIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlhdCI6MTc1Mjc4ODgzNH0.ZmaYEf2DQnOkUBp13xzwD10hQRne9AV18KGBjQvq2XU`

### Verified Working
- PostgREST API at `http://localhost:54321` returns tuition data
- Database has seed data from migrations (8 programs, rates, and settings)
- App container has correct environment variables

## Result
The Tuition Calculator should now load and display dynamic data from the database. The sliding scale calculations will work based on family size and income.