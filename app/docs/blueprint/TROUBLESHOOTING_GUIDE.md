# Troubleshooting Guide

## Overview
This guide provides solutions to common issues encountered while developing or maintaining the Spicebush Montessori website. Each section includes symptoms, causes, and step-by-step solutions.

## Common Issues and Solutions

### 1. Blank Admin Page

#### Symptoms
- Admin page loads but shows blank white screen
- No error messages visible
- Other pages work fine

#### Diagnosis
```bash
# Check browser console
# Open DevTools > Console tab
# Look for JavaScript errors

# Check network requests
# DevTools > Network tab
# Look for failed requests (red)
```

#### Common Causes & Solutions

**Cause 1: Authentication Cookie Issues**
```typescript
// Solution: Clear auth cookies and re-login
// In browser console:
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});
// Then refresh and login again
```

**Cause 2: JavaScript Bundle Error**
```bash
# Check for build errors
npm run build

# Clear build cache
rm -rf dist/
rm -rf .astro/
npm run build
```

**Cause 3: Environment Variable Missing**
```bash
# Verify all required env vars are set
grep "import.meta.env" src/ -r

# Check .env.local has all variables
cat .env.local
```

### 2. Database Connection Failed

#### Symptoms
- "Failed to connect to database" error
- Timeout errors
- 500 errors on API endpoints

#### Diagnosis
```bash
# Test database connection
docker exec -it app-supabase-db-1 psql -U postgres -c "SELECT 1"

# Check if Supabase services are running
docker-compose ps

# View Supabase logs
docker-compose logs supabase-db
docker-compose logs supabase-rest
```

#### Solutions

**Solution 1: Restart Docker Services**
```bash
# Stop all services
docker-compose down

# Start with fresh state
docker-compose up -d

# Wait for health checks
docker-compose ps
# All services should show "healthy"
```

**Solution 2: Fix Connection String**
```bash
# Verify DATABASE_URL format
# Should be: postgresql://user:password@localhost:54322/postgres

# Test connection with psql
psql "postgresql://postgres:your-password@localhost:54322/postgres"
```

**Solution 3: Reset Database**
```bash
# Complete reset (WARNING: Deletes all data)
docker-compose down -v
docker-compose up -d

# Re-run migrations
npm run migrate:up
```

### 3. Authentication Failures

#### Symptoms
- Cannot log in with valid credentials
- "Invalid credentials" error
- Magic link emails not arriving

#### Common Issues

**Issue: Magic Link Expired**
```typescript
// Check magic link configuration
// lib/supabase.ts
const { data, error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
    // Add longer expiry in development
    ...(import.meta.env.DEV && { expiresIn: 3600 }) // 1 hour
  }
});
```

**Issue: Email Not Sending (Development)**
```bash
# Check MailHog is running
docker-compose ps mailhog

# Access MailHog UI
open http://localhost:8025

# If not receiving emails, check SMTP config
docker-compose logs supabase-auth | grep SMTP
```

**Issue: Admin Access Denied**
```typescript
// Verify email is in admin list
// lib/admin-config.ts
const ADMIN_EMAILS = [
  'your-email@example.com', // Add your email here
];

// Or temporarily bypass in development
if (import.meta.env.DEV) {
  return true; // Allow all in dev
}
```

### 4. Build and TypeScript Errors

#### Common Build Errors

**Error: Cannot find module '@/lib/...'**
```json
// Check tsconfig.json paths
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Error: Fragment Syntax Error**
```astro
<!-- Incorrect -->
<>
  <div>Content</div>
</>

<!-- Correct for Astro -->
<Fragment>
  <div>Content</div>
</Fragment>
```

**Error: Import assertions**
```typescript
// Old syntax (might cause errors)
import data from './data.json' assert { type: 'json' };

// New syntax
import data from './data.json' with { type: 'json' };

// Or use dynamic import
const data = await import('./data.json').then(m => m.default);
```

### 5. Content Not Displaying

#### Symptoms
- Blog posts not showing
- Images returning 404
- Content collections empty

#### Debugging Steps

**Step 1: Verify Content Files**
```bash
# Check if content files exist
ls src/content/blog/
ls src/content/photos/

# Validate frontmatter
# Each file should have valid YAML frontmatter
```

**Step 2: Check Collection Schema**
```typescript
// Verify schema matches content
// src/content/config.ts
const blogCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    date: z.date(), // Common issue: date format
    // ...
  }),
});
```

**Step 3: Debug Collection Query**
```typescript
// Add logging to debug
const posts = await getCollection('blog');
console.log('Found posts:', posts.length);
console.log('First post:', posts[0]);
```

### 6. Image Optimization Issues

#### Symptoms
- Images not loading
- Wrong dimensions
- Poor quality

#### Solutions

**Fix Missing Images**
```bash
# Verify image exists
ls public/images/

# Re-run optimization
npm run optimize:images

# Check for errors in optimization
node scripts/optimize-images.js --verbose
```

**Fix Focal Points**
```typescript
// Check photo metadata
// src/content/photos/[photo-name].md
---
primaryFocalX: 50  # Should be 0-100
primaryFocalY: 50  # Should be 0-100
---
```

### 7. Performance Issues

#### Slow Page Loads

**Diagnosis**
```bash
# Run Lighthouse audit
npx lighthouse http://localhost:4321 --view

# Check bundle size
npm run build -- --analyze
```

**Common Fixes**
1. **Large Images**
   ```bash
   # Find large images
   find public/images -size +500k -type f
   
   # Optimize them
   npm run optimize:images
   ```

2. **Too Many Database Queries**
   ```typescript
   // Bad: N+1 queries
   for (const item of items) {
     const details = await getDetails(item.id);
   }
   
   // Good: Single query
   const details = await getAllDetails(items.map(i => i.id));
   ```

3. **Missing Caching**
   ```typescript
   // Add caching headers
   return new Response(data, {
     headers: {
       'Cache-Control': 'public, max-age=3600',
     }
   });
   ```

### 8. Docker Issues

#### Container Won't Start

```bash
# Check logs
docker-compose logs [service-name]

# Common fixes:
# 1. Port already in use
lsof -i :4321  # Find what's using the port
kill -9 [PID]  # Kill the process

# 2. Out of disk space
docker system prune -a  # Clean up Docker

# 3. Corrupted volumes
docker-compose down -v  # Remove volumes
docker-compose up -d    # Recreate
```

#### Memory Issues

```bash
# Increase Docker memory limit
# Docker Desktop > Preferences > Resources
# Increase Memory to at least 4GB

# Or use optimized Dockerfile
docker-compose -f docker-compose.optimized.yml up
```

## Debugging Tools and Techniques

### 1. Logging Strategy

```typescript
// Development logging helper
function devLog(category: string, ...args: any[]) {
  if (import.meta.env.DEV) {
    console.log(`[${category}]`, ...args);
  }
}

// Usage
devLog('AUTH', 'User login attempt', email);
devLog('DB', 'Query result', result);
```

### 2. Database Debugging

```sql
-- Check table structure
\d+ tuition_rates

-- View recent changes
SELECT * FROM tuition_rates 
ORDER BY updated_at DESC 
LIMIT 10;

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'tuition_rates';
```

### 3. Network Debugging

```typescript
// Add request interceptor
if (import.meta.env.DEV) {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    console.log('Fetch:', args);
    const response = await originalFetch(...args);
    console.log('Response:', response.status);
    return response;
  };
}
```

## Error Patterns and Solutions

### Pattern: CORS Errors
```
Access to fetch at 'http://localhost:54321' from origin 'http://localhost:4321' has been blocked by CORS policy
```

**Solution:**
```typescript
// Add CORS headers in API response
return new Response(data, {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
});
```

### Pattern: Hydration Mismatch
```
Warning: Text content did not match. Server: "X" Client: "Y"
```

**Solution:**
```astro
---
// Use client:only for dynamic content
---
<DynamicComponent client:only="react" />
```

### Pattern: Memory Leaks
```
JavaScript heap out of memory
```

**Solution:**
```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Or find the leak
npm run build -- --profile
```

## Quick Reference

### Reset Everything
```bash
# Complete reset script
#!/bin/bash
echo "Resetting development environment..."

# Stop services
docker-compose down -v

# Clean build artifacts
rm -rf dist/ .astro/ node_modules/

# Reinstall dependencies
npm install

# Start services
docker-compose up -d

# Run migrations
npm run migrate:up

echo "Reset complete!"
```

### Common Commands
```bash
# Health check
curl http://localhost:4321/api/health

# View all logs
docker-compose logs -f

# Database console
docker exec -it app-supabase-db-1 psql -U postgres

# Clear all caches
rm -rf .astro/ dist/ node_modules/.cache/

# Test email delivery
curl http://localhost:8025

# Run specific test
npm test -- auth.test.ts
```

## Getting Help

### 1. Check Logs First
- Browser console
- Docker logs
- Build output
- Network tab

### 2. Gather Information
- Error message (exact)
- Steps to reproduce
- Environment details
- Recent changes

### 3. Resources
- This documentation
- Astro docs: https://docs.astro.build
- Supabase docs: https://supabase.com/docs
- Project README files

Remember: Most issues have been encountered before. Check the logs, follow the patterns, and work systematically through the debugging steps.