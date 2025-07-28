/**
 * Simple Supabase Backend for Decap CMS
 * Browser-compatible version
 */

// We'll need to pass supabase as a global or import it differently
class SimpleCMSBackend {
  constructor(config) {
    this.config = config;
  }

  // Auth - use existing Supabase session
  authComponent() {
    return null;
  }

  async authenticate() {
    // For now, just return a mock user in development
    if (window.location.hostname === 'localhost') {
      return {
        email: 'admin@spicebushmontessori.org',
        user_metadata: { full_name: 'Admin User' }
      };
    }
    
    throw new Error('Authentication required');
  }

  getToken() {
    return Promise.resolve('authenticated');
  }

  // Get a single content entry
  async getEntry(collection, slug) {
    try {
      const response = await fetch(`/api/cms/entry?collection=${collection}&slug=${slug}`, {
        credentials: 'include'
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching entry:', error);
      return null;
    }
  }

  // Get all entries for a collection
  async entriesByFolder(collection) {
    try {
      const response = await fetch(`/api/cms/entries?collection=${collection}`, {
        credentials: 'include'
      });
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching entries:', error);
      return [];
    }
  }

  // Save content
  async persistEntry(entry, options) {
    try {
      const response = await fetch('/api/cms/entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ entry, options }),
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to save entry');
      
      return await response.json();
    } catch (error) {
      console.error('Error saving entry:', error);
      throw error;
    }
  }

  // Delete content
  async deleteFile(path, collection, slug) {
    try {
      const response = await fetch(`/api/cms/entry?collection=${collection}&slug=${slug}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to delete entry');
    } catch (error) {
      console.error('Error deleting entry:', error);
      throw error;
    }
  }

  // Get all media
  async getMedia() {
    try {
      const response = await fetch('/api/cms/media', {
        credentials: 'include'
      });
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching media:', error);
      return [];
    }
  }

  // Upload media using local storage
  async persistMedia(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/media/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include'
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
  async entriesByFiles(files) { return []; }
  async deleteMedia(path) {}
  async search(query) { return []; }
}

// Export for use in browser
window.SimpleCMSBackend = SimpleCMSBackend;