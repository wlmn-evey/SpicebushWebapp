# Bug #048: Astro Content Collections Not Loading in Docker

## Date: 2025-07-30

## Description
When running the application in Docker, Astro's content collection system cannot find the `photos` and `coming-soon` collections, even though the files exist in the container. This causes:
- Repeated error messages: "The collection 'photos' does not exist"
- 22-27 second page load times
- OptimizedImage components fail to load photos

## Root Cause
Astro's content collection system is not properly initialized in the Docker development environment. The collections are defined in `src/content/config.ts` and the markdown files exist, but Astro can't find them at runtime.

## Impact
- Severity: **Critical**
- All pages that use OptimizedImage components are affected
- Page load times increase from ~2 seconds to 22-27 seconds
- Photo galleries and hero images don't display

## Current State
- The `content-db-direct.ts` module correctly returns empty arrays for non-database collections
- The admin dashboard correctly uses `getAstroCollection` for photos
- OptimizedImage component correctly imports from 'astro:content'
- The issue is specifically with Astro's runtime collection discovery in Docker

## Solution Needed
Need to ensure Astro's content collection system properly initializes in the Docker environment. This may require:
1. Adjusting the Docker build process
2. Ensuring content types are generated at build time
3. Verifying the dev server properly watches content directories