// Decap CMS Authentication Integration with Supabase
import { createClient } from '@supabase/supabase-js';
import { isAdminEmail } from './admin-config';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Custom authentication handler for Decap CMS
 * Validates admin access through Supabase
 */
export class SupabaseAuthenticator {
  constructor() {
    this.name = 'supabase';
  }

  /**
   * Initialize authentication
   */
  async init() {
    // Check if user is already authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && isAdminEmail(user.email)) {
      return {
        name: user.user_metadata?.full_name || user.email,
        email: user.email,
        avatar_url: user.user_metadata?.avatar_url,
        token: user.access_token
      };
    }
    
    return null;
  }

  /**
   * Handle authentication
   */
  async authenticate() {
    return new Promise((resolve, reject) => {
      // Redirect to admin login page
      const loginUrl = '/auth/login?redirect=/admin/cms';
      window.location.href = loginUrl;
      
      // Listen for successful login
      const handleAuthChange = async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const user = session.user;
          
          if (isAdminEmail(user.email)) {
            resolve({
              name: user.user_metadata?.full_name || user.email,
              email: user.email,
              avatar_url: user.user_metadata?.avatar_url,
              token: user.access_token
            });
          } else {
            reject(new Error('Admin access required'));
          }
        }
      };

      // Set up auth listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
      
      // Clean up listener after 30 seconds
      setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error('Authentication timeout'));
      }, 30000);
    });
  }

  /**
   * Handle logout
   */
  async logout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  /**
   * Get current user
   */
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && isAdminEmail(user.email)) {
      return {
        name: user.user_metadata?.full_name || user.email,
        email: user.email,
        avatar_url: user.user_metadata?.avatar_url,
        token: user.access_token
      };
    }
    
    return null;
  }
}

/**
 * Initialize Decap CMS with Supabase authentication
 */
export function initDecapCMS() {
  if (typeof window !== 'undefined' && window.CMS) {
    // Register the custom authenticator
    window.CMS.registerBackend('supabase', SupabaseAuthenticator);
    
    // Initialize CMS with custom config
    window.CMS.init({
      config: {
        backend: {
          name: 'supabase',
          auth_scope: 'admin'
        }
      }
    });
  }
}

/**
 * Check if current user has admin access to CMS
 */
export async function checkCMSAccess(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user ? isAdminEmail(user.email) : false;
  } catch (error) {
    console.error('Error checking CMS access:', error);
    return false;
  }
}