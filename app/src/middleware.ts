import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  // Check environment variable for coming soon mode (for testing/staging environments)
  // This allows testing site to have coming soon enabled without database changes
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