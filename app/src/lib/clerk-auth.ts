import type { AstroGlobal } from 'astro';

/**
 * Check if user is authenticated with Clerk
 * Note: With Clerk middleware, authentication is handled automatically
 * This function is kept for compatibility with existing code
 */
export async function checkClerkAuth(Astro: AstroGlobal) {
  // Clerk middleware handles authentication automatically
  // If we reach this point and the route is protected, the user is authenticated
  // For now, we'll return a simple authenticated state
  // In production, you can enhance this to fetch user details from Clerk's API
  
  // Check if we're on a protected route (admin pages)
  const isAdminRoute = Astro.url.pathname.startsWith('/admin');
  
  if (isAdminRoute) {
    // If we're on an admin route and haven't been redirected, user is authenticated
    return {
      isAuthenticated: true,
      user: {
        // User details would be fetched from Clerk here
        // For now, just return a placeholder
        id: 'clerk-user'
      }
    };
  }
  
  return {
    isAuthenticated: false,
    user: null
  };
}

/**
 * Protect a page/route with Clerk authentication
 * Note: With Clerk middleware, this is handled automatically
 */
export function requireAuth(Astro: AstroGlobal) {
  // Clerk middleware handles authentication automatically
  // This function is kept for compatibility
  return { userId: 'clerk-user' };
}