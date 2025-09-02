import { defineMiddleware } from 'astro:middleware';
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';
import { shouldUseClerk } from './lib/auth/clerk-helpers';

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)'
]);

// Coming soon middleware
const comingSoonMiddleware = defineMiddleware(async (context, next) => {
  // Check environment variable for coming soon mode
  const isComingSoonEnabled = import.meta.env.COMING_SOON_MODE === 'true';
  
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

// Supabase middleware for when Clerk is not used
const supabaseMiddleware = defineMiddleware(async (context, next) => {
  // For Supabase, we check the session from cookies
  // This is a simplified check - in production you'd verify the JWT
  if (isProtectedRoute(context.request)) {
    const cookie = context.cookies.get('sb-access-token');
    
    if (!cookie?.value) {
      // Redirect to sign-in for protected routes
      return context.redirect('/auth/sign-in');
    }
    
    // TODO: Verify the token with Supabase
    // For now, we'll just check if it exists
  }
  
  // Apply coming soon middleware
  return comingSoonMiddleware(context, next);
});

// Export the appropriate middleware based on auth provider
export const onRequest = shouldUseClerk() 
  ? clerkMiddleware((auth, context, next) => {
      // Clerk middleware with authentication check
      if (isProtectedRoute(context.request)) {
        const authObj = auth();
        
        if (!authObj.userId) {
          // Redirect to Clerk sign-in for protected routes
          return context.redirect('/auth/clerk-sign-in');
        }
      }
      
      // Apply coming soon middleware
      return comingSoonMiddleware(context, next);
    })
  : supabaseMiddleware;