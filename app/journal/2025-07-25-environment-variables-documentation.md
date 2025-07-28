# Environment Variables and Secrets Documentation

## Overview
This document comprehensively lists all environment variables, API keys, and secrets used in the Spicebush Montessori Web Application, their purposes, and where they are used.

## Environment Variables

### Database Configuration

1. **POSTGRES_PASSWORD**
   - Type: SECRET
   - Purpose: PostgreSQL database password for Supabase
   - Used in: docker-compose.yml (multiple services)
   - Default: `your-super-secret-and-long-postgres-password`
   - Services using it: supabase-db, supabase-auth, supabase-rest, supabase-meta, supabase-analytics, supabase-functions, supabase-storage

### JWT Configuration

2. **JWT_SECRET**
   - Type: SECRET
   - Purpose: JSON Web Token secret for authentication (minimum 32 characters)
   - Used in: docker-compose.yml (multiple services)
   - Default: `your-super-secret-jwt-token-with-at-least-32-characters-long`
   - Services using it: supabase-auth, supabase-rest, supabase-realtime, supabase-functions, strapi, supabase-db

3. **JWT_EXP**
   - Type: PUBLIC
   - Purpose: JWT expiration time in seconds
   - Used in: docker-compose.yml
   - Default: 3600 (1 hour)

### Supabase Keys

4. **PUBLIC_SUPABASE_URL**
   - Type: PUBLIC
   - Purpose: Supabase API endpoint URL
   - Used in: src/lib/supabase.ts, docker-compose.yml
   - Default: `http://localhost:54321`

5. **PUBLIC_SUPABASE_ANON_KEY**
   - Type: PUBLIC
   - Purpose: Supabase anonymous key for client-side authentication
   - Used in: src/lib/supabase.ts, .env.local
   - Default: Base64 encoded JWT token (demo key provided)

6. **SUPABASE_ANON_KEY**
   - Type: PUBLIC
   - Purpose: Same as PUBLIC_SUPABASE_ANON_KEY (alternative name)
   - Used in: docker-compose.yml (multiple services)
   - Default: Same as PUBLIC_SUPABASE_ANON_KEY

7. **SUPABASE_SERVICE_ROLE_KEY**
   - Type: SECRET
   - Purpose: Supabase service role key for server-side operations with admin privileges
   - Used in: docker-compose.yml (supabase-studio, supabase-storage, supabase-functions)
   - Default: Base64 encoded JWT token (demo key provided)

### Analytics Configuration

8. **LOGFLARE_API_KEY**
   - Type: SECRET
   - Purpose: API key for Logflare analytics service
   - Used in: docker-compose.yml (supabase-analytics, supabase-studio)
   - Default: `your-super-secret-logflare-api-key`

9. **SECRET_KEY_BASE**
   - Type: SECRET
   - Purpose: Base key for Logflare encryption
   - Used in: docker-compose.yml (supabase-analytics)
   - Default: Empty in .env files

### Operator Configuration

10. **OPERATOR_TOKEN**
    - Type: SECRET
    - Purpose: Operator token for Supabase GoTrue auth service
    - Used in: docker-compose.yml (supabase-auth)
    - Default: `your-super-secret-operator-token`

### Email Configuration (Development)

11. **SMTP_HOST**
    - Type: PUBLIC
    - Purpose: SMTP server hostname
    - Used in: docker-compose.yml (supabase-auth)
    - Default: `mailhog` (for development)

12. **SMTP_PORT**
    - Type: PUBLIC
    - Purpose: SMTP server port
    - Used in: docker-compose.yml (supabase-auth)
    - Default: `1025` (MailHog port)

13. **SMTP_USER**
    - Type: PUBLIC
    - Purpose: SMTP authentication username
    - Used in: docker-compose.yml (supabase-auth)
    - Default: Empty (not required for MailHog)

14. **SMTP_PASS**
    - Type: SECRET
    - Purpose: SMTP authentication password
    - Used in: docker-compose.yml (supabase-auth)
    - Default: Empty (not required for MailHog)

### Development URLs

15. **SUPABASE_URL**
    - Type: PUBLIC
    - Purpose: Alternative name for PUBLIC_SUPABASE_URL
    - Used in: .env files
    - Default: `http://localhost:54321`

16. **STUDIO_URL**
    - Type: PUBLIC
    - Purpose: Supabase Studio UI URL
    - Used in: .env files
    - Default: `http://localhost:3000`

17. **MAILHOG_URL**
    - Type: PUBLIC
    - Purpose: MailHog web UI URL
    - Used in: .env files
    - Default: `http://localhost:8025`

### Docker Configuration

18. **DOCKER_SOCKET_LOCATION**
    - Type: PUBLIC
    - Purpose: Docker socket location for Vector logging
    - Used in: docker-compose.yml (supabase-vector)
    - Default: `/var/run/docker.sock`

### Image Optimization

19. **IMGPROXY_ENABLE_WEBP_DETECTION**
    - Type: PUBLIC
    - Purpose: Enable WebP format detection in imgproxy
    - Used in: docker-compose.yml (imgproxy)
    - Default: `true`

### Strapi CMS Configuration

20. **PUBLIC_STRAPI_URL**
    - Type: PUBLIC
    - Purpose: Strapi CMS API URL
    - Used in: Multiple Astro pages (blog.astro, [slug].astro, RecentBlogPosts.astro, admin/index.astro)
    - Default: `http://localhost:1337`

21. **STRAPI_DATABASE_PASSWORD**
    - Type: SECRET
    - Purpose: PostgreSQL password for Strapi database
    - Used in: docker-compose.yml (strapi, strapi-db)
    - Default: `strapi_password`

22. **ADMIN_JWT_SECRET**
    - Type: SECRET
    - Purpose: JWT secret for Strapi admin panel
    - Used in: docker-compose.yml (strapi)
    - Default: `your-super-secret-admin-jwt-token`

23. **APP_KEYS**
    - Type: SECRET
    - Purpose: Application keys for Strapi (comma-separated)
    - Used in: docker-compose.yml (strapi)
    - Default: `app_key_1,app_key_2,app_key_3,app_key_4`

24. **API_TOKEN_SALT**
    - Type: SECRET
    - Purpose: Salt for Strapi API token generation
    - Used in: docker-compose.yml (strapi)
    - Default: `your-api-token-salt`

25. **TRANSFER_TOKEN_SALT**
    - Type: SECRET
    - Purpose: Salt for Strapi transfer token generation
    - Used in: docker-compose.yml (strapi)
    - Default: `your-transfer-token-salt`

### Stripe Payment Configuration

26. **PUBLIC_STRIPE_PUBLISHABLE_KEY**
    - Type: PUBLIC
    - Purpose: Stripe publishable key for client-side payment processing
    - Used in: src/components/DonationForm.tsx
    - Default: `pk_test_dummy_key_configure_stripe` (fallback)

27. **STRIPE_SECRET_KEY**
    - Type: SECRET
    - Purpose: Stripe secret key for server-side payment processing
    - Used in: src/pages/api/donations/create-payment-intent.ts
    - Default: Not set (must be configured)

28. **STRIPE_WEBHOOK_SECRET**
    - Type: SECRET
    - Purpose: Stripe webhook endpoint secret for verifying webhook signatures
    - Used in: Not yet implemented
    - Default: Not set

## Security Classification

### Public Keys
These can be exposed in client-side code:
- PUBLIC_SUPABASE_URL
- PUBLIC_SUPABASE_ANON_KEY
- PUBLIC_STRAPI_URL
- PUBLIC_STRIPE_PUBLISHABLE_KEY
- SMTP_HOST, SMTP_PORT (in development)
- All URL configurations

### Secret Keys
These must NEVER be exposed in client-side code:
- POSTGRES_PASSWORD
- JWT_SECRET
- SUPABASE_SERVICE_ROLE_KEY
- LOGFLARE_API_KEY
- SECRET_KEY_BASE
- OPERATOR_TOKEN
- SMTP_PASS
- STRAPI_DATABASE_PASSWORD
- ADMIN_JWT_SECRET
- APP_KEYS
- API_TOKEN_SALT
- TRANSFER_TOKEN_SALT
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

## Usage Locations

### Frontend (Astro/React)
- `src/lib/supabase.ts`: Uses PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY
- `src/components/DonationForm.tsx`: Uses PUBLIC_STRIPE_PUBLISHABLE_KEY
- Multiple blog pages: Use PUBLIC_STRAPI_URL

### API Routes
- `src/pages/api/donations/create-payment-intent.ts`: Uses STRIPE_SECRET_KEY

### Docker Services
- All Supabase services use various environment variables as documented above
- Strapi services use their specific configuration variables

## Development vs Production

### Development Defaults
The project includes sensible defaults for local development:
- Uses MailHog for email testing
- Includes demo JWT tokens for Supabase
- Uses localhost URLs

### Production Requirements
For production deployment, you must:
1. Generate new JWT secrets (minimum 32 characters)
2. Set strong database passwords
3. Configure real SMTP credentials
4. Set up production Stripe keys
5. Generate new Strapi secrets and salts
6. Update all URLs to production domains

## Best Practices

1. **Never commit real secrets to version control**
2. **Use .env.local for local development overrides**
3. **Keep .env.example updated with all required variables**
4. **Rotate secrets regularly in production**
5. **Use different keys for development and production**
6. **Validate all environment variables on startup**

## Test Credentials

The project includes test admin accounts documented in TEST_CREDENTIALS.md:
- Admin: admin@spicebushmontessori.org / Admin2025!
- Test Admin: testadmin@spicebushmontessori.org / TestAdmin2025!
- Parent: parent@example.com / Parent2025!

These should only be used in development and must be removed before production deployment.