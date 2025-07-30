# Critical Systems Documentation

## Overview
This document details the critical systems that power the Spicebush Montessori website. Understanding these systems is essential for maintaining site functionality, security, and performance.

## Authentication System

### Architecture
The authentication system uses Supabase Auth (GoTrue) with multiple authentication methods:

```
Authentication Flow:
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Browser    │ --> │   Auth Forms    │ --> │ Supabase Auth│
└──────────────┘     └─────────────────┘     └──────┬───────┘
                                                      │
                            ┌─────────────────────────┴─────────────────────────┐
                            ▼                         ▼                         ▼
                    ┌───────────────┐       ┌──────────────┐         ┌──────────────┐
                    │ Password Auth │       │ Magic Links  │         │ OAuth (Future)│
                    └───────────────┘       └──────────────┘         └──────────────┘
```

### Implementation Details

#### Password Authentication
```typescript
// lib/supabase.ts
async signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}
```

#### Magic Link Authentication
```typescript
// lib/supabase.ts
async signInWithMagicLink(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    }
  });
  return { data, error };
}
```

#### Session Management
- Sessions stored in secure HTTP-only cookies
- Auto-refresh tokens before expiration
- 7-day session lifetime
- Admin sessions validated against whitelist

#### Admin Authorization
```typescript
// lib/admin-config.ts
const ADMIN_EMAILS = [
  'admin@spicebushmontessori.org',
  'director@spicebushmontessori.org',
  // Additional admin emails
];

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
```

### Security Measures
1. **Rate Limiting**: 10 attempts per hour for auth endpoints
2. **Email Verification**: Required for new accounts
3. **Password Requirements**: Minimum 6 characters
4. **Session Security**: HTTP-only cookies, SameSite=lax
5. **CSRF Protection**: Built into Supabase

## Database Connections

### Supabase PostgreSQL Configuration

#### Connection Types
1. **PostgREST API** (Primary)
   - Used for most queries
   - Automatic RLS enforcement
   - Connection pooling built-in

2. **Direct PostgreSQL** (Admin Only)
   - Used for migrations
   - Complex queries
   - Bulk operations

#### Database Roles
```sql
-- Roles configured in Supabase
authenticator     -- API gateway role
anon             -- Anonymous users
authenticated    -- Logged-in users
service_role     -- Admin operations
postgres         -- Superuser
readonly_user    -- Read-only access for public data
```

#### Row Level Security (RLS)
```sql
-- Example RLS policy for settings table
CREATE POLICY "Public users can view settings"
  ON public.settings
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify settings"
  ON public.settings
  FOR ALL
  USING (auth.jwt() ->> 'email' IN (
    SELECT email FROM admin_emails
  ));
```

### Connection Management
```typescript
// lib/content-db-direct.ts
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

// For API access
const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.PUBLIC_SUPABASE_ANON_KEY!
);

// For direct DB access (server-side only)
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Content Collections (Astro)

### Collection Architecture
```
/src/content/
├── config.ts          # Schema definitions
├── blog/             # Blog posts (Markdown)
├── staff/            # Staff profiles
├── photos/           # Photo metadata
├── settings/         # Site settings
├── tuition/          # Tuition programs
├── hours/            # Operating hours
└── testimonials/     # Parent testimonials
```

### Schema Definition Example
```typescript
// content/config.ts
const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    author: z.string().default('Spicebush Team'),
    categories: z.array(z.string()).default(['News']),
    image: z.string().optional(),
    excerpt: z.string(),
    draft: z.boolean().default(false),
  }),
});
```

### Content Loading
```typescript
// Load blog posts
import { getCollection } from 'astro:content';

const posts = await getCollection('blog', ({ data }) => {
  return data.draft !== true;
});
```

## API Endpoints

### Endpoint Structure
```
/api/
├── auth/
│   ├── login         # POST - User login
│   ├── logout        # POST - User logout
│   └── callback      # GET - OAuth/Magic link callback
├── admin/
│   ├── preview       # GET - Content preview
│   └── upload        # POST - File upload
└── public/
    ├── contact       # POST - Contact form
    └── newsletter    # POST - Newsletter signup
```

### API Implementation Pattern
```typescript
// pages/api/example.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  // 1. Authentication check
  const token = cookies.get('auth-token');
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Validate input
  const data = await request.json();
  const validation = validateInput(data);
  if (!validation.success) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 3. Process request
  try {
    const result = await processRequest(data);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

## Admin Functionality

### Admin Panel Architecture
```
/admin/
├── index         # Dashboard
├── settings      # Site settings
├── content/      # Content management
│   ├── blog      # Blog posts
│   ├── photos    # Photo gallery
│   └── staff     # Staff profiles
├── tuition       # Tuition management
├── hours         # Hours management
└── users         # User management
```

### Permission System
```typescript
// Middleware for admin routes
export async function onRequest({ cookies, redirect }, next) {
  const isAdmin = await checkAdminAuth(cookies);
  
  if (!isAdmin) {
    return redirect('/auth/login');
  }
  
  return next();
}
```

### Admin Features
1. **Content Management**
   - Create/Edit/Delete blog posts
   - Manage photo gallery
   - Update staff profiles

2. **Settings Management**
   - School information
   - Operating hours
   - Tuition rates
   - Site configuration

3. **User Management**
   - View registered users
   - Manage admin access
   - Activity logs

## Security Measures

### Application Security Layers

#### 1. Input Validation
```typescript
// Zod schema for validation
const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  message: z.string().min(10).max(1000),
  phone: z.string().optional(),
});

// Validate and sanitize
function validateContact(data: unknown) {
  const result = contactSchema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return sanitizeInput(result.data);
}
```

#### 2. SQL Injection Prevention
```typescript
// Always use parameterized queries
const query = `
  SELECT * FROM tuition_rates 
  WHERE program_id = $1 AND active = true
`;
const result = await pool.query(query, [programId]);
```

#### 3. XSS Prevention
```typescript
// HTML sanitization
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  });
}
```

#### 4. CSRF Protection
```typescript
// CSRF token generation
function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Validation middleware
function validateCSRF(request: Request): boolean {
  const token = request.headers.get('X-CSRF-Token');
  const sessionToken = sessions.get(request.sessionId)?.csrfToken;
  return token === sessionToken;
}
```

### Environment Security
```bash
# Production security checklist
- [ ] All secrets in environment variables
- [ ] No hardcoded credentials
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Error messages sanitized
- [ ] Logging configured (no sensitive data)
```

## Error Handling

### Global Error Boundary
```typescript
// src/layouts/ErrorBoundary.astro
---
export interface Props {
  error: Error;
  reset: () => void;
}

const { error, reset } = Astro.props;
---

<div class="error-boundary">
  <h1>Something went wrong</h1>
  <p>{import.meta.env.DEV ? error.message : 'An unexpected error occurred'}</p>
  <button onclick={reset}>Try again</button>
</div>
```

### API Error Responses
```typescript
class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
  }
}

// Standardized error response
function errorResponse(error: APIError) {
  return new Response(JSON.stringify({
    error: {
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    }
  }), {
    status: error.statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## Performance Critical Points

### Database Query Optimization
```typescript
// Use connection pooling
const pool = new pg.Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Prepared statements for frequent queries
const getTuitionRates = {
  name: 'get-tuition-rates',
  text: 'SELECT * FROM tuition_rates WHERE program_id = $1',
  values: [],
};
```

### Caching Strategy
```typescript
// In-memory cache for frequently accessed data
const cache = new Map<string, CacheEntry>();

interface CacheEntry {
  data: any;
  expiry: number;
}

async function getCachedData(key: string, fetcher: () => Promise<any>) {
  const entry = cache.get(key);
  
  if (entry && entry.expiry > Date.now()) {
    return entry.data;
  }
  
  const data = await fetcher();
  cache.set(key, {
    data,
    expiry: Date.now() + 5 * 60 * 1000 // 5 minutes
  });
  
  return data;
}
```

### Image Optimization
```javascript
// Responsive image generation
const sizes = [320, 640, 960, 1280, 1920];
const formats = ['webp', 'jpg'];

for (const size of sizes) {
  for (const format of formats) {
    await sharp(inputPath)
      .resize(size, null, { withoutEnlargement: true })
      .toFormat(format, { quality: 85 })
      .toFile(`output-${size}w.${format}`);
  }
}
```

This documentation provides a comprehensive overview of the critical systems powering the Spicebush Montessori website. Regular review and updates of these systems ensure continued reliability and security.