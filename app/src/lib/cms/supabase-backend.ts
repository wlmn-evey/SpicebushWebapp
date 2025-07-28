/**
 * Supabase Backend for Decap CMS
 * 
 * This custom backend integrates Decap CMS directly with Supabase,
 * eliminating the need for Git/GitHub and providing a simpler
 * authentication flow for non-technical users.
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isAdminEmail } from '../admin-config';

const COLLECTIONS_MAP = {
  'blog': 'cms_blog',
  'staff': 'cms_staff',
  'announcements': 'cms_announcements',
  'events': 'cms_events',
  'tuition': 'cms_tuition',
  'hours': 'cms_hours',
  'testimonials': 'cms_testimonials',
  'photos': 'cms_photos',
  'coming_soon': 'cms_settings'
};

export class SupabaseBackend {
  private supabase: SupabaseClient;
  private user: User | null = null;

  constructor() {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    this.name = 'supabase-cms';
  }

  /**
   * Initialize and check authentication
   */
  async init() {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (user && isAdminEmail(user.email)) {
      this.user = user;
      return {
        backendName: 'supabase-cms',
        authEndpoint: '/api/auth/cms',
        isAuthenticated: true,
        user: {
          name: user.user_metadata?.full_name || user.email,
          email: user.email
        }
      };
    }
    
    return {
      backendName: 'supabase-cms',
      authEndpoint: '/api/auth/cms',
      isAuthenticated: false
    };
  }

  /**
   * Authenticate user - relies on existing Supabase session
   */
  async authenticate() {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user || !isAdminEmail(user.email)) {
      throw new Error('Admin access required. Please log in as an administrator.');
    }
    
    this.user = user;
    return {
      name: user.user_metadata?.full_name || user.email,
      email: user.email
    };
  }

  /**
   * Log out user
   */
  async logout() {
    await this.supabase.auth.signOut();
    this.user = null;
  }

  /**
   * Get entries for a collection
   */
  async getEntries(collection: string) {
    const tableName = COLLECTIONS_MAP[collection];
    if (!tableName) {
      throw new Error(`Unknown collection: ${collection}`);
    }

    // Special handling for settings
    if (collection === 'coming_soon') {
      const { data, error } = await this.supabase
        .from('cms_settings')
        .select('*')
        .eq('key', 'coming_soon');
      
      if (error) throw error;
      
      return data.map(item => ({
        ...item.value,
        slug: 'config',
        raw: JSON.stringify(item.value)
      }));
    }

    const { data, error } = await this.supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      ...item.content,
      slug: item.slug,
      raw: JSON.stringify(item.content)
    }));
  }

  /**
   * Get a single entry
   */
  async getEntry(collection: string, slug: string) {
    const tableName = COLLECTIONS_MAP[collection];
    if (!tableName) {
      throw new Error(`Unknown collection: ${collection}`);
    }

    // Special handling for settings
    if (collection === 'coming_soon' && slug === 'config') {
      const { data, error } = await this.supabase
        .from('cms_settings')
        .select('*')
        .eq('key', 'coming_soon')
        .single();
      
      if (error) throw error;
      
      return {
        ...data.value,
        slug: 'config',
        raw: JSON.stringify(data.value)
      };
    }

    const { data, error } = await this.supabase
      .from(tableName)
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;

    return {
      ...data.content,
      slug: data.slug,
      raw: JSON.stringify(data.content)
    };
  }

  /**
   * Save an entry
   */
  async saveEntry(collection: string, slug: string, data: any) {
    const tableName = COLLECTIONS_MAP[collection];
    if (!tableName) {
      throw new Error(`Unknown collection: ${collection}`);
    }

    if (!this.user) {
      throw new Error('Not authenticated');
    }

    // Special handling for settings
    if (collection === 'coming_soon' && slug === 'config') {
      // Save version history
      await this.saveVersion('cms_settings', 'coming_soon', data);

      const { error } = await this.supabase
        .from('cms_settings')
        .upsert({
          key: 'coming_soon',
          value: data,
          updated_by: this.user.email,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      return {
        ...data,
        slug: 'config'
      };
    }

    // Check if entry exists
    const { data: existing } = await this.supabase
      .from(tableName)
      .select('id, content')
      .eq('slug', slug)
      .single();

    // Save version history if updating
    if (existing) {
      await this.saveVersion(tableName, existing.id, existing.content);
    }

    // Prepare entry data
    const entry = {
      slug,
      content: data,
      author: this.user.email,
      updated_at: new Date().toISOString()
    };

    // Insert or update
    const { data: saved, error } = existing
      ? await this.supabase
          .from(tableName)
          .update(entry)
          .eq('id', existing.id)
          .select()
          .single()
      : await this.supabase
          .from(tableName)
          .insert({ ...entry, created_at: new Date().toISOString() })
          .select()
          .single();

    if (error) throw error;

    return {
      ...saved.content,
      slug: saved.slug
    };
  }

  /**
   * Delete an entry
   */
  async deleteEntry(collection: string, slug: string) {
    const tableName = COLLECTIONS_MAP[collection];
    if (!tableName) {
      throw new Error(`Unknown collection: ${collection}`);
    }

    // Don't allow deleting settings
    if (collection === 'coming_soon') {
      throw new Error('Cannot delete system settings');
    }

    // Get entry for version history
    const { data: existing } = await this.supabase
      .from(tableName)
      .select('id, content')
      .eq('slug', slug)
      .single();

    if (existing) {
      // Save deletion in version history
      await this.saveVersion(tableName, existing.id, existing.content, 'deleted');
    }

    const { error } = await this.supabase
      .from(tableName)
      .delete()
      .eq('slug', slug);

    if (error) throw error;
  }

  /**
   * Upload media file
   */
  async uploadMedia(file: File) {
    if (!this.user) {
      throw new Error('Not authenticated');
    }

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `cms-uploads/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await this.supabase.storage
      .from('media')
      .upload(filePath, file);

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = this.supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    // Save media record
    await this.supabase
      .from('cms_media')
      .insert({
        filename: fileName,
        original_name: file.name,
        url: publicUrl,
        size: file.size,
        type: file.type,
        uploaded_by: this.user.email
      });

    return {
      url: publicUrl,
      name: fileName,
      size: file.size,
      type: file.type
    };
  }

  /**
   * Get media library
   */
  async getMedia() {
    const { data, error } = await this.supabase
      .from('cms_media')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      name: item.original_name,
      url: item.url,
      size: item.size,
      type: item.type,
      uploadedBy: item.uploaded_by,
      createdAt: item.created_at
    }));
  }

  /**
   * Save version history
   */
  private async saveVersion(collection: string, itemId: string, data: any, action = 'updated') {
    if (!this.user) return;

    await this.supabase
      .from('cms_versions')
      .insert({
        collection,
        item_id: itemId,
        data,
        action,
        author: this.user.email,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Get version history for an item
   */
  async getVersions(collection: string, itemId: string) {
    const { data, error } = await this.supabase
      .from('cms_versions')
      .select('*')
      .eq('collection', collection)
      .eq('item_id', itemId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data;
  }

  /**
   * Restore a version
   */
  async restoreVersion(versionId: string) {
    if (!this.user) {
      throw new Error('Not authenticated');
    }

    // Get version details
    const { data: version, error } = await this.supabase
      .from('cms_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) throw error;

    // Restore the content
    const tableName = version.collection;
    await this.supabase
      .from(tableName)
      .update({
        content: version.data,
        author: this.user.email,
        updated_at: new Date().toISOString()
      })
      .eq('id', version.item_id);

    // Log restoration in version history
    await this.saveVersion(tableName, version.item_id, version.data, 'restored');
  }
}

// Register the backend with Decap CMS
export function registerSupabaseBackend() {
  if (typeof window !== 'undefined' && window.CMS) {
    window.CMS.registerBackend('supabase-cms', SupabaseBackend);
  }
}