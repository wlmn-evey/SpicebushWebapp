# Spicebush Montessori School Website - Development Workflow Guide

*Date: 2025-07-15*
*Project: Astro + Supabase School Website*

## Technology Stack
- **Frontend**: Astro (static site generator)
- **Backend**: Supabase (PostgreSQL database, auth, real-time)
- **Styling**: CSS/Tailwind CSS
- **Deployment**: Vercel/Netlify
- **Type Safety**: TypeScript

## Project Structure
```
spicebush-webapp/
├── src/
│   ├── pages/           # Astro routes (index.astro, about.astro, etc.)
│   ├── components/      # Reusable UI components
│   ├── layouts/         # Page layouts (BaseLayout.astro)
│   ├── lib/            # Utilities and Supabase client
│   └── styles/         # Global CSS and component styles
├── public/             # Static assets (images, fonts)
├── supabase/          # Database schema, migrations, functions
├── astro.config.mjs   # Astro configuration
├── package.json       # Dependencies and scripts
└── .env.local         # Environment variables
```

## Development Workflow

### Initial Setup
1. **Clone and Install**: `git clone` → `npm install`
2. **Environment Setup**: Configure `.env.local` with Supabase keys
3. **Database Setup**: `supabase start` → run migrations → seed data
4. **Type Generation**: `supabase gen types typescript` for database types

### Daily Development
1. **Start Development**: `npm run dev` (usually port 4321)
2. **Database Management**: Use Supabase dashboard or CLI
3. **Component Development**: Create/modify components in `/src/components/`
4. **Page Creation**: Add new routes in `/src/pages/`
5. **Styling**: Update styles (component-scoped or global)

### Testing & Quality
1. **Type Checking**: `npm run typecheck`
2. **Linting**: `npm run lint`
3. **Testing**: `npm run test` (if configured)
4. **Build Test**: `npm run build` → `npm run preview`

### Database Workflow
1. **Schema Changes**: Create migration files in `supabase/migrations/`
2. **Apply Migrations**: `supabase db reset` (local) or `supabase db push` (remote)
3. **Type Updates**: Regenerate types after schema changes
4. **Seed Data**: Use `supabase/seed.sql` for test data

### Deployment
1. **Build**: `npm run build` generates `/dist/` folder
2. **Environment**: Set production environment variables
3. **Deploy**: Push to main branch (auto-deploy via Vercel/Netlify)
4. **Database**: Apply migrations to production Supabase project

## Key Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `supabase start` - Start local Supabase
- `supabase gen types typescript` - Generate database types
- `supabase db reset` - Reset local database

## School-Specific Features
- **Admin Portal**: Staff content management
- **Event Calendar**: School events and announcements
- **Enrollment Forms**: Contact and application forms
- **Photo Galleries**: Classroom and activity photos
- **Parent Resources**: Documents and communication tools
- **Staff Directory**: Teacher and administrator profiles

## Best Practices
- Use TypeScript for type safety
- Component-first development approach
- Responsive design (mobile-first)
- SEO optimization with Astro's built-in features
- Regular database backups
- Environment-specific configurations
- Progressive enhancement for forms