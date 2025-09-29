# Decap CMS Removal and Simple Admin Interface Migration Plan
Date: 2025-07-27
Architect: Project Architect
Type: Complete Migration Blueprint

## Executive Summary

This blueprint outlines the complete migration from Decap CMS to simpler, purpose-built admin interfaces. The solution leverages existing Supabase infrastructure, maintains current API endpoints, and creates focused admin forms following the KISS principle. The approach prioritizes maintainability, user experience, and simplicity over complex CMS features.

## Current State Analysis

### Existing Infrastructure
- **Database**: Supabase with content, media, and settings tables
- **API Endpoints**: Working CRUD operations at `/api/cms/entries` and `/api/cms/entry`
- **Authentication**: Magic link system with admin domain verification
- **Admin Dashboard**: Central hub linking to various content types
- **Media Storage**: Local filesystem with database tracking

### Pain Points with Decap CMS
1. YAML configuration complexity and syntax errors
2. Git/GitHub authentication requirements
3. Overly complex for simple content updates
4. Difficulty integrating with existing database structure
5. Poor user experience for non-technical staff

## Migration Architecture

### 1. Component Architecture

```
Admin Interface Structure:
├── Layout Components
│   ├── AdminLayout.astro          # Shared admin layout
│   ├── AdminHeader.astro          # Navigation and user info
│   └── AdminSidebar.astro         # Quick navigation
├── Form Components
│   ├── FormField.astro            # Reusable field wrapper
│   ├── TextInput.astro            # Text/email/url inputs
│   ├── TextArea.astro             # Multi-line text
│   ├── SelectField.astro          # Dropdown selections
│   ├── DatePicker.astro           # Date/time selection
│   ├── ImageUpload.astro          # Media upload widget
│   ├── RichTextEditor.astro       # Simple markdown editor
│   └── ToggleSwitch.astro         # Boolean fields
├── Content Forms
│   ├── BlogForm.astro             # Blog post editor
│   ├── StaffForm.astro            # Staff profile editor
│   ├── HoursForm.astro            # Hours editor
│   ├── TuitionForm.astro          # Program/tuition editor
│   ├── AnnouncementForm.astro     # Announcement editor
│   ├── PhotoForm.astro            # Photo gallery editor
│   └── SettingsForm.astro         # Coming soon settings
└── List Views
    ├── ContentList.astro          # Generic list component
    ├── MediaLibrary.astro         # Image browser
    └── QuickActions.astro         # Common actions
```

### 2. Database Schema (Existing)

```sql
-- Already implemented in 20250127_simple_cms_tables.sql
-- content table with JSONB data field
-- media table for uploaded files
-- settings table for key-value pairs
```

### 3. API Layer Enhancement

```typescript
// src/pages/api/cms/[action].ts
export async function handleContentAPI(action: string, request: Request) {
  switch (action) {
    case 'list':
      return listContent(request);
    case 'get':
      return getContent(request);
    case 'create':
      return createContent(request);
    case 'update':
      return updateContent(request);
    case 'delete':
      return deleteContent(request);
    case 'upload':
      return uploadMedia(request);
    default:
      return new Response('Not Found', { status: 404 });
  }
}
```

## Implementation Plan

### Phase 1: Core Components (Day 1)

#### 1.1 Create Base Form Components

```astro
<!-- src/components/forms/FormField.astro -->
---
export interface Props {
  label: string;
  name: string;
  required?: boolean;
  help?: string;
  error?: string;
}

const { label, name, required, help, error } = Astro.props;
---

<div class="form-field mb-4">
  <label for={name} class="block text-sm font-medium text-gray-700 mb-1">
    {label}
    {required && <span class="text-red-500">*</span>}
  </label>
  
  <slot />
  
  {help && (
    <p class="mt-1 text-sm text-gray-500">{help}</p>
  )}
  
  {error && (
    <p class="mt-1 text-sm text-red-600">{error}</p>
  )}
</div>
```

```astro
<!-- src/components/forms/TextInput.astro -->
---
export interface Props {
  name: string;
  type?: 'text' | 'email' | 'url' | 'tel';
  value?: string;
  placeholder?: string;
  required?: boolean;
}

const { name, type = 'text', value = '', placeholder, required } = Astro.props;
---

<input
  type={type}
  name={name}
  id={name}
  value={value}
  placeholder={placeholder}
  required={required}
  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
         focus:border-moss-green focus:ring-moss-green sm:text-sm"
/>
```

#### 1.2 Create Admin Layout

```astro
<!-- src/layouts/AdminLayout.astro -->
---
import Layout from './Layout.astro';
import AdminHeader from '../components/admin/AdminHeader.astro';
import AdminSidebar from '../components/admin/AdminSidebar.astro';
import { checkAdminAuth } from '../lib/admin-auth-check';

export interface Props {
  title: string;
  section: string;
}

const { title, section } = Astro.props;
const { isAuthenticated, user } = await checkAdminAuth(Astro);

if (!isAuthenticated) {
  return Astro.redirect('/auth/login?redirect=' + Astro.url.pathname);
}
---

<Layout title={title}>
  <div class="min-h-screen bg-gray-50">
    <AdminHeader user={user} />
    
    <div class="flex">
      <AdminSidebar currentSection={section} />
      
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</Layout>
```

### Phase 2: Content Type Forms (Day 2)

#### 2.1 Blog Post Form

```astro
<!-- src/pages/admin/blog/[action].astro -->
---
import AdminLayout from '../../../layouts/AdminLayout.astro';
import FormField from '../../../components/forms/FormField.astro';
import TextInput from '../../../components/forms/TextInput.astro';
import TextArea from '../../../components/forms/TextArea.astro';
import RichTextEditor from '../../../components/forms/RichTextEditor.astro';
import ImageUpload from '../../../components/forms/ImageUpload.astro';
import { supabase } from '../../../lib/supabase';

const { action } = Astro.params;
const slug = Astro.url.searchParams.get('slug');

let post = {
  title: '',
  excerpt: '',
  content: '',
  featuredImage: '',
  author: '',
  date: new Date().toISOString().split('T')[0],
  categories: [],
  tags: []
};

// Load existing post if editing
if (action === 'edit' && slug) {
  const { data } = await supabase
    .from('content')
    .select('*')
    .eq('type', 'blog')
    .eq('slug', slug)
    .single();
  
  if (data) {
    post = { ...post, ...data.data, title: data.title };
  }
}
---

<AdminLayout title={action === 'new' ? 'New Blog Post' : 'Edit Blog Post'} section="blog">
  <div class="max-w-4xl">
    <h1 class="text-2xl font-bold mb-6">
      {action === 'new' ? 'Create New Blog Post' : 'Edit Blog Post'}
    </h1>
    
    <form id="blog-form" class="space-y-6">
      <input type="hidden" name="action" value={action} />
      {action === 'edit' && <input type="hidden" name="slug" value={slug} />}
      
      <FormField label="Title" name="title" required>
        <TextInput name="title" value={post.title} required />
      </FormField>
      
      <FormField label="Excerpt" name="excerpt" help="Brief summary for listings">
        <TextArea name="excerpt" value={post.excerpt} rows={3} />
      </FormField>
      
      <FormField label="Featured Image" name="featuredImage">
        <ImageUpload 
          name="featuredImage" 
          value={post.featuredImage}
          accept="image/*"
        />
      </FormField>
      
      <FormField label="Content" name="content" required>
        <RichTextEditor name="content" value={post.content} />
      </FormField>
      
      <FormField label="Publish Date" name="date">
        <TextInput type="date" name="date" value={post.date} />
      </FormField>
      
      <div class="flex gap-4 pt-6 border-t">
        <button
          type="submit"
          class="px-4 py-2 bg-moss-green text-white rounded-lg hover:bg-forest-canopy"
        >
          {action === 'new' ? 'Create Post' : 'Update Post'}
        </button>
        
        <button
          type="button"
          onclick="saveDraft()"
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Save as Draft
        </button>
        
        <a
          href="/admin/blog"
          class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </a>
      </div>
    </form>
  </div>
  
  <script>
    const form = document.getElementById('blog-form');
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      
      try {
        const response = await fetch('/api/cms/entry', {
          method: data.action === 'new' ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'blog',
            ...data
          })
        });
        
        if (response.ok) {
          window.location.href = '/admin/blog?saved=true';
        } else {
          alert('Error saving post');
        }
      } catch (error) {
        console.error('Save error:', error);
        alert('Error saving post');
      }
    });
    
    function saveDraft() {
      const statusInput = document.createElement('input');
      statusInput.type = 'hidden';
      statusInput.name = 'status';
      statusInput.value = 'draft';
      form.appendChild(statusInput);
      form.requestSubmit();
    }
  </script>
</AdminLayout>
```

#### 2.2 Staff Profile Form

```astro
<!-- src/pages/admin/staff/[action].astro -->
---
import AdminLayout from '../../../layouts/AdminLayout.astro';
import FormField from '../../../components/forms/FormField.astro';
import TextInput from '../../../components/forms/TextInput.astro';
import TextArea from '../../../components/forms/TextArea.astro';
import SelectField from '../../../components/forms/SelectField.astro';
import ImageUpload from '../../../components/forms/ImageUpload.astro';

// Similar structure to blog form but with staff-specific fields
---

<AdminLayout title="Staff Management" section="staff">
  <form id="staff-form">
    <FormField label="Full Name" name="name" required>
      <TextInput name="name" required />
    </FormField>
    
    <FormField label="Title/Role" name="title" required>
      <TextInput name="title" placeholder="e.g., Lead Teacher" required />
    </FormField>
    
    <FormField label="Profile Photo" name="photo">
      <ImageUpload name="photo" accept="image/*" />
    </FormField>
    
    <FormField label="Bio" name="bio">
      <TextArea name="bio" rows={6} />
    </FormField>
    
    <FormField label="Credentials" name="credentials">
      <TextArea name="credentials" rows={3} />
    </FormField>
    
    <FormField label="Display Order" name="order">
      <TextInput type="number" name="order" value="0" />
    </FormField>
  </form>
</AdminLayout>
```

### Phase 3: Quick Edit Forms (Day 3)

#### 3.1 Hours Management

```astro
<!-- src/pages/admin/hours/index.astro -->
---
import AdminLayout from '../../../layouts/AdminLayout.astro';
import { supabase } from '../../../lib/supabase';

// Load all hours entries
const { data: hours } = await supabase
  .from('content')
  .select('*')
  .eq('type', 'hours')
  .order('data->day');

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
---

<AdminLayout title="School Hours" section="hours">
  <div class="max-w-2xl">
    <h1 class="text-2xl font-bold mb-6">School Hours</h1>
    
    <form id="hours-form" class="space-y-4">
      {daysOfWeek.map(day => {
        const dayData = hours?.find(h => h.data.day === day.toLowerCase());
        return (
          <div class="bg-white p-4 rounded-lg border">
            <h3 class="font-medium mb-2">{day}</h3>
            <div class="grid grid-cols-3 gap-4">
              <label>
                <input
                  type="checkbox"
                  name={`${day.toLowerCase()}_closed`}
                  checked={dayData?.data.closed}
                />
                Closed
              </label>
              <input
                type="time"
                name={`${day.toLowerCase()}_open`}
                value={dayData?.data.open || '08:00'}
                class="form-input"
              />
              <input
                type="time"
                name={`${day.toLowerCase()}_close`}
                value={dayData?.data.close || '17:00'}
                class="form-input"
              />
            </div>
          </div>
        );
      })}
      
      <button type="submit" class="btn-primary">
        Save Hours
      </button>
    </form>
  </div>
</AdminLayout>
```

#### 3.2 Coming Soon Settings

```astro
<!-- src/pages/admin/settings/coming-soon.astro -->
---
import AdminLayout from '../../../layouts/AdminLayout.astro';
import ToggleSwitch from '../../../components/forms/ToggleSwitch.astro';
import { supabase } from '../../../lib/supabase';

// Load current settings
const { data: settings } = await supabase
  .from('settings')
  .select('*')
  .in('key', ['coming_soon_enabled', 'coming_soon_message', 'launch_date']);

const isEnabled = settings?.find(s => s.key === 'coming_soon_enabled')?.value === 'true';
const message = settings?.find(s => s.key === 'coming_soon_message')?.value || '';
const launchDate = settings?.find(s => s.key === 'launch_date')?.value || '';
---

<AdminLayout title="Coming Soon Settings" section="settings">
  <div class="max-w-2xl">
    <h1 class="text-2xl font-bold mb-6">Coming Soon Mode</h1>
    
    <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <p class="text-sm text-amber-800">
        When enabled, visitors will see a coming soon page. Only logged-in administrators can view the full site.
      </p>
    </div>
    
    <form id="coming-soon-form" class="space-y-6">
      <FormField label="Enable Coming Soon Mode" name="enabled">
        <ToggleSwitch name="enabled" checked={isEnabled} />
      </FormField>
      
      <FormField label="Coming Soon Message" name="message">
        <TextArea 
          name="message" 
          value={message}
          placeholder="We're working on something special..."
          rows={4}
        />
      </FormField>
      
      <FormField label="Expected Launch Date" name="launch_date">
        <TextInput type="date" name="launch_date" value={launchDate} />
      </FormField>
      
      <button type="submit" class="btn-primary">
        Save Settings
      </button>
    </form>
  </div>
  
  <script>
    document.getElementById('coming-soon-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const settings = {
        coming_soon_enabled: formData.get('enabled') === 'on',
        coming_soon_message: formData.get('message'),
        launch_date: formData.get('launch_date')
      };
      
      // Update each setting
      for (const [key, value] of Object.entries(settings)) {
        await fetch('/api/cms/settings/' + key, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value })
        });
      }
      
      alert('Settings saved successfully!');
    });
  </script>
</AdminLayout>
```

### Phase 4: List Views and Navigation (Day 4)

#### 4.1 Content List Component

```astro
<!-- src/components/admin/ContentList.astro -->
---
export interface Props {
  title: string;
  contentType: string;
  items: any[];
  newItemPath: string;
}

const { title, contentType, items, newItemPath } = Astro.props;
---

<div class="bg-white rounded-lg shadow">
  <div class="px-6 py-4 border-b flex justify-between items-center">
    <h2 class="text-lg font-semibold">{title}</h2>
    <a href={newItemPath} class="btn-primary">
      Add New
    </a>
  </div>
  
  <div class="divide-y">
    {items.length === 0 ? (
      <p class="p-6 text-gray-500 text-center">No items yet</p>
    ) : (
      items.map(item => (
        <div class="p-4 hover:bg-gray-50 flex justify-between items-center">
          <div>
            <h3 class="font-medium">{item.title || item.data?.name || 'Untitled'}</h3>
            <p class="text-sm text-gray-500">
              Updated: {new Date(item.updated_at).toLocaleDateString()}
            </p>
          </div>
          
          <div class="flex gap-2">
            <a 
              href={`/admin/${contentType}/edit?slug=${item.slug}`}
              class="text-sm text-moss-green hover:underline"
            >
              Edit
            </a>
            <button
              onclick={`deleteItem('${contentType}', '${item.slug}')`}
              class="text-sm text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        </div>
      ))
    )}
  </div>
</div>

<script>
  async function deleteItem(type, slug) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const response = await fetch(`/api/cms/entry?type=${type}&slug=${slug}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      alert('Error deleting item');
    }
  }
</script>
```

#### 4.2 Blog List Page

```astro
<!-- src/pages/admin/blog/index.astro -->
---
import AdminLayout from '../../../layouts/AdminLayout.astro';
import ContentList from '../../../components/admin/ContentList.astro';
import { supabase } from '../../../lib/supabase';

const { data: posts } = await supabase
  .from('content')
  .select('*')
  .eq('type', 'blog')
  .order('created_at', { ascending: false });
---

<AdminLayout title="Blog Posts" section="blog">
  <ContentList
    title="Blog Posts"
    contentType="blog"
    items={posts || []}
    newItemPath="/admin/blog/new"
  />
</AdminLayout>
```

### Phase 5: Media Management (Day 5)

#### 5.1 Media Upload Component

```astro
<!-- src/components/forms/ImageUpload.astro -->
---
export interface Props {
  name: string;
  value?: string;
  accept?: string;
  multiple?: boolean;
}

const { name, value, accept = 'image/*', multiple = false } = Astro.props;
---

<div class="image-upload-wrapper">
  <input 
    type="hidden" 
    name={name} 
    value={value || ''} 
    id={`${name}-value`}
  />
  
  <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
    {value ? (
      <div class="uploaded-preview">
        <img src={value} alt="Uploaded" class="max-h-48 mx-auto mb-4" />
        <button type="button" onclick={`changeImage('${name}')`} class="text-sm text-moss-green">
          Change Image
        </button>
      </div>
    ) : (
      <div class="upload-prompt">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p class="mt-2 text-sm text-gray-600">
          Click to upload or drag and drop
        </p>
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onchange={`handleImageUpload(event, '${name}')`}
          class="hidden"
          id={`${name}-input`}
        />
        <label for={`${name}-input`} class="cursor-pointer text-moss-green text-sm font-medium">
          Select Image
        </label>
      </div>
    )}
  </div>
</div>

<script>
  async function handleImageUpload(event, fieldName) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });
      
      const { url } = await response.json();
      document.getElementById(`${fieldName}-value`).value = url;
      
      // Update preview
      event.target.closest('.image-upload-wrapper').innerHTML = `
        <input type="hidden" name="${fieldName}" value="${url}" id="${fieldName}-value" />
        <div class="uploaded-preview">
          <img src="${url}" alt="Uploaded" class="max-h-48 mx-auto mb-4" />
          <button type="button" onclick="changeImage('${fieldName}')" class="text-sm text-moss-green">
            Change Image
          </button>
        </div>
      `;
    } catch (error) {
      alert('Error uploading image');
    }
  }
  
  function changeImage(fieldName) {
    location.reload(); // Simple solution to reset the uploader
  }
</script>
```

#### 5.2 Media Library Page

```astro
<!-- src/pages/admin/media/index.astro -->
---
import AdminLayout from '../../../layouts/AdminLayout.astro';
import { supabase } from '../../../lib/supabase';

const { data: media } = await supabase
  .from('media')
  .select('*')
  .order('uploaded_at', { ascending: false });
---

<AdminLayout title="Media Library" section="media">
  <div class="max-w-6xl">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Media Library</h1>
      <button onclick="document.getElementById('upload-input').click()" class="btn-primary">
        Upload Images
      </button>
      <input 
        type="file" 
        id="upload-input" 
        multiple 
        accept="image/*" 
        onchange="handleBulkUpload(event)"
        class="hidden"
      />
    </div>
    
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {media?.map(item => (
        <div class="relative group">
          <img 
            src={item.url} 
            alt={item.filename}
            class="w-full h-32 object-cover rounded-lg"
          />
          <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <button 
              onclick={`copyUrl('${item.url}')`}
              class="text-white text-sm bg-moss-green px-2 py-1 rounded"
            >
              Copy URL
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
  
  <script>
    async function handleBulkUpload(event) {
      const files = Array.from(event.target.files);
      
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        await fetch('/api/media/upload', {
          method: 'POST',
          body: formData
        });
      }
      
      window.location.reload();
    }
    
    function copyUrl(url) {
      navigator.clipboard.writeText(url);
      alert('URL copied to clipboard!');
    }
  </script>
</AdminLayout>
```

### Phase 6: Migration and Cleanup (Day 6)

#### 6.1 Remove Decap CMS Dependencies

```bash
# Remove Decap CMS files
rm -rf public/admin/config.yml
rm -rf src/pages/admin/config.yml.ts
rm -rf src/lib/decap-auth.ts
rm -rf src/lib/cms/supabase-backend.ts
rm -rf public/admin/index.html

# Remove from package.json
npm uninstall decap-cms-app netlify-cms-app
```

#### 6.2 Update Admin Dashboard Links

```astro
<!-- Update src/pages/admin/index.astro -->
<!-- Replace CMS links with new admin paths -->
{
  name: 'Blog Posts',
  path: '/admin/blog', // was: '/admin/cms#/collections/blog'
  type: 'custom',
},
{
  name: 'School Hours',
  path: '/admin/hours', // was: '/admin/cms#/collections/hours'
  type: 'custom',
}
```

#### 6.3 Create Redirects

```typescript
// src/pages/admin/cms.astro
---
// Redirect old CMS URLs to new admin pages
const collection = Astro.url.hash.match(/collections\/(\w+)/)?.[1];

const redirectMap = {
  'blog': '/admin/blog',
  'staff': '/admin/staff',
  'hours': '/admin/hours',
  'tuition': '/admin/tuition',
  'announcements': '/admin/announcements',
  'photos': '/admin/photos',
  'coming_soon': '/admin/settings/coming-soon'
};

const redirectTo = redirectMap[collection] || '/admin';
return Astro.redirect(redirectTo);
---
```

## Routes and Navigation

### Admin Routes Structure

```
/admin                          # Dashboard
/admin/blog                     # Blog list
/admin/blog/new                 # Create blog post
/admin/blog/edit?slug=xxx       # Edit blog post
/admin/staff                    # Staff list
/admin/staff/new                # Add staff member
/admin/staff/edit?slug=xxx      # Edit staff member
/admin/hours                    # Hours management
/admin/tuition                  # Tuition programs
/admin/tuition/new              # Add program
/admin/tuition/edit?slug=xxx    # Edit program
/admin/announcements            # Announcements list
/admin/announcements/new        # Create announcement
/admin/photos                   # Photo gallery
/admin/photos/upload            # Upload photos
/admin/media                    # Media library
/admin/settings/coming-soon     # Coming soon settings
```

## Media Upload Strategy

### Local Storage with Database Tracking

```typescript
// src/pages/api/media/upload.ts
export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400
    });
  }
  
  // Generate unique filename
  const timestamp = Date.now();
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.-]/g, '-');
  const filename = `${timestamp}-${safeName}`;
  
  // Save to public/uploads
  const buffer = await file.arrayBuffer();
  const uploadPath = `public/uploads/${filename}`;
  await fs.writeFile(uploadPath, Buffer.from(buffer));
  
  // Save to database
  const { data } = await supabase
    .from('media')
    .insert({
      filename: file.name,
      url: `/uploads/${filename}`,
      size: file.size,
      uploaded_by: getCurrentUser().email
    })
    .select()
    .single();
  
  return new Response(JSON.stringify({ 
    url: data.url,
    id: data.id 
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### Image Optimization

```typescript
// src/lib/image-optimizer.ts
import sharp from 'sharp';

export async function optimizeImage(buffer: Buffer, options = {}) {
  const { 
    width = 1920, 
    quality = 85,
    format = 'webp' 
  } = options;
  
  return sharp(buffer)
    .resize(width, null, { 
      withoutEnlargement: true,
      fit: 'inside' 
    })
    .toFormat(format, { quality })
    .toBuffer();
}
```

## Implementation Timeline

### Day 1: Core Components
- [ ] Create form components (FormField, TextInput, TextArea, etc.)
- [ ] Set up AdminLayout with header and sidebar
- [ ] Create base styles for forms

### Day 2: Content Forms
- [ ] Implement BlogForm with all fields
- [ ] Implement StaffForm
- [ ] Implement AnnouncementForm
- [ ] Test create/edit functionality

### Day 3: Quick Edit Forms
- [ ] Build HoursForm with day-by-day editing
- [ ] Build TuitionForm for programs
- [ ] Build SettingsForm for coming soon mode
- [ ] Add form validation

### Day 4: List Views
- [ ] Create ContentList component
- [ ] Build list pages for each content type
- [ ] Add search and filtering
- [ ] Implement delete functionality

### Day 5: Media Management
- [ ] Build ImageUpload component
- [ ] Create media library page
- [ ] Implement bulk upload
- [ ] Add image optimization

### Day 6: Migration and Testing
- [ ] Remove Decap CMS files
- [ ] Update all admin links
- [ ] Create redirects
- [ ] Test all functionality
- [ ] Deploy to staging

## Success Metrics

1. **Simplicity**
   - Zero YAML configuration files
   - No external authentication required
   - Intuitive forms matching content structure

2. **Performance**
   - Form load time < 500ms
   - Save operations < 1 second
   - Image uploads < 3 seconds

3. **Maintainability**
   - Simple Astro components
   - Standard HTML forms
   - Minimal JavaScript
   - Clear file structure

4. **User Experience**
   - One-click access from dashboard
   - Clear success/error messages
   - Auto-save drafts
   - Mobile-responsive forms

## Risk Mitigation

1. **Data Migration**: Already using same database structure
2. **User Training**: Simpler interface requires less training
3. **Feature Parity**: Focus on needed features only
4. **Rollback Plan**: Keep Decap config for 30 days

## Conclusion

This migration plan provides a clear path from the complex Decap CMS to simple, purpose-built admin forms. By leveraging Astro's component system and the existing Supabase database, we can create a maintainable, user-friendly content management system that meets all requirements without unnecessary complexity.

The approach prioritizes:
- Developer maintainability
- User experience
- System simplicity
- Fast implementation

Total implementation time: 6 days
Total lines of code: ~2,000 (vs ~10,000 for Decap CMS)
Ongoing maintenance: Minimal