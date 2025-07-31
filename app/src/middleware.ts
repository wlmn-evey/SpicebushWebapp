import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';
import { SessionManager } from './lib/session-manager';

const SESSION_COOKIE_NAME = 'sbms-session';

export const onRequest = defineMiddleware(async (context, next) => {
  // Initialize Supabase client
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_PUBLIC_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get the coming soon configuration from settings table
  const { data: settings, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'coming_soon_enabled')
    .single();
  
  const isComingSoonEnabled = settings?.value === true || settings?.value === 'true';
  
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
  
  // Also bypass if URL contains Supabase auth confirmation parameters
  const hasAuthParams = context.url.searchParams.has('token_hash') || 
                       context.url.searchParams.has('type') ||
                       context.url.searchParams.has('error') ||
                       context.url.searchParams.has('error_code');
  
  // Check if user has valid admin session
  let isAdmin = false;
  const sessionToken = context.cookies.get(SESSION_COOKIE_NAME)?.value;
  
  if (sessionToken) {
    const session = await SessionManager.validateSession(sessionToken);
    isAdmin = !!session;
  }
  
  // If coming soon mode is enabled and this isn't a bypass path and user isn't admin
  if (isComingSoonEnabled && !shouldBypass && !hasAuthParams && !isAdmin) {
    // Redirect to coming soon page
    return context.redirect('/coming-soon');
  }
  
  // Clean up expired sessions periodically (1% chance per request)
  if (Math.random() < 0.01) {
    SessionManager.cleanupExpiredSessions().catch(console.error);
  }
  
  // Get the response and apply performance headers
  const response = await next();
  
  // Apply performance and caching headers
  const newHeaders = new Headers(response.headers);
  
  // Apply caching based on path type
  if (pathname.startsWith('/_astro/')) {
    // Static assets - aggressive caching (1 year)
    newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    newHeaders.set('X-Content-Type-Options', 'nosniff');
  } else if (pathname.match(/\.(webp|jpg|jpeg|png|svg|woff2|woff)$/)) {
    // Static files - moderate caching (1 month)
    newHeaders.set('Cache-Control', 'public, max-age=2592000');
    newHeaders.set('X-Content-Type-Options', 'nosniff');
  } else if (response.headers.get('content-type')?.includes('text/html')) {
    // HTML pages - short cache with revalidation
    newHeaders.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    
    // Security headers for HTML
    newHeaders.set('X-Frame-Options', 'DENY');
    newHeaders.set('X-Content-Type-Options', 'nosniff');
    newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    newHeaders.set('X-XSS-Protection', '1; mode=block');
    
    // Performance hints for homepage
    if (pathname === '/') {
      newHeaders.set('Link', [
        '</images/optimized/homepage/homepage-montessori-children-autumn-hero-seasonal-learning-1920x1080.webp>; rel=preload; as=image; type=image/webp; media=(min-width: 768px)',
        '</images/optimized/homepage/homepage-montessori-children-autumn-hero-seasonal-learning-1280w.webp>; rel=preload; as=image; type=image/webp; media=(max-width: 767px)',
        '<https://fonts.googleapis.com>; rel=preconnect',
        '<https://fonts.gstatic.com>; rel=preconnect; crossorigin'
      ].join(', '));
    }
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
});