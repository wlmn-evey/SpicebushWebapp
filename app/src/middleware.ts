import { defineMiddleware } from 'astro:middleware';
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';
import { createClerkClient } from '@clerk/backend';

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)'
]);

// Coming soon middleware
const comingSoonMiddleware = defineMiddleware(async (context, next) => {
  // Check environment variable for coming soon mode (for testing/staging environments)
  // This allows testing site to have coming soon enabled without database changes
  // Prefer runtime env for SSR (Netlify functions), fallback to build-time env
  const rawComingSoon = process.env.COMING_SOON_MODE ?? import.meta.env.COMING_SOON_MODE;
  const isComingSoonEnabled = typeof rawComingSoon === 'string'
    ? ['true', '1', 'yes', 'on'].includes(rawComingSoon.toLowerCase())
    : Boolean(rawComingSoon);

  // Get the current path
  const pathname = context.url.pathname;

  // List of paths that should bypass coming soon mode
  const bypassPaths = [
    '/coming-soon',
    '/coming-soon-comprehensive',
    '/admin',
    '/auth',
    '/api',
    '/uploads',
    '/_image',
    '/favicon.svg',
    '/images/'
  ];

  // Check if the path should bypass coming soon mode
  const shouldBypass = bypassPaths.some(path => pathname.startsWith(path));

  // Also bypass if URL contains auth confirmation parameters
  const hasAuthParams = context.url.searchParams.has('token_hash') ||
                       context.url.searchParams.has('type') ||
                       context.url.searchParams.has('error') ||
                       context.url.searchParams.has('error_code');

  // Redirect to coming soon page if enabled and not bypassed
  if (isComingSoonEnabled && !shouldBypass && !hasAuthParams) {
    return context.redirect('/coming-soon');
  }

  // Continue with the request
  return next();
});

// Combine Clerk and coming soon middleware
export const onRequest = clerkMiddleware(async (auth, context, next) => {
  // Check if route requires authentication
  if (isProtectedRoute(context.request)) {
    const authObj = auth();
    if (!authObj.userId) {
      // Redirect to sign-in for protected routes
      return context.redirect('/auth/sign-in');
    }

    // Attach minimal user context for downstream handlers/pages
    try {
      // Always set userId
      // @ts-ignore - locals is dynamic
      context.locals.userId = authObj.userId;
      // Optionally enrich with email using Clerk backend if available
      const secret = process.env.CLERK_SECRET_KEY || '';
      if (secret) {
        const clerk = createClerkClient({ secretKey: secret });
        const user = await clerk.users.getUser(authObj.userId);
        const email = user?.emailAddresses?.[0]?.emailAddress;
        // @ts-ignore - locals is dynamic
        if (email) context.locals.userEmail = email;
      }
    } catch (e) {
      // Failed to populate user email - continue anyway
    }
  }

  // Apply coming soon middleware
  return comingSoonMiddleware(context, next);
});
