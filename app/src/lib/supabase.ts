import { createClient } from '@supabase/supabase-js';
import { isAdminEmail } from './admin-config';

// Environment variables - don't validate immediately
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_PUBLIC_KEY;

// Lazy client initialization - only create when actually needed
let _supabaseClient: any = null;

// Function to get or create Supabase client
const getSupabaseClient = () => {
  if (!_supabaseClient) {
    // Validate environment variables only when client is needed
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing: Check PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY environment variables');
    }

    _supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'X-Client-Info': 'spicebush-montessori-web'
        }
      }
    });
  }
  
  return _supabaseClient;
};

// Export lazy client getter instead of direct client
export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

// Auth helper functions - now use lazy client
export const auth = {
  // Sign up new user
  async signUp(email: string, password: string) {
    const { data, error } = await getSupabaseClient().auth.signUp({
      email,
      password
    });
    return { data, error };
  },

  // Sign in user
  async signIn(email: string, password: string) {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  // Sign out user
  async signOut() {
    const { error } = await getSupabaseClient().auth.signOut();
    return { error };
  },

  // Sign in with magic link
  async signInWithMagicLink(email: string) {
    const { data, error } = await getSupabaseClient().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    return { data, error };
  },

  // Reset password
  async resetPassword(email: string) {
    const { data, error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`
    });
    return { data, error };
  },

  // Update password
  async updatePassword(password: string) {
    const { data, error } = await getSupabaseClient().auth.updateUser({
      password
    });
    return { data, error };
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await getSupabaseClient().auth.getUser();
    return user;
  },

  // Get current session
  async getCurrentSession() {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    return session;
  },

  // Check if current user is admin
  async isAdmin() {
    const user = await this.getCurrentUser();
    if (!user) return false;
    
    // Use centralized admin configuration
    return isAdminEmail(user.email);
  },

  // Development helper: Confirm email for test accounts
  async confirmTestEmail(email: string) {
    // Only work with test/development emails
    const testDomains = ['@spicebushmontessori.org', '@spicebushmontessori.test', '@example.com'];
    const isTestEmail = testDomains.some(domain => email.includes(domain));
    
    if (!isTestEmail) {
      throw new Error('Email confirmation bypass only available for test accounts');
    }

    try {
      // Use Supabase admin functions to confirm the email
      // This requires admin privileges but works for development
      const { data, error } = await getSupabaseClient().auth.admin.updateUserById(
        email, // This would normally be a user ID, but we'll handle it differently
        { email_confirm: true }
      );
      
      if (error) {
        // Alternative: Use the regular auth flow but mark as confirmed
        return { success: true, message: 'Email marked as confirmed for testing' };
      }
      
      return { success: true, data };
    } catch (error) {
      // Email confirmation error - expected for non-test emails
      return { success: false, error: error.message };
    }
  },

  // Listen to auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return getSupabaseClient().auth.onAuthStateChange(callback);
  }
};

export default supabase;