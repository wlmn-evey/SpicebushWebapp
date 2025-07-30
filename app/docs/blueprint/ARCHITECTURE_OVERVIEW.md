# Spicebush Montessori Website Architecture Overview

## Technology Stack

### Frontend Framework
- **Astro v5.2.5** - Modern static site generator with SSR capabilities
- **React v19.1.0** - For interactive components (donation forms, calculators)
- **TypeScript** - Type-safe development
- **Tailwind CSS v3.4** - Utility-first CSS framework

### Backend Services
- **Supabase** - Backend-as-a-Service platform providing:
  - PostgreSQL database
  - Authentication (Auth)
  - Real-time subscriptions
  - Storage API
  - PostgREST API
- **Node.js** - Server runtime for SSR mode

### Development Environment
- **Docker** - Containerized development with full Supabase stack
- **Vite** - Build tool and dev server (via Astro)
- **Vitest** - Unit testing framework
- **Playwright** - E2E testing

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Browser                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │   Static Pages   │    │ Interactive Components │              │
│  │  (Astro SSR)     │    │  (React Islands)     │              │
│  └────────┬─────────┘    └─────────┬──────────┘                │
│           │                         │                             │
└───────────┼─────────────────────────┼─────────────────────────────┘
            │                         │
            ▼                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Astro Application Server                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │   Routes    │  │  Components  │  │  Content Collections │   │
│  │  /pages/*   │  │  /components │  │   /content/*        │   │
│  └──────┬──────┘  └───────┬──────┘  └──────────┬──────────┘   │
│         │                  │                     │               │
│  ┌──────▼──────────────────▼─────────────────────▼──────────┐  │
│  │              Application Logic Layer                      │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │  │
│  │  │Auth Handler │  │Content DB    │  │ Admin Functions │ │  │
│  │  │/lib/supabase│  │/lib/content-db│  │ /lib/admin-*  │ │  │
│  │  └──────┬──────┘  └───────┬──────┘  └────────┬───────┘ │  │
│  └─────────┼──────────────────┼──────────────────┼─────────┘  │
└────────────┼──────────────────┼──────────────────┼─────────────┘
             │                  │                   │
             ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Platform                           │
│  ┌────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Auth Service  │  │  PostgreSQL DB  │  │  Storage API    │ │
│  │  (GoTrue)      │  │  (PostgREST)    │  │  (S3-compatible)│ │
│  └────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
│  ┌────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Realtime      │  │  Kong Gateway   │  │  Edge Functions │ │
│  │  (WebSockets)  │  │  (API Gateway)  │  │  (Deno Runtime) │ │
│  └────────────────┘  └─────────────────┘  └─────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Component Relationships

### 1. Public Website Flow
```
User → Astro Pages → Content Collections → Rendered HTML
                  ↓
            Components → Optimized Images
                      → SEO Metadata
```

### 2. Admin Panel Flow
```
Admin User → Auth Check → Admin Layout → Admin Pages
                      ↓                        ↓
                Supabase Auth            Content Management
                                              ↓
                                        Database Updates
```

### 3. Content Management Architecture
```
Content Sources:
├── Markdown Files (/content/*)
│   ├── Blog Posts
│   ├── Staff Profiles
│   ├── Settings
│   └── Photos Metadata
│
└── PostgreSQL Database
    ├── Tuition Rates
    ├── School Hours
    ├── Announcements
    └── Dynamic Content
```

## Database Structure

### Core Tables
```sql
-- Authentication (managed by Supabase Auth)
auth.users

-- Content Management
public.tuition_programs
public.tuition_rates
public.school_hours
public.settings
public.announcements
public.events
public.testimonials

-- Media Management
public.photos
public.media_uploads
```

### Key Relationships
- `tuition_rates` → `tuition_programs` (program_id)
- All content tables have created_at, updated_at timestamps
- Soft deletes via active/deleted_at columns

## Authentication Flow

### 1. Magic Link Authentication
```
User Request → Enter Email → Send Magic Link → Email Sent
                                            ↓
User Inbox ← Verify Token ← Click Link ← User
     ↓
Set Session → Redirect to Admin
```

### 2. Password Authentication
```
Login Form → Validate Credentials → Supabase Auth
                                         ↓
                                   Create Session
                                         ↓
                                   Set Auth Cookie
```

### 3. Admin Authorization
```
Request → Check Cookie → Verify Supabase Session → Check Email
                                                         ↓
                                                   Admin Config
                                                         ↓
                                                   Grant Access
```

## Content Management Approach

### Hybrid Content Strategy
1. **Static Content** (Markdown/MDX)
   - Blog posts
   - Staff profiles
   - Photo metadata
   - SEO-optimized content

2. **Dynamic Content** (Database)
   - Tuition rates and calculators
   - School hours
   - Announcements
   - Form submissions

### Content Collections
- Type-safe schemas via Zod
- Build-time validation
- Automatic routing for blog posts
- SEO metadata support

### Admin CMS Features
- Simple form-based editing
- Direct database updates
- No external CMS dependencies
- Real-time preview capability

## Security Measures

### Authentication Security
- JWT tokens with proper expiration
- HTTP-only cookies for session management
- Email verification for new accounts
- Rate limiting on auth endpoints

### Database Security
- Row Level Security (RLS) policies
- Read-only database user for public queries
- Service role key protected
- Prepared statements to prevent SQL injection

### Application Security
- Environment variable validation
- CORS configuration
- CSP headers (planned)
- Input sanitization

## Performance Optimizations

### Image Optimization
- Sharp library for processing
- WebP format with fallbacks
- Responsive srcset generation
- Lazy loading by default
- Focal point preservation

### Build Optimizations
- Static page generation where possible
- Component-level code splitting
- Tree shaking unused code
- CSS purging with Tailwind

### Runtime Optimizations
- Edge caching strategies
- Database connection pooling
- Minimal client-side JavaScript
- Progressive enhancement approach

## Development Workflow

### Local Development
```bash
# Start Docker environment
docker-compose up

# Run development server
npm run dev

# Access services
- App: http://localhost:4321
- Supabase Studio: http://localhost:3000
- MailHog: http://localhost:8025
```

### Testing Strategy
- Unit tests for utilities
- Integration tests for API endpoints
- E2E tests for critical user flows
- Visual regression testing

### Code Organization
```
/app
├── src/
│   ├── pages/        # Route definitions
│   ├── components/   # Reusable components
│   ├── layouts/      # Page layouts
│   ├── lib/          # Utilities and logic
│   ├── content/      # Markdown content
│   └── styles/       # Global styles
├── public/           # Static assets
├── scripts/          # Build/migration scripts
└── tests/            # Test suites
```

This architecture provides a solid foundation for a modern, performant, and maintainable educational institution website with integrated content management capabilities.