import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';

export const onRequest = defineMiddleware(async (context, next) => {
  // Initialize Supabase client
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHl7qWa00fNKZdJ9rHxs9eA';
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
  
  // Check if user is authenticated (admin)
  const isAdmin = context.cookies.get('sbms-admin-auth')?.value === 'true';
  
  // If coming soon mode is enabled and this isn't a bypass path and user isn't admin
  if (isComingSoonEnabled && !shouldBypass && !hasAuthParams && !isAdmin) {
    // Redirect to coming soon page
    return context.redirect('/coming-soon');
  }
  
  // Continue to the requested page
  return next();
});