# Development Guide

## Local Development Setup

### Prerequisites
- Node.js 18+ (recommend using nvm)
- Docker Desktop installed and running
- Git for version control
- VS Code or preferred editor

### Initial Setup

1. **Clone the Repository**
   ```bash
   git clone [repository-url]
   cd SpicebushWebapp/app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy example environment file
   cp .env.example .env.local
   
   # Edit .env.local with your values
   ```

4. **Start Docker Services**
   ```bash
   # Start full Supabase stack
   docker-compose up -d
   
   # Wait for services to be healthy
   docker-compose ps
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

### Service URLs
- **Application**: http://localhost:4321
- **Supabase Studio**: http://localhost:3000
- **MailHog (Email)**: http://localhost:8025
- **PostgreSQL**: localhost:54322

## Environment Variables

### Required Variables
```bash
# Supabase Configuration
PUBLIC_SUPABASE_URL=http://localhost:54321
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Database Direct Connection (for migrations)
DATABASE_URL=postgresql://postgres:your-password@localhost:54322/postgres
POSTGRES_PASSWORD=your-super-secret-and-long-postgres-password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters-long

# Email Configuration (Development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=

# Application Settings
NODE_ENV=development
```

### Optional Variables
```bash
# Stripe (if testing payments)
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Analytics (if enabled)
PUBLIC_ANALYTICS_ID=...

# Feature Flags
ENABLE_COMING_SOON=false
ENABLE_BLOG_COMMENTS=false
```

## Docker Configuration

### Docker Compose Services
```yaml
services:
  app:           # Astro application
  supabase-db:   # PostgreSQL database
  supabase-auth: # Authentication service
  supabase-rest: # PostgREST API
  supabase-storage: # File storage
  mailhog:       # Email testing
```

### Common Docker Commands
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down

# Reset everything (including volumes)
docker-compose down -v

# Rebuild after Dockerfile changes
docker-compose up --build
```

### Troubleshooting Docker
1. **Services not starting**: Check `docker-compose logs`
2. **Port conflicts**: Ensure ports 3000, 4321, 54321, 54322 are free
3. **Database connection issues**: Wait for health checks to pass
4. **Reset database**: `docker-compose down -v` then up again

## Testing Approach

### Testing Stack
- **Vitest**: Unit and integration tests
- **Playwright**: End-to-end tests
- **Testing Library**: Component testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

### Writing Tests

#### Unit Test Example
```typescript
// src/test/lib/tuition-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculateTuition } from '@/lib/tuition-calculator';

describe('calculateTuition', () => {
  it('calculates base tuition correctly', () => {
    const result = calculateTuition({
      programId: 'full-day-5',
      familySize: 4,
      annualIncome: 75000
    });
    
    expect(result.baseTuition).toBe(1250);
    expect(result.annualTotal).toBe(15000);
  });
});
```

#### E2E Test Example
```typescript
// e2e/contact-form.spec.ts
import { test, expect } from '@playwright/test';

test('contact form submission', async ({ page }) => {
  await page.goto('/contact');
  
  await page.fill('input[name="name"]', 'Test User');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('textarea[name="message"]', 'Test message');
  
  await page.click('button[type="submit"]');
  
  await expect(page.locator('.success-message')).toBeVisible();
});
```

## Code Standards and Conventions

### TypeScript Guidelines
```typescript
// Use explicit types for function parameters
function calculateDiscount(
  baseAmount: number,
  discountRate: number
): number {
  return baseAmount * (1 - discountRate);
}

// Use interfaces for object shapes
interface TuitionProgram {
  id: string;
  name: string;
  baseCost: number;
  extendedCareAvailable: boolean;
}

// Use enums for constants
enum UserRole {
  ADMIN = 'admin',
  PARENT = 'parent',
  STAFF = 'staff'
}
```

### Component Structure
```typescript
// Astro Component
---
import type { ImageMetadata } from 'astro';
import Layout from '@/layouts/Layout.astro';

export interface Props {
  title: string;
  description?: string;
}

const { title, description } = Astro.props;
---

<Layout title={title}>
  <h1>{title}</h1>
  {description && <p>{description}</p>}
</Layout>

<style>
  h1 {
    @apply text-4xl font-bold mb-4;
  }
</style>
```

### File Naming Conventions
- Components: `PascalCase.astro` or `PascalCase.tsx`
- Utilities: `kebab-case.ts`
- Tests: `*.test.ts` or `*.spec.ts`
- Types: `*.types.ts`
- Constants: `UPPER_SNAKE_CASE`

### Import Organization
```typescript
// 1. External imports
import { z } from 'zod';
import type { APIRoute } from 'astro';

// 2. Internal absolute imports
import { supabase } from '@/lib/supabase';
import type { TuitionProgram } from '@/types/tuition';

// 3. Relative imports
import Header from '../components/Header.astro';
import { formatCurrency } from './utils';

// 4. Style imports
import './styles.css';
```

## Common Development Tasks

### Adding a New Page
1. Create file in `src/pages/`
2. Use appropriate layout
3. Add to navigation if needed
4. Test responsive design

### Creating a Content Collection
1. Define schema in `src/content/config.ts`
2. Create content directory
3. Add markdown files
4. Query in pages/components

### Adding an API Endpoint
```typescript
// src/pages/api/example.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  
  // Process data
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### Database Migrations
```bash
# Create new migration
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_description.sql

# Apply migrations
docker exec -it app-supabase-db-1 psql -U postgres -f /docker-entrypoint-initdb.d/migrations/your-migration.sql
```

### Image Optimization
```bash
# Optimize new images
npm run optimize:images

# Process specific directory
node scripts/optimize-images.js --input=public/images/new --output=public/images/optimized
```

## Debugging Tips

### Common Issues

1. **Blank Admin Page**
   - Check browser console for errors
   - Verify authentication status
   - Clear cookies and cache

2. **Database Connection Failed**
   - Ensure Docker is running
   - Check DATABASE_URL format
   - Verify network connectivity

3. **Build Errors**
   - Check for TypeScript errors: `npm run typecheck`
   - Verify imports are correct
   - Check content collection schemas

### Debugging Tools

#### Browser DevTools
- Network tab for API calls
- Console for JavaScript errors
- Application tab for cookies/storage

#### VS Code Debugging
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Dev Server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal"
    }
  ]
}
```

#### Database Inspection
```bash
# Connect to database
docker exec -it app-supabase-db-1 psql -U postgres

# Useful queries
\dt                      # List tables
\d+ table_name          # Describe table
SELECT * FROM settings; # Query data
```

## Performance Monitoring

### Development Performance
```typescript
// Add performance marks
performance.mark('component-start');
// Component logic
performance.mark('component-end');
performance.measure('component-render', 'component-start', 'component-end');
```

### Build Analysis
```bash
# Analyze bundle size
npm run build -- --analyze

# Check lighthouse scores
npx lighthouse http://localhost:4321 --view
```

## Security Best Practices

### Never Commit
- `.env.local` files
- Private keys
- Database passwords
- API secrets

### Always Validate
- User inputs
- File uploads
- API responses
- URL parameters

### Use Proper Auth
- Check permissions on every admin route
- Validate sessions server-side
- Use HTTPS in production
- Implement CSRF protection

This development guide provides the foundation for working on the Spicebush Montessori website. Always refer to the latest documentation and communicate with the team when making significant changes.