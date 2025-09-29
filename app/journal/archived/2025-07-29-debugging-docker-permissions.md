# Debugging Session: Docker Node Modules Permission Error (Bug #035)
Date: 2025-07-29

## Problem Description and Symptoms
The Docker container was experiencing permission denied errors when trying to access the node_modules directory. The dev server failed to start and the container entered restart loops.

## Debugging Steps Taken
1. Created diagnostic file at `debug/issue-20250729-docker-permissions.md`
2. Examined Dockerfile.dev to understand the build process
3. Identified that npm install runs as root user before switching to node user
4. Found that node_modules directory was owned by root but accessed by node user

## Root Cause Identified
When the npm install command runs in the Dockerfile as the root user, it creates the node_modules directory with root ownership. However, the application runs as the node user (switched on line 46), which doesn't have permission to access root-owned files.

## Solution Implemented
Added `chown -R node:node /app` to the RUN command after npm install in Dockerfile.dev (line 41). This changes ownership of the entire /app directory to the node user after all dependencies are installed.

## Modified File
- `/Users/eveywinters/CascadeProjects/SpicebushWebapp/app/Dockerfile.dev`

## Testing Instructions
1. Stop containers: `docker compose -f docker-compose.dev.yml down`
2. Rebuild: `docker compose -f docker-compose.dev.yml build app --no-cache`
3. Start services: `docker compose -f docker-compose.dev.yml up`
4. Verify no permission errors and access http://localhost:4321

## Lessons Learned
- When switching users in a Dockerfile, ensure all files created by the previous user have appropriate ownership
- The `--chown` flag on COPY commands only affects copied files, not files created during RUN commands
- Always verify file ownership after package installations when running containers as non-root users

## Follow-up Recommendations
- Consider using multi-stage builds to separate dependency installation from runtime
- Monitor for any other permission-related issues with mounted volumes
- Document this pattern for future Dockerfile updates