/**
 * Simple Supabase Backend for Decap CMS
 * KISS principle - just the essentials
 */

import { supabase } from './supabase';
import { isAdminEmail } from './admin-config';

export class SimpleCMSBackend {
  constructor(config: any) {
    // No complex initialization needed
  }

  // Auth - use existing Supabase session
  authComponent() {
    return null;
  }

  async authenticate() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email)) {
      throw new Error('Admin access required');
    }
    return user;
  }

  getToken() {
    return Promise.resolve('authenticated');
  }

  // Get a single content entry
  async getEntry(collection: string, slug: string) {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('type', collection)
      .eq('slug', slug)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    // Return in Decap CMS format
    return {
      ...data.data,
      title: data.title,
      slug: data.slug,
      collection
    };
  }

  // Get all entries for a collection
  async entriesByFolder(collection: string) {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('type', collection)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return data.map(entry => ({
      ...entry.data,
      title: entry.title,
      slug: entry.slug,
      collection
    }));
  }

  // Save content
  async persistEntry(entry: any, options: any) {
    const user = await this.authenticate();
    
    const content = {
      type: entry.collection,
      slug: entry.slug,
      title: entry.title || entry.data?.title || entry.slug,
      data: entry.data || entry,
      author_email: user.email,
      status: entry.draft ? 'draft' : 'published'
    };

    const { error } = await supabase
      .from('content')
      .upsert(content);

    if (error) throw error;
  }

  // Delete content
  async deleteFile(path: string, collection: string, slug: string) {
    const { error } = await supabase
      .from('content')
      .delete()
      .eq('type', collection)
      .eq('slug', slug);

    if (error) throw error;
  }

  // Get all media
  async getMedia() {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    return data.map(media => ({
      id: media.id,
      name: media.filename,
      url: media.url,
      path: media.url
    }));
  }

  // Upload media using local storage
  async persistMedia(file: File) {
    const user = await this.authenticate();
    
    // Create form data for upload
    const formData = new FormData();
    formData.append('file', file);
    
    // Upload via our API endpoint
    const response = await fetch('/api/media/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include' // Include cookies for auth
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }
    
    const result = await response.json();
    return { url: result.url };
  }

  // Required methods with simple implementations
  async logout() {}
  async getUser() { return this.authenticate(); }
  async entriesByFiles(files: string[]) { return []; }
  async deleteMedia(path: string) {}
  async search(query: string) { return []; }
}