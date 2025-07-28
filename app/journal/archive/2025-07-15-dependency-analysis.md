# SpicebushWebapp Dependency Analysis
*Created: July 15, 2025*

## Analysis Overview
Completed comprehensive dependency mapping of the SpicebushWebapp project, analyzing all `.astro`, `.ts`, and `.js` files in the `/src` directory to identify component relationships, utility dependencies, and external package usage.

## Key Architectural Findings

### Core Library Dependencies (`src/lib/`)
- **supabase.ts**: Central authentication and database client
- **development-helpers.ts**: Test account utilities and development environment helpers

### Main Layout Structure
- **Layout.astro**: Base layout with SEO, fonts, accessibility features
- **Header.astro**: Navigation with AuthNav integration
- **Footer.astro**: Site footer (referenced but not analyzed in detail)

### Authentication Flow
- **AuthForm.astro**: Universal form component for login/register/forgot-password/update-password
- **AuthNav.astro**: User authentication state display and menu
- All auth pages use the same AuthForm component pattern

### Database Integration Points
- Supabase client used extensively in admin dashboard
- TuitionCalculator component has heavy database integration
- Admin pages query multiple database tables

### External Package Dependencies
- Astro framework (5.2.5)
- Tailwind CSS for styling
- Lucide icons throughout UI
- Supabase for authentication and database

## Impact Areas Identified
1. **Supabase client changes** would affect almost all admin functionality
2. **AuthForm changes** impact all authentication flows
3. **Header/Layout changes** affect entire site
4. **TuitionCalculator** is a complex standalone component with database dependencies

## Security Considerations
- Test email domains are hardcoded in development helpers
- Admin privileges determined by email domain/pattern matching
- Client-side authentication state management

## Next Steps
- Consider centralizing icon imports
- Review database query patterns for optimization opportunities
- Evaluate component reusability patterns