# Supabase CMS Backend Architecture Blueprint
Date: 2025-07-27
Architect: Project Architect
Type: Production-Ready CMS Solution

## Executive Summary

This blueprint outlines a production-ready CMS backend solution using Supabase that completely eliminates Git/GitHub requirements while maintaining simplicity for non-technical school staff. The solution leverages existing Supabase infrastructure, provides seamless authentication via magic links, and offers a user-friendly content management experience.

## Architecture Overview

### Core Principles
1. **Zero External Dependencies**: No Git, GitHub, or third-party services required
2. **Single Authentication**: Use existing magic link system throughout
3. **Database-First Design**: All content stored in PostgreSQL with JSONB
4. **Version Control Without Git**: Database-driven history tracking
5. **User-Centric Interface**: Hide technical complexity from school staff
6. **Production-Ready**: Scalable, secure, and maintainable

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Interface Layer                         │
├─────────────────────────────────────────────────────────────────────┤
│  Magic Link Login → Admin Dashboard → Embedded Decap CMS           │
│  (Existing Auth)    (Quick Actions)    (Custom Backend)            │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Application Layer (Astro)                       │
├─────────────────────────────────────────────────────────────────────┤
│  Auth Middleware → CMS API Routes → Content Transformers            │
│  Session Manager → Backend Adapter → Media Handlers                 │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Data Layer (Supabase)                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐            │
│  │   Auth DB   │  │ Content Tables│  │ Version History│            │
│  │ Magic Links │  │   JSONB Data  │  │  Audit Trail   │            │
│  └─────────────┘  └──────────────┘  └────────────────┘            │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐            │
│  │Media Storage│  │   Settings    │  │  RLS Policies  │            │
│  │   CDN URLs  │  │ Coming Soon   │  │ Admin-Only     │            │
│  └─────────────┘  └──────────────┘  └────────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

## 1. Database Schema Design

### Content Tables Structure

```sql
-- Base content table structure (applied to all collections)
CREATE TABLE cms_{collection} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL,  -- Stores all Decap CMS fields
  author TEXT NOT NULL,
  status TEXT DEFAULT 'published', -- draft, published, archived
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived'))
);

-- Collections: blog, staff, announcements, events, tuition, hours, testimonials, photos
```

### Version History System

```sql
-- Unified version history for all content
CREATE TABLE cms_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection TEXT NOT NULL,
  item_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL,
  action TEXT NOT NULL, -- created, updated, deleted, restored
  change_summary TEXT,
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Composite unique constraint
  UNIQUE(collection, item_id, version_number)
);

-- Automatic versioning trigger
CREATE OR REPLACE FUNCTION create_content_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM cms_versions
  WHERE collection = TG_TABLE_NAME AND item_id = NEW.id;
  
  -- Insert version record
  INSERT INTO cms_versions (
    collection, item_id, version_number, content, 
    action, author, change_summary
  ) VALUES (
    TG_TABLE_NAME, NEW.id, next_version, OLD.content,
    TG_OP, NEW.author, NEW.change_summary
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Media Management

```sql
-- Enhanced media library
CREATE TABLE cms_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Supabase storage path
  public_url TEXT NOT NULL,
  cdn_url TEXT, -- Optional CDN URL
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  dimensions JSONB, -- {width, height} for images
  metadata JSONB, -- EXIF, alt text, focal points
  uploaded_by TEXT NOT NULL,
  used_in JSONB DEFAULT '[]'::jsonb, -- Track usage
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media usage tracking
CREATE INDEX idx_media_usage ON cms_media USING gin(used_in);
```

### Settings and Configuration

```sql
-- System settings (single row per setting)
CREATE TABLE cms_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  value_type TEXT DEFAULT 'json', -- json, boolean, string, number
  description TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predefined settings
INSERT INTO cms_settings (key, value, value_type, description) VALUES
  ('coming_soon_enabled', 'false'::jsonb, 'boolean', 'Enable coming soon mode'),
  ('coming_soon_config', '{...}'::jsonb, 'json', 'Coming soon page configuration'),
  ('site_maintenance', 'false'::jsonb, 'boolean', 'Site maintenance mode'),
  ('allowed_domains', '["@spicebushmontessori.org", "@eveywinters.com"]'::jsonb, 'json', 'Admin email domains');
```

## 2. API Integration Approach

### Supabase Backend for Decap CMS

```typescript
// src/lib/cms/supabase-backend.ts
export class SupabaseBackend {
  private supabase: SupabaseClient;
  private session: Session | null;
  
  constructor() {
    this.name = 'supabase-cms';
    this.supabase = createClient(
      process.env.PUBLIC_SUPABASE_URL,
      process.env.PUBLIC_SUPABASE_ANON_KEY
    );
  }

  // Authentication flow
  async authenticate(): Promise<User> {
    // Check existing session
    const { data: { session } } = await this.supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Please log in through the admin panel');
    }
    
    // Verify admin status
    if (!isAdminEmail(session.user.email)) {
      throw new Error('Admin access required');
    }
    
    this.session = session;
    return {
      name: session.user.user_metadata?.full_name || session.user.email,
      email: session.user.email,
      avatar_url: session.user.user_metadata?.avatar_url
    };
  }

  // Content operations
  async getEntry(collection: string, slug: string): Promise<Entry> {
    const { data, error } = await this.supabase
      .from(`cms_${collection}`)
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error) throw new Error(`Failed to load ${collection} entry: ${error.message}`);
    
    return this.transformToEntry(data);
  }

  async listEntries(collection: string, options?: ListOptions): Promise<Entry[]> {
    let query = this.supabase
      .from(`cms_${collection}`)
      .select('*')
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Failed to list ${collection}: ${error.message}`);
    
    return data.map(this.transformToEntry);
  }

  async createEntry(collection: string, entry: Entry): Promise<Entry> {
    const slug = this.generateSlug(entry);
    
    const { data, error } = await this.supabase
      .from(`cms_${collection}`)
      .insert({
        slug,
        content: entry,
        author: this.session!.user.email,
        status: entry.draft ? 'draft' : 'published'
      })
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create entry: ${error.message}`);
    
    // Track version
    await this.createVersion(collection, data.id, 'created');
    
    return this.transformToEntry(data);
  }

  async updateEntry(collection: string, entry: Entry): Promise<Entry> {
    const { data: existing } = await this.supabase
      .from(`cms_${collection}`)
      .select('id, content')
      .eq('slug', entry.slug)
      .single();
    
    if (!existing) throw new Error('Entry not found');
    
    // Create version before update
    await this.createVersion(collection, existing.id, 'updated', existing.content);
    
    const { data, error } = await this.supabase
      .from(`cms_${collection}`)
      .update({
        content: entry,
        author: this.session!.user.email,
        updated_at: new Date().toISOString()
      })
      .eq('slug', entry.slug)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update entry: ${error.message}`);
    
    return this.transformToEntry(data);
  }

  // Media operations
  async uploadMedia(file: AssetProxy): Promise<MediaFile> {
    const fileName = this.sanitizeFileName(file.name);
    const path = `cms-uploads/${Date.now()}-${fileName}`;
    
    // Upload to Supabase Storage
    const { data, error } = await this.supabase.storage
      .from('media')
      .upload(path, file.file, {
        contentType: file.file.type,
        upsert: false
      });
    
    if (error) throw new Error(`Upload failed: ${error.message}`);
    
    // Get public URL
    const { data: { publicUrl } } = this.supabase.storage
      .from('media')
      .getPublicUrl(path);
    
    // Save media record
    const { data: mediaRecord } = await this.supabase
      .from('cms_media')
      .insert({
        filename: fileName,
        original_name: file.name,
        storage_path: path,
        public_url: publicUrl,
        mime_type: file.file.type,
        size_bytes: file.file.size,
        uploaded_by: this.session!.user.email
      })
      .select()
      .single();
    
    return {
      id: mediaRecord.id,
      name: fileName,
      url: publicUrl,
      path: path,
      size: file.file.size,
      displayURL: publicUrl
    };
  }

  // Version history
  async getVersions(collection: string, slug: string): Promise<Version[]> {
    const { data: entry } = await this.supabase
      .from(`cms_${collection}`)
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (!entry) return [];
    
    const { data } = await this.supabase
      .from('cms_versions')
      .select('*')
      .eq('collection', `cms_${collection}`)
      .eq('item_id', entry.id)
      .order('version_number', { ascending: false });
    
    return data || [];
  }

  async restoreVersion(versionId: string): Promise<Entry> {
    const { data: version } = await this.supabase
      .from('cms_versions')
      .select('*')
      .eq('id', versionId)
      .single();
    
    if (!version) throw new Error('Version not found');
    
    // Update content to version data
    const { data, error } = await this.supabase
      .from(version.collection)
      .update({
        content: version.content,
        author: this.session!.user.email,
        updated_at: new Date().toISOString()
      })
      .eq('id', version.item_id)
      .select()
      .single();
    
    if (error) throw new Error(`Restore failed: ${error.message}`);
    
    // Track restoration
    await this.createVersion(
      version.collection.replace('cms_', ''), 
      version.item_id, 
      'restored',
      null,
      `Restored to version ${version.version_number}`
    );
    
    return this.transformToEntry(data);
  }

  // Helper methods
  private transformToEntry(dbRecord: any): Entry {
    return {
      ...dbRecord.content,
      slug: dbRecord.slug,
      raw: JSON.stringify(dbRecord.content),
      data: dbRecord.content,
      file: { path: dbRecord.slug },
      isModification: true
    };
  }

  private async createVersion(
    collection: string, 
    itemId: string, 
    action: string,
    previousContent?: any,
    summary?: string
  ) {
    await this.supabase.from('cms_versions').insert({
      collection: `cms_${collection}`,
      item_id: itemId,
      content: previousContent || {},
      action,
      change_summary: summary,
      author: this.session!.user.email
    });
  }

  private generateSlug(entry: any): string {
    const date = new Date().toISOString().split('T')[0];
    const title = entry.title || entry.name || 'untitled';
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    return `${date}-${slug}`;
  }

  private sanitizeFileName(filename: string): string {
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/-+/g, '-');
  }
}
```

### API Routes

```typescript
// src/pages/api/cms/[...path].ts
export async function ALL({ params, request }: APIContext) {
  // Verify authentication
  const session = await getServerSession(request);
  if (!session || !isAdminEmail(session.user.email)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const backend = new SupabaseBackend();
  const path = params.path;

  try {
    // Route to appropriate handler
    switch (path) {
      case 'auth':
        return handleAuth(backend, request);
      case 'entries':
        return handleEntries(backend, request);
      case 'media':
        return handleMedia(backend, request);
      case 'settings':
        return handleSettings(backend, request);
      default:
        return new Response('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('CMS API Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

## 3. Media Storage Strategy

### Storage Architecture

```
Supabase Storage Buckets:
├── media/                    # Public bucket for CMS uploads
│   ├── cms-uploads/         # General media files
│   │   ├── images/         # Organized by type
│   │   ├── documents/
│   │   └── videos/
│   └── optimized/          # Processed images
│       ├── thumbnails/     # Small previews
│       ├── web/           # Web-optimized versions
│       └── srcset/        # Responsive image sets
```

### Image Processing Pipeline

```typescript
// src/lib/cms/media-processor.ts
export class MediaProcessor {
  async processUpload(file: File): Promise<ProcessedMedia> {
    // Validate file
    this.validateFile(file);
    
    // Process based on type
    if (this.isImage(file)) {
      return await this.processImage(file);
    } else {
      return await this.processDocument(file);
    }
  }

  private async processImage(file: File): Promise<ProcessedMedia> {
    const sharp = await import('sharp');
    const buffer = await file.arrayBuffer();
    
    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    
    // Generate variants
    const variants = await Promise.all([
      this.createVariant(buffer, 'thumbnail', 150),
      this.createVariant(buffer, 'small', 320),
      this.createVariant(buffer, 'medium', 768),
      this.createVariant(buffer, 'large', 1920),
      this.createWebP(buffer)
    ]);
    
    // Upload all variants
    const uploads = await Promise.all(
      variants.map(v => this.uploadVariant(v))
    );
    
    return {
      original: file,
      variants: uploads,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: file.size
      }
    };
  }

  private async createVariant(
    buffer: ArrayBuffer, 
    name: string, 
    maxWidth: number
  ): Promise<Variant> {
    const sharp = await import('sharp');
    
    const processed = await sharp(buffer)
      .resize(maxWidth, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
    
    return {
      name,
      buffer: processed,
      width: maxWidth
    };
  }
}
```

### CDN Integration

```typescript
// src/lib/cms/cdn-manager.ts
export class CDNManager {
  getOptimizedUrl(
    mediaId: string, 
    options: ImageOptions = {}
  ): string {
    const base = process.env.PUBLIC_CDN_URL || process.env.PUBLIC_SUPABASE_URL;
    const params = new URLSearchParams();
    
    // Add transformation parameters
    if (options.width) params.append('w', options.width.toString());
    if (options.height) params.append('h', options.height.toString());
    if (options.quality) params.append('q', options.quality.toString());
    if (options.format) params.append('fm', options.format);
    
    return `${base}/storage/v1/render/image/media/${mediaId}?${params}`;
  }

  generateSrcSet(mediaId: string): string {
    const widths = [320, 640, 768, 1024, 1920];
    
    return widths
      .map(w => `${this.getOptimizedUrl(mediaId, { width: w })} ${w}w`)
      .join(', ');
  }
}
```

## 4. Version Control Approach

### Version Management System

```typescript
// src/lib/cms/version-manager.ts
export class VersionManager {
  async createSnapshot(
    collection: string,
    itemId: string,
    reason: string
  ): Promise<Version> {
    // Get current content
    const { data: current } = await supabase
      .from(`cms_${collection}`)
      .select('*')
      .eq('id', itemId)
      .single();
    
    // Get next version number
    const { data: versions } = await supabase
      .from('cms_versions')
      .select('version_number')
      .eq('collection', `cms_${collection}`)
      .eq('item_id', itemId)
      .order('version_number', { ascending: false })
      .limit(1);
    
    const nextVersion = (versions?.[0]?.version_number || 0) + 1;
    
    // Create version record
    const { data: version } = await supabase
      .from('cms_versions')
      .insert({
        collection: `cms_${collection}`,
        item_id: itemId,
        version_number: nextVersion,
        content: current.content,
        action: 'snapshot',
        change_summary: reason,
        author: getCurrentUser().email
      })
      .select()
      .single();
    
    return version;
  }

  async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<Comparison> {
    const [v1, v2] = await Promise.all([
      this.getVersion(versionId1),
      this.getVersion(versionId2)
    ]);
    
    return {
      before: v1,
      after: v2,
      changes: this.diffContent(v1.content, v2.content)
    };
  }

  async rollback(
    collection: string,
    itemId: string,
    targetVersion: number
  ): Promise<void> {
    // Get target version content
    const { data: version } = await supabase
      .from('cms_versions')
      .select('*')
      .eq('collection', `cms_${collection}`)
      .eq('item_id', itemId)
      .eq('version_number', targetVersion)
      .single();
    
    if (!version) throw new Error('Version not found');
    
    // Update current content
    await supabase
      .from(collection)
      .update({
        content: version.content,
        author: getCurrentUser().email,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);
    
    // Log rollback action
    await this.createSnapshot(
      collection.replace('cms_', ''),
      itemId,
      `Rolled back to version ${targetVersion}`
    );
  }

  private diffContent(before: any, after: any): Change[] {
    // Implement JSON diff algorithm
    const changes: Change[] = [];
    
    // Compare all fields
    const allKeys = new Set([
      ...Object.keys(before),
      ...Object.keys(after)
    ]);
    
    for (const key of allKeys) {
      if (before[key] !== after[key]) {
        changes.push({
          field: key,
          before: before[key],
          after: after[key],
          type: this.getChangeType(before[key], after[key])
        });
      }
    }
    
    return changes;
  }
}
```

### Version UI Component

```typescript
// src/components/admin/VersionHistory.tsx
export function VersionHistory({ 
  collection, 
  itemId 
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [comparing, setComparing] = useState<[string?, string?]>();

  return (
    <div className="version-history">
      <h3>Version History</h3>
      
      <div className="version-list">
        {versions.map((version) => (
          <div key={version.id} className="version-item">
            <div className="version-meta">
              <span className="version-number">v{version.version_number}</span>
              <span className="version-date">
                {formatRelativeTime(version.created_at)}
              </span>
              <span className="version-author">{version.author}</span>
            </div>
            
            <div className="version-summary">
              {version.change_summary || 'No description'}
            </div>
            
            <div className="version-actions">
              <button onClick={() => handleRestore(version.id)}>
                Restore
              </button>
              <button onClick={() => handleCompare(version.id)}>
                Compare
              </button>
              <button onClick={() => handleView(version.id)}>
                View
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {comparing && (
        <VersionComparison
          version1={comparing[0]}
          version2={comparing[1]}
          onClose={() => setComparing(undefined)}
        />
      )}
    </div>
  );
}
```

## 5. Error Handling and Recovery

### Error Handling Strategy

```typescript
// src/lib/cms/error-handler.ts
export class CMSErrorHandler {
  async handleError(error: any, context: ErrorContext): Promise<ErrorResponse> {
    // Log error with context
    console.error('CMS Error:', {
      error,
      context,
      user: context.user,
      timestamp: new Date().toISOString()
    });
    
    // Determine error type and user message
    const errorType = this.classifyError(error);
    const userMessage = this.getUserMessage(errorType, context);
    
    // Attempt recovery if possible
    const recovery = await this.attemptRecovery(errorType, context);
    
    // Track error for monitoring
    await this.trackError(error, errorType, context);
    
    return {
      type: errorType,
      message: userMessage,
      recovery,
      technical: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }

  private classifyError(error: any): ErrorType {
    if (error.code === '23505') return 'duplicate_entry';
    if (error.code === 'PGRST116') return 'not_found';
    if (error.code === '42501') return 'permission_denied';
    if (error.message?.includes('network')) return 'network_error';
    if (error.message?.includes('storage')) return 'storage_error';
    return 'unknown_error';
  }

  private getUserMessage(type: ErrorType, context: ErrorContext): string {
    const messages = {
      duplicate_entry: 'This item already exists. Please use a different name.',
      not_found: 'The requested item could not be found.',
      permission_denied: 'You don\'t have permission to perform this action.',
      network_error: 'Connection issue. Please check your internet and try again.',
      storage_error: 'Upload failed. Please try again or contact support.',
      unknown_error: 'Something went wrong. Please try again or contact support.'
    };
    
    return messages[type] || messages.unknown_error;
  }

  private async attemptRecovery(
    type: ErrorType, 
    context: ErrorContext
  ): Promise<Recovery | null> {
    switch (type) {
      case 'network_error':
        return {
          action: 'retry',
          message: 'Click to retry',
          handler: () => context.retry()
        };
      
      case 'duplicate_entry':
        return {
          action: 'rename',
          message: 'Choose a different name',
          handler: () => context.rename()
        };
      
      case 'storage_error':
        return {
          action: 'reduce_size',
          message: 'Try a smaller file',
          handler: () => context.reduceSize()
        };
      
      default:
        return null;
    }
  }
}
```

### Auto-Save and Recovery

```typescript
// src/lib/cms/auto-save.ts
export class AutoSaveManager {
  private saveQueue = new Map<string, any>();
  private saveTimer: NodeJS.Timeout | null = null;

  enableAutoSave(
    collection: string,
    itemId: string,
    getData: () => any
  ) {
    const key = `${collection}:${itemId}`;
    
    // Save to local storage periodically
    const interval = setInterval(() => {
      const data = getData();
      if (data) {
        localStorage.setItem(`cms_draft_${key}`, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }
    }, 30000); // Every 30 seconds
    
    // Clean up on unmount
    return () => {
      clearInterval(interval);
      this.saveNow(key);
    };
  }

  async recoverDraft(
    collection: string,
    itemId: string
  ): Promise<any | null> {
    const key = `${collection}:${itemId}`;
    const draft = localStorage.getItem(`cms_draft_${key}`);
    
    if (!draft) return null;
    
    const { data, timestamp } = JSON.parse(draft);
    const age = Date.now() - timestamp;
    
    // Only recover drafts less than 24 hours old
    if (age > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`cms_draft_${key}`);
      return null;
    }
    
    return data;
  }

  private async saveNow(key: string) {
    const data = this.saveQueue.get(key);
    if (!data) return;
    
    try {
      await this.persistToDatabase(key, data);
      this.saveQueue.delete(key);
      localStorage.removeItem(`cms_draft_${key}`);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }
}
```

## 6. Migration from Current Setup

### Migration Strategy

```typescript
// src/scripts/migrate-to-supabase.ts
export class CMSMigration {
  async migrate() {
    console.log('Starting CMS migration to Supabase...');
    
    // Phase 1: Analyze existing content
    const analysis = await this.analyzeContent();
    console.log('Content analysis:', analysis);
    
    // Phase 2: Create database schema
    await this.ensureSchema();
    
    // Phase 3: Migrate each collection
    for (const collection of analysis.collections) {
      await this.migrateCollection(collection);
    }
    
    // Phase 4: Migrate media files
    await this.migrateMedia();
    
    // Phase 5: Verify migration
    const verification = await this.verifyMigration();
    console.log('Migration verification:', verification);
    
    // Phase 6: Update configuration
    await this.updateConfiguration();
    
    console.log('Migration completed successfully!');
  }

  private async analyzeContent(): Promise<Analysis> {
    const collections = [
      'blog', 'staff', 'announcements', 'events',
      'tuition', 'hours', 'testimonials', 'photos'
    ];
    
    const analysis = {
      collections: [],
      totalItems: 0,
      mediaFiles: 0
    };
    
    for (const collection of collections) {
      const files = await glob(`src/content/${collection}/*.md`);
      analysis.collections.push({
        name: collection,
        itemCount: files.length,
        files
      });
      analysis.totalItems += files.length;
    }
    
    return analysis;
  }

  private async migrateCollection(collection: CollectionInfo) {
    console.log(`Migrating ${collection.name}...`);
    
    for (const file of collection.files) {
      try {
        // Read markdown file
        const content = await fs.readFile(file, 'utf-8');
        const { data, content: body } = matter(content);
        
        // Transform to database format
        const entry = {
          slug: path.basename(file, '.md'),
          content: {
            ...data,
            body
          },
          author: 'migration',
          created_at: data.date || new Date().toISOString()
        };
        
        // Insert into Supabase
        const { error } = await supabase
          .from(`cms_${collection.name}`)
          .insert(entry);
        
        if (error) {
          console.error(`Failed to migrate ${file}:`, error);
        } else {
          console.log(`✓ Migrated ${file}`);
        }
      } catch (err) {
        console.error(`Error processing ${file}:`, err);
      }
    }
  }

  private async migrateMedia() {
    console.log('Migrating media files...');
    
    const mediaFiles = await glob('public/images/**/*');
    
    for (const file of mediaFiles) {
      try {
        const buffer = await fs.readFile(file);
        const filename = path.basename(file);
        const storagePath = `migrated/${path.relative('public', file)}`;
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('media')
          .upload(storagePath, buffer);
        
        if (!error) {
          // Create media record
          const { publicUrl } = supabase.storage
            .from('media')
            .getPublicUrl(storagePath).data;
          
          await supabase.from('cms_media').insert({
            filename,
            original_name: filename,
            storage_path: storagePath,
            public_url: publicUrl,
            mime_type: mime.lookup(filename),
            size_bytes: buffer.length,
            uploaded_by: 'migration'
          });
          
          console.log(`✓ Migrated ${filename}`);
        }
      } catch (err) {
        console.error(`Failed to migrate ${file}:`, err);
      }
    }
  }
}

// Run migration
if (import.meta.env.MODE === 'migration') {
  const migration = new CMSMigration();
  migration.migrate().catch(console.error);
}
```

### Data Transformation

```typescript
// src/lib/cms/data-transformer.ts
export class DataTransformer {
  transformMarkdownToSupabase(
    markdown: string,
    frontmatter: any
  ): SupabaseEntry {
    // Parse markdown content
    const ast = remark().parse(markdown);
    
    // Extract structured data
    const structured = {
      ...frontmatter,
      body: markdown,
      ast: ast, // Store AST for advanced queries
      plainText: this.extractPlainText(ast),
      images: this.extractImages(ast),
      links: this.extractLinks(ast)
    };
    
    return {
      content: structured,
      searchVector: this.generateSearchVector(structured)
    };
  }

  transformSupabaseToMarkdown(entry: SupabaseEntry): string {
    const { content } = entry;
    
    // Reconstruct frontmatter
    const frontmatter = { ...content };
    delete frontmatter.body;
    delete frontmatter.ast;
    delete frontmatter.plainText;
    delete frontmatter.images;
    delete frontmatter.links;
    
    // Generate markdown
    return matter.stringify(content.body || '', frontmatter);
  }

  private generateSearchVector(data: any): string {
    // Create searchable text for full-text search
    const searchable = [
      data.title,
      data.excerpt,
      data.plainText,
      data.categories?.join(' '),
      data.tags?.join(' ')
    ].filter(Boolean).join(' ');
    
    return searchable.toLowerCase();
  }
}
```

## 7. User Experience Considerations

### Simplified Admin Interface

```typescript
// src/components/admin/SimplifiedCMS.tsx
export function SimplifiedCMS() {
  return (
    <div className="cms-container">
      {/* Quick Actions Bar */}
      <QuickActionsBar />
      
      {/* Main CMS Interface */}
      <div className="cms-main">
        <div className="cms-header">
          <h1>Content Management</h1>
          <div className="cms-actions">
            <button className="btn-primary" onClick={handleNewPost}>
              <PlusIcon /> New Post
            </button>
            <button className="btn-secondary" onClick={handleMediaLibrary}>
              <ImageIcon /> Media Library
            </button>
          </div>
        </div>
        
        {/* Embedded Decap CMS */}
        <div className="cms-embed">
          <iframe
            src="/admin/cms"
            className="cms-iframe"
            onLoad={handleCMSLoad}
          />
        </div>
      </div>
      
      {/* Help Sidebar */}
      <HelpSidebar />
    </div>
  );
}
```

### Quick Actions Component

```typescript
// src/components/admin/QuickActions.tsx
export function QuickActionsBar() {
  const [comingSoon, setComingSoon] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleComingSoon = async () => {
    setSaving(true);
    try {
      await supabase
        .from('cms_settings')
        .update({ 
          value: !comingSoon,
          updated_by: getCurrentUser().email,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'coming_soon_enabled');
      
      setComingSoon(!comingSoon);
      toast.success(
        comingSoon 
          ? 'Website is now live!' 
          : 'Coming soon mode activated'
      );
    } catch (error) {
      toast.error('Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quick-actions-bar">
      <div className="quick-action">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={comingSoon}
            onChange={toggleComingSoon}
            disabled={saving}
          />
          <span className="toggle-slider" />
          <span className="toggle-label">
            Coming Soon Mode
            <Tooltip content="Enable this to show a coming soon page to visitors" />
          </span>
        </label>
      </div>
      
      <div className="quick-action">
        <button onClick={() => openQuickEdit('hours')}>
          <ClockIcon /> Update Hours
        </button>
      </div>
      
      <div className="quick-action">
        <button onClick={() => openQuickEdit('announcement')}>
          <MegaphoneIcon /> Post Announcement
        </button>
      </div>
      
      <div className="quick-action">
        <button onClick={() => window.open('/', '_blank')}>
          <EyeIcon /> Preview Site
        </button>
      </div>
    </div>
  );
}
```

### Inline Help System

```typescript
// src/components/admin/HelpSidebar.tsx
export function HelpSidebar() {
  const [expanded, setExpanded] = useState(false);
  const [activeHelp, setActiveHelp] = useState<string | null>(null);

  const helpTopics = {
    'coming-soon': {
      title: 'Coming Soon Mode',
      content: `
        When enabled, visitors will see a "coming soon" page instead of your website.
        Only logged-in administrators can see the actual site.
        
        Use this when:
        - Making major updates
        - During initial setup
        - For maintenance periods
      `,
      video: '/help/coming-soon-mode.mp4'
    },
    'media-upload': {
      title: 'Uploading Images',
      content: `
        1. Click the Media Library button
        2. Drag and drop images or click to browse
        3. Images are automatically optimized for web
        4. Use the search to find images later
      `,
      tips: [
        'Maximum file size: 10MB',
        'Supported formats: JPG, PNG, WebP',
        'Images are automatically compressed'
      ]
    }
  };

  return (
    <div className={`help-sidebar ${expanded ? 'expanded' : ''}`}>
      <button 
        className="help-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <HelpIcon /> Help
      </button>
      
      {expanded && (
        <div className="help-content">
          <h3>Quick Help</h3>
          
          <div className="help-topics">
            {Object.entries(helpTopics).map(([key, topic]) => (
              <div 
                key={key}
                className="help-topic"
                onClick={() => setActiveHelp(key)}
              >
                <h4>{topic.title}</h4>
                {activeHelp === key && (
                  <div className="help-details">
                    <p>{topic.content}</p>
                    {topic.tips && (
                      <ul>
                        {topic.tips.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    )}
                    {topic.video && (
                      <video 
                        src={topic.video} 
                        controls 
                        className="help-video"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="help-footer">
            <a href="/admin/docs" target="_blank">
              Full Documentation
            </a>
            <a href="mailto:support@spicebushmontessori.org">
              Contact Support
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
```

## 8. Security and Permissions Model

### Role-Based Access Control

```sql
-- Enhanced admin check with role support
CREATE OR REPLACE FUNCTION check_admin_access(required_role TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
  user_role TEXT;
BEGIN
  -- Get user email from JWT
  user_email := auth.jwt() ->> 'email';
  
  -- Check if email matches admin domains
  IF user_email IS NULL OR NOT (
    user_email LIKE '%@eveywinters.com' OR 
    user_email LIKE '%@spicebushmontessori.org'
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- If no specific role required, admin email is enough
  IF required_role IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check user role
  SELECT role INTO user_role
  FROM cms_users
  WHERE email = user_email;
  
  -- Check role hierarchy
  RETURN CASE
    WHEN user_role = 'super_admin' THEN TRUE
    WHEN user_role = 'admin' AND required_role IN ('admin', 'editor', 'viewer') THEN TRUE
    WHEN user_role = 'editor' AND required_role IN ('editor', 'viewer') THEN TRUE
    WHEN user_role = 'viewer' AND required_role = 'viewer' THEN TRUE
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply granular policies
CREATE POLICY "Editors can create content" ON cms_blog
  FOR INSERT WITH CHECK (check_admin_access('editor'));

CREATE POLICY "Only admins can delete" ON cms_blog
  FOR DELETE USING (check_admin_access('admin'));
```

### Audit Logging

```sql
-- Comprehensive audit log
CREATE TABLE cms_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL, -- login, logout, create, update, delete, view
  resource_type TEXT NOT NULL, -- content, media, settings, user
  resource_id TEXT,
  user_email TEXT NOT NULL,
  user_ip INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit trigger for content changes
CREATE OR REPLACE FUNCTION audit_content_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO cms_audit_log (
    action,
    resource_type,
    resource_id,
    user_email,
    details
  ) VALUES (
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::TEXT,
    COALESCE(NEW.author, OLD.author, auth.jwt() ->> 'email'),
    jsonb_build_object(
      'before', OLD,
      'after', NEW,
      'changed_fields', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(to_jsonb(NEW))
        WHERE value IS DISTINCT FROM (to_jsonb(OLD) -> key)
      )
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers
CREATE TRIGGER audit_blog_changes
  AFTER INSERT OR UPDATE OR DELETE ON cms_blog
  FOR EACH ROW EXECUTE FUNCTION audit_content_change();
```

### Security Headers and Middleware

```typescript
// src/middleware/cms-security.ts
export function cmsSecurityMiddleware(): MiddlewareHandler {
  return async (context, next) => {
    // Only apply to admin routes
    if (!context.url.pathname.startsWith('/admin')) {
      return next();
    }
    
    // Verify session
    const session = await getServerSession(context.request);
    if (!session || !isAdminEmail(session.user.email)) {
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Bearer realm="Admin"'
        }
      });
    }
    
    // Add security headers
    const response = await next();
    
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob: https:; " +
      "connect-src 'self' https://*.supabase.co; " +
      "frame-ancestors 'self';"
    );
    
    return response;
  };
}
```

## Implementation Timeline

### Week 1: Foundation
- Set up database schema
- Implement basic Supabase backend
- Create authentication flow
- Test with sample data

### Week 2: Core Features
- Media upload and processing
- Version history system
- Error handling and recovery
- Auto-save functionality

### Week 3: User Interface
- Integrate with admin panel
- Quick actions implementation
- Help system and tooltips
- Responsive design

### Week 4: Migration & Launch
- Content migration scripts
- User acceptance testing
- Performance optimization
- Documentation and training

## Success Metrics

1. **Performance**
   - Page load time: < 1 second
   - Content save time: < 500ms
   - Media upload time: < 5 seconds for 5MB file

2. **Reliability**
   - Zero data loss incidents
   - 99.9% uptime
   - Automatic recovery from errors

3. **User Experience**
   - Time to toggle coming soon: < 5 seconds
   - Training time for new users: < 15 minutes
   - Support tickets: < 1 per month

4. **Security**
   - Zero unauthorized access incidents
   - Complete audit trail
   - Regular security updates

## Conclusion

This Supabase-based CMS solution provides a production-ready, user-friendly content management system that eliminates Git complexity while maintaining professional features like version control, media management, and security. The architecture prioritizes simplicity for school staff while providing the robustness needed for daily operations.

The solution represents a significant improvement over Git-based approaches for non-technical users, reducing training requirements and support burden while increasing content update frequency and user satisfaction.