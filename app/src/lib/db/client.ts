import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logError } from '@lib/error-logger';
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from './env';
import type { Database } from './types';

let publicClient: SupabaseClient<Database> | null = null;
let serviceClient: SupabaseClient<Database> | null = null;

const BASE_OPTIONS = {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'spicebush-webapp-db'
    }
  }
} as const;

export function getPublicClient(): SupabaseClient<Database> {
  if (publicClient) return publicClient;

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  publicClient = createClient<Database>(url, anonKey, BASE_OPTIONS);
  return publicClient;
}

export function getServiceClient(): SupabaseClient<Database> {
  if (serviceClient) return serviceClient;

  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();

  if (!serviceKey) {
    const message = 'SUPABASE_SERVICE_ROLE_KEY missing. Admin/database operations require this key.';
    logError('db.client', new Error(message));
    throw new Error(message);
  }

  serviceClient = createClient<Database>(url, serviceKey, BASE_OPTIONS);
  return serviceClient;
}

export async function withServiceClient<T>(handler: (client: SupabaseClient<Database>) => Promise<T>): Promise<T> {
  const client = getServiceClient();
  return handler(client);
}

export function resetClients() {
  publicClient = null;
  serviceClient = null;
}
