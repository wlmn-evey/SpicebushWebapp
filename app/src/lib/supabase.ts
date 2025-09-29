import { createClient } from '@supabase/supabase-js';

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
        persistSession: false, // Clerk handles sessions
        autoRefreshToken: false
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

export default supabase;