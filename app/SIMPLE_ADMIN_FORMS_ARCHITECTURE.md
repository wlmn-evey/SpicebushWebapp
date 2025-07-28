# Simple Admin Forms Architecture Blueprint

## Component Hierarchy and Reusability

### Base Form Components

#### 1. FormField Wrapper
```astro
<!-- src/components/forms/FormField.astro -->
<!-- Provides consistent layout, labels, help text, and error handling -->
<FormField 
  label="Title" 
  name="title" 
  required 
  help="Enter a descriptive title"
  error={errors?.title}
>
  <TextInput name="title" value={data.title} />
</FormField>
```

#### 2. Input Components

**TextInput.astro**
- Single line text, email, url, tel, number, date inputs
- Props: name, type, value, placeholder, required, min, max, pattern

**TextArea.astro**
- Multi-line text input
- Props: name, value, rows, placeholder, required, maxLength

**SelectField.astro**
- Dropdown selection
- Props: name, value, options, required, multiple

**ToggleSwitch.astro**
- Boolean on/off switch
- Props: name, checked, label, helpText

**ImageUpload.astro**
- File upload with preview
- Props: name, value, accept, multiple, maxSize
- Features: Drag & drop, preview, progress

**RichTextEditor.astro**
- Simple markdown editor with preview
- Props: name, value, toolbar, height
- Features: Bold, italic, links, lists, preview mode

**DateTimePicker.astro**
- Combined date and time selection
- Props: name, value, min, max, timezone

### Composite Components

#### MediaSelector.astro
```astro
<!-- Combines upload with library selection -->
<MediaSelector 
  name="featuredImage"
  value={data.featuredImage}
  type="image"
  onSelect={handleImageSelect}
/>
```

#### TagInput.astro
```astro
<!-- Multi-tag input with autocomplete -->
<TagInput
  name="tags"
  value={data.tags}
  suggestions={availableTags}
  onCreate={handleNewTag}
/>
```

#### MetadataFields.astro
```astro
<!-- SEO and metadata fields group -->
<MetadataFields
  data={{
    metaTitle: data.metaTitle,
    metaDescription: data.metaDescription,
    ogImage: data.ogImage
  }}
/>
```

## Form Patterns and Best Practices

### 1. Form State Management
```javascript
// Client-side form handler
class FormHandler {
  constructor(formId, endpoint) {
    this.form = document.getElementById(formId);
    this.endpoint = endpoint;
    this.isDirty = false;
    this.autoSaveTimer = null;
    
    this.init();
  }
  
  init() {
    // Track changes
    this.form.addEventListener('input', () => {
      this.isDirty = true;
      this.scheduleAutoSave();
    });
    
    // Handle submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.save();
    });
    
    // Warn on navigation if dirty
    window.addEventListener('beforeunload', (e) => {
      if (this.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }
  
  scheduleAutoSave() {
    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      this.save(true); // auto-save as draft
    }, 30000); // 30 seconds
  }
  
  async save(isDraft = false) {
    const formData = new FormData(this.form);
    if (isDraft) formData.append('status', 'draft');
    
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        this.isDirty = false;
        this.showSuccess(isDraft ? 'Draft saved' : 'Saved successfully');
      }
    } catch (error) {
      this.showError('Save failed. Please try again.');
    }
  }
}
```

### 2. Validation Pattern
```astro
<!-- Form with validation -->
<script>
  const validationRules = {
    title: {
      required: true,
      minLength: 3,
      maxLength: 100
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    date: {
      required: true,
      min: new Date().toISOString().split('T')[0]
    }
  };
  
  function validateForm(formData) {
    const errors = {};
    
    for (const [field, rules] of Object.entries(validationRules)) {
      const value = formData.get(field);
      
      if (rules.required && !value) {
        errors[field] = 'This field is required';
      } else if (rules.minLength && value.length < rules.minLength) {
        errors[field] = `Minimum ${rules.minLength} characters`;
      } else if (rules.pattern && !rules.pattern.test(value)) {
        errors[field] = 'Invalid format';
      }
    }
    
    return errors;
  }
</script>
```

### 3. Loading States
```astro
<!-- Form with loading states -->
<form id="content-form" class="relative">
  <div class="form-overlay" data-loading>
    <div class="spinner"></div>
    <p>Saving...</p>
  </div>
  
  <!-- Form fields -->
  
  <style>
    .form-overlay {
      display: none;
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.9);
      justify-content: center;
      align-items: center;
      flex-direction: column;
    }
    
    .form-overlay[data-loading] {
      display: flex;
    }
  </style>
</form>
```

## Content Type Specifications

### 1. Blog Posts
```typescript
interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string; // Markdown
  featuredImage?: string;
  author: string;
  date: string;
  categories: string[];
  tags: string[];
  status: 'draft' | 'published';
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
}
```

### 2. Staff Profiles
```typescript
interface StaffProfile {
  name: string;
  slug: string;
  title: string;
  photo?: string;
  bio: string; // Markdown
  credentials: string[];
  specialties: string[];
  contact?: {
    email?: string;
    phone?: string;
  };
  order: number;
  active: boolean;
}
```

### 3. School Hours
```typescript
interface SchoolHours {
  day: string;
  closed: boolean;
  hours?: {
    open: string; // "08:00"
    close: string; // "17:00"
  };
  note?: string; // Special notes
}
```

### 4. Tuition Programs
```typescript
interface TuitionProgram {
  name: string;
  slug: string;
  description: string;
  ageRange: string;
  schedule: {
    days: string[];
    hours: string;
  };
  pricing: {
    monthly: number;
    annually: number;
    registrationFee: number;
  };
  features: string[];
  active: boolean;
}
```

### 5. Announcements
```typescript
interface Announcement {
  title: string;
  content: string;
  type: 'info' | 'alert' | 'success';
  startDate: string;
  endDate?: string;
  sticky: boolean; // Pin to top
  audiences: string[]; // 'parents', 'staff', 'public'
}
```

### 6. Photos
```typescript
interface Photo {
  title: string;
  slug: string;
  image: string;
  thumbnail?: string;
  caption?: string;
  category: string;
  tags: string[];
  focalPoint?: { x: number; y: number };
  date: string;
  featured: boolean;
}
```

### 7. Coming Soon Settings
```typescript
interface ComingSoonSettings {
  enabled: boolean;
  title: string;
  message: string;
  launchDate?: string;
  showNewsletter: boolean;
  newsletterText?: string;
  backgroundImage?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
  };
}
```

## API Endpoint Patterns

### RESTful CRUD Operations
```typescript
// GET /api/cms/entries?type=blog
// GET /api/cms/entry?type=blog&slug=welcome-post
// POST /api/cms/entry
// PUT /api/cms/entry
// DELETE /api/cms/entry?type=blog&slug=welcome-post

// Standardized response format
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page?: number;
    total?: number;
  };
}
```

### Error Handling
```typescript
// Consistent error responses
const errorResponses = {
  UNAUTHORIZED: { 
    code: 'UNAUTHORIZED', 
    message: 'Authentication required' 
  },
  NOT_FOUND: { 
    code: 'NOT_FOUND', 
    message: 'Resource not found' 
  },
  VALIDATION_ERROR: { 
    code: 'VALIDATION_ERROR', 
    message: 'Invalid input data',
    fields: {} // Field-specific errors
  },
  SERVER_ERROR: { 
    code: 'SERVER_ERROR', 
    message: 'An unexpected error occurred' 
  }
};
```

## Security Considerations

### 1. Authentication Check
```typescript
// Every admin route must check auth
const { isAuthenticated } = await checkAdminAuth(Astro);
if (!isAuthenticated) {
  return Astro.redirect('/auth/login?redirect=' + Astro.url.pathname);
}
```

### 2. CSRF Protection
```astro
<!-- Include CSRF token in forms -->
<input type="hidden" name="csrf_token" value={Astro.locals.csrfToken} />
```

### 3. Input Sanitization
```typescript
// Sanitize user input
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return DOMPurify.sanitize(input);
  }
  return input;
}
```

### 4. File Upload Security
```typescript
// Validate file uploads
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxSize = 10 * 1024 * 1024; // 10MB

function validateFile(file: File): boolean {
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
  return true;
}
```

## Performance Optimizations

### 1. Lazy Loading
```astro
<!-- Lazy load heavy components -->
<script>
  // Only load rich text editor when needed
  if (document.querySelector('.rich-text-editor')) {
    import('../components/forms/RichTextEditor.js');
  }
</script>
```

### 2. Image Optimization
```typescript
// Automatic image optimization on upload
async function processUploadedImage(file: File) {
  const optimized = await optimizeImage(file, {
    maxWidth: 2000,
    quality: 85,
    format: 'webp'
  });
  
  const thumbnail = await optimizeImage(file, {
    maxWidth: 300,
    quality: 80,
    format: 'webp'
  });
  
  return { optimized, thumbnail };
}
```

### 3. Debounced Auto-save
```javascript
// Prevent excessive API calls
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const autoSave = debounce(saveForm, 5000);
```

## Testing Strategy

### 1. Component Tests
```javascript
// Test form validation
describe('FormValidation', () => {
  test('requires title field', () => {
    const errors = validateForm({ title: '' });
    expect(errors.title).toBe('This field is required');
  });
  
  test('validates email format', () => {
    const errors = validateForm({ email: 'invalid' });
    expect(errors.email).toBe('Invalid format');
  });
});
```

### 2. Integration Tests
```javascript
// Test API endpoints
describe('Blog API', () => {
  test('creates new post', async () => {
    const response = await fetch('/api/cms/entry', {
      method: 'POST',
      body: JSON.stringify({
        type: 'blog',
        title: 'Test Post',
        content: 'Test content'
      })
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

### 3. E2E Tests
```javascript
// Test full user flows
describe('Blog Management', () => {
  test('admin can create and publish post', async ({ page }) => {
    await page.goto('/admin/blog/new');
    await page.fill('[name="title"]', 'New Blog Post');
    await page.fill('[name="content"]', 'Post content');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/admin/blog');
    await expect(page.locator('text=New Blog Post')).toBeVisible();
  });
});
```

## Deployment Checklist

- [ ] Remove all Decap CMS files
- [ ] Update package.json dependencies
- [ ] Create database backup
- [ ] Test all forms in staging
- [ ] Update admin documentation
- [ ] Train admin users
- [ ] Set up monitoring
- [ ] Create rollback plan