# Environment-Based Domain Configuration

**Date**: August 5, 2025  
**Time**: Evening
**Task**: Configure testing and production sites to use environment-based domains

## Problem Statement
The project had hardcoded domains in various places:
- `astro.config.mjs` had production domain hardcoded
- Test files used hardcoded `localhost:4321`
- No clear separation between testing and production domains

## Solution Implemented

### 1. Updated Astro Configuration
Modified `astro.config.mjs` to use environment variable:
```javascript
site: process.env.PUBLIC_SITE_URL || 'https://spicebushmontessori.org',
```

### 2. Created Environment-Specific Configurations

#### .env.testing
```env
PUBLIC_SITE_URL=https://spicebush-testing.netlify.app
ENVIRONMENT=testing
EMAIL_FROM_NAME=Spicebush Montessori (Testing)
```

#### .env.production.example
```env
PUBLIC_SITE_URL=https://spicebushmontessori.org
```

#### .env.example (for local development)
```env
PUBLIC_SITE_URL=http://localhost:4321
```

### 3. Updated Test Files
Modified test files to use environment variables with fallback chain:
```javascript
const BASE_URL = process.env.TEST_BASE_URL || process.env.PUBLIC_SITE_URL || 'http://localhost:4321';
```

Files updated:
- `tests/comprehensive-site-test.js`
- `tests/site-test-summary.js`
- `playwright.config.ts`
- `test-browser-fixed.mjs`
- `test-browser-detailed.mjs`

### 4. Updated Documentation
- Added PUBLIC_SITE_URL to `netlify.toml` environment variables list

## Benefits
1. **Environment Separation**: Testing and production sites now use their respective domains
2. **No Hardcoding**: Domains are configured via environment variables
3. **Flexible Testing**: Tests can run against different environments by setting environment variables
4. **Easy Expansion**: Can easily add staging or other environments

## Testing Instructions

### Local Development
```bash
# Uses localhost:4321 by default
npm run dev
```

### Testing Against Testing Site
```bash
# Set environment variable for tests
export PUBLIC_SITE_URL=https://spicebush-testing.netlify.app
npm test
```

### Testing Against Production
```bash
# Set environment variable for tests
export PUBLIC_SITE_URL=https://spicebushmontessori.org
npm test
```

## Netlify Configuration Required

### For Testing Site
In Netlify dashboard for testing site, add:
```
PUBLIC_SITE_URL=https://spicebush-testing.netlify.app
```

### For Production Site
In Netlify dashboard for production site, add:
```
PUBLIC_SITE_URL=https://spicebushmontessori.org
```

## Next Steps
1. Deploy to testing branch
2. Configure PUBLIC_SITE_URL in Netlify dashboard for testing site
3. Verify testing site uses correct domain
4. Test that production site continues to work correctly