# SpicebushWebapp Project Overview

## Project Purpose
Spicebush Montessori school website - a modern, responsive website for a Montessori school with features including:
- Public pages (about, programs, tuition)
- Tour scheduling system
- Donation processing with Stripe
- Admin panel for content management
- Blog/news functionality
- Contact forms and email integration

## Tech Stack
- **Frontend**: Astro with React components
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Payment**: Stripe integration
- **Email**: Unione/SendGrid
- **Hosting**: Netlify
- **CMS**: DecapCMS (migrated from Strapi)

## Development Commands
Located in `/app/package.json`:

### Core Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:production` - Build with type checking
- `npm run preview` - Preview build locally

### Code Quality
- `npm run lint` - ESLint check
- `npm run lint:fix` - ESLint auto-fix
- `npm run format` - Prettier format
- `npm run format:check` - Prettier check
- `npm run typecheck` - TypeScript check

### Testing
- `npm run test` - Run unit tests (Vitest)
- `npm run test:watch` - Watch mode
- `npm run test:e2e` - Playwright e2e tests
- `npm run test:accessibility` - A11y tests
- `npm run test:performance` - Performance tests

### Deployment
- `npm run deploy:staging` - Deploy to staging
- `npm run deploy:production` - Deploy to production

## Project Structure
- `/app` - Main application code
- `/app/src` - Source code
- `/app/public` - Static assets
- `/app/journal` - Development journal/memory files
- `/app/tests` - Test files
- `/app/scripts` - Utility scripts

## Environment Management
The project uses environment-specific configuration with files like:
- `.env.example` - Template
- `.env.production.example` - Production template
- `netlify.toml` - Netlify configuration

## Key Architecture Notes
- Astro-based SSG/SSR hybrid
- Component-based React integration
- Supabase for backend services
- Stripe for payment processing
- Responsive design with Tailwind
- Security headers and CSP configured