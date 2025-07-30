---
id: 029
title: Supabase Analytics Missing gcloud.json Configuration
severity: high
status: open
category: infrastructure
created: 2025-07-28
lastUpdated: 2025-07-28
affectedComponents:
  - Supabase analytics (Logflare)
  - Docker configuration
  - Logging system
relatedBugs: [013]
---

# Supabase Analytics Missing gcloud.json Configuration

## Summary
The Supabase analytics container (Logflare) is failing to start because it expects a `gcloud.json` file that doesn't exist. This prevents the logging and analytics system from functioning.

## Current Behavior
- Analytics container continuously restarts
- Error: `could not read file "gcloud.json": no such file or directory`
- No logging or analytics data is collected
- Other services that depend on analytics may fail

## Expected Behavior
- Analytics container should start successfully
- Logging should work without requiring Google Cloud credentials in local development
- Analytics should be optional for local development

## Root Cause
Logflare is configured to use Google Cloud Storage but:
1. No gcloud.json file is provided in the Docker setup
2. The configuration doesn't handle missing credentials gracefully
3. Local development shouldn't require GCS integration

## Impact
- **User Impact**: No visible impact (backend service)
- **Development Impact**: No application logs or analytics in development
- **Business Impact**: Cannot monitor application behavior locally

## Reproduction Steps
1. Run `docker-compose up`
2. Check analytics logs: `docker logs app-supabase-analytics-1`
3. Observe file not found error and restart loop

## Technical Details
```
ERROR! Config provider Config.Reader failed with:
** (File.Error) could not read file "gcloud.json": no such file or directory
    (elixir 1.14.4) lib/file.ex:358: File.read!/1
    /opt/app/rel/logflare/releases/1.4.0/runtime.exs:204: (file)
```

## Proposed Solution
1. Make analytics optional for local development
2. Provide a dummy gcloud.json for local use
3. Update Logflare configuration to work without GCS
4. Consider removing analytics dependency from other services

## Workaround
Either:
1. Create empty gcloud.json file
2. Comment out analytics service in docker-compose.yml
3. Remove analytics dependencies from other services

## Testing Notes
- Verify analytics container starts or is properly disabled
- Ensure other services work without analytics
- Test that logging still functions (even if not persisted)
- Confirm no impact on core functionality