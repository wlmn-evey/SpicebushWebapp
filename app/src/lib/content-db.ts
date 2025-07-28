/**
 * Content database adapter
 * This module provides a consistent API for accessing content
 * Currently using direct PostgreSQL connection to bypass authentication issues
 */

// Re-export everything from the direct connection implementation
export * from './content-db-direct';

// This allows us to easily switch back to Supabase later if needed
// by just changing this export to './content-db-supabase'