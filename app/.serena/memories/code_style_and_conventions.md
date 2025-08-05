# Code Style and Conventions

## TypeScript Standards
- **Type Safety**: Strict TypeScript configuration with `"strict": true`
- **Type Hints**: Explicit return types for functions and methods
- **Interface Definitions**: Comprehensive interfaces for data structures
- **Import Organization**: Path aliases configured (@, @components, @lib, @utils, etc.)

## Code Organization
### Directory Structure
```
src/
├── components/        # Reusable UI components
├── layouts/          # Page layouts and templates  
├── pages/            # Astro pages and API routes
├── lib/              # Core business logic and utilities
├── utils/            # Helper functions and utilities
├── styles/           # CSS and styling files
├── content/          # Content collections and markdown
├── types/            # TypeScript type definitions
├── test/             # Test files organized by type
└── assets/           # Static assets
```

## Naming Conventions
- **Files**: kebab-case for files (`contact-form.astro`, `api-utils.ts`)
- **Components**: PascalCase for component names and files
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase

## Component Patterns
- **Astro Components**: Use `.astro` extension with component scripts at top
- **React Components**: Limited use for interactive elements only
- **Server Components**: Leverage Astro's server-side rendering
- **API Routes**: Follow REST conventions in `pages/api/`

## Error Handling Standards
- **API Routes**: Consistent error response format with status codes
- **Client-side**: Try-catch blocks with user-friendly error messages
- **Logging**: Structured logging with appropriate log levels
- **Validation**: Server-side validation for all inputs

## Security Practices
- **Environment Variables**: Proper PUBLIC_ prefixing for client-safe variables
- **Authentication**: Middleware-based auth checks
- **Input Sanitization**: DOMPurify for HTML content
- **CSRF Protection**: Built into form handling
- **HTTPS**: Enforced in production

## Testing Standards
- **Unit Tests**: Vitest for component and utility testing
- **Integration Tests**: API route and database testing
- **E2E Tests**: Playwright for full user journey testing
- **Accessibility Tests**: Automated a11y compliance checking
- **Performance Tests**: Bundle size and runtime performance monitoring

## Documentation
- **Code Comments**: JSDoc format for functions and complex logic
- **README Updates**: Keep project documentation current
- **API Documentation**: Inline documentation for API endpoints
- **Journal Entries**: Maintain session logs in `/journal/` directory

## Git Conventions
- **Commit Messages**: Conventional commits format (feat:, fix:, docs:, etc.)
- **Branch Strategy**: Feature branches with descriptive names
- **PR Reviews**: Required for production deployments
- **Security**: No credentials or sensitive data in commits