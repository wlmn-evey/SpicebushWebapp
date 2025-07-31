---
id: 048
title: "Extremely Slow Page Load (25+ seconds) Due to Missing Collections"
severity: critical
status: open
category: performance
affected_pages: ["all pages"]
discovered_date: 2025-07-30
environment: [docker]
---

# Bug 048: Extremely Slow Page Load (25+ seconds) Due to Missing Collections

## Description
After fixing Bug #047 (DB_READONLY environment variables), pages are taking 25-27 seconds to load. The root cause appears to be repeated errors about missing content collections, particularly "photos" and "coming-soon" collections.

## Current Behavior
- App starts successfully with "astro v5.10.1 ready in 16982 ms"
- Pages eventually load but take 25-27 seconds
- Logs show: "[200] / 26791ms", "[200] / 24842ms", "[200] / 27634ms"
- Repeated errors: "The collection 'photos' does not exist"
- Also errors: "The collection 'coming-soon' does not exist"

## Expected Behavior
- Pages should load within 1-2 seconds
- No errors about missing collections
- Content should be served efficiently from the database

## Root Cause
The content collection system is trying to access "photos" and "coming-soon" collections that don't exist or aren't properly configured. This is causing massive performance degradation as the system repeatedly tries to access these missing collections.

## Impact
- **User Impact**: Complete site failure - pages never load
- **Development Impact**: Cannot test the containerized application
- **Business Impact**: Application is unusable despite fixing env var issue

## Technical Details
- No errors in logs after the warnings about missing announcements/events content
- App shows ready state but doesn't respond to requests
- Database connection test confirms DB is accessible
- Environment variables are properly loaded

## Reproduction Steps
1. Start Docker containers: `docker compose up`
2. Wait for app to show ready
3. Try to access any page: `curl http://localhost:4321/`
4. Request hangs indefinitely