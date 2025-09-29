# Simple Admin Forms Implementation Plan

## Date: 2025-07-27

### Problem Statement
Replace the complex Decap CMS with simple HTML forms for content management, following the KISS principle while maintaining functionality and user experience.

### Current State Analysis
1. **Database Structure**: 
   - Simple `content` table with JSONB storage
   - `media` table for uploads
   - `settings` key-value table
   - Row-level security with admin email checks

2. **Authentication**:
   - Working admin auth check via `checkAdminAuth()`
   - Cookie-based session management
   - Email domain-based admin verification

3. **API Endpoints**:
   - `/api/cms/entries` - List content
   - `/api/cms/entry` - CRUD operations
   - `/api/media/upload` - Media uploads

4. **Existing Architecture Blueprint**:
   - Comprehensive component specifications in `SIMPLE_ADMIN_FORMS_ARCHITECTURE.md`
   - Clear content type definitions
   - Validation and security patterns

### Implementation Approach

#### Phase 1: Core Form Components
1. Create base components:
   - `FormField.astro` - Wrapper with labels, help text, errors
   - `TextInput.astro` - Basic text inputs
   - `TextArea.astro` - Multi-line text
   - `SelectField.astro` - Dropdowns
   - `ToggleSwitch.astro` - Boolean switches
   - `ImageUpload.astro` - File uploads with preview

2. Create composite components:
   - `MediaSelector.astro` - Upload + library selection
   - `TagInput.astro` - Multi-tag input
   - `MetadataFields.astro` - SEO fields group

#### Phase 2: Admin Layout Structure
1. Create admin base layout with:
   - Navigation sidebar
   - Auth status display
   - Flash messages
   - Loading states

2. Implement admin dashboard:
   - Quick stats
   - Recent content
   - Quick actions

#### Phase 3: Blog Editor (First Content Type)
1. Create blog form page (`/admin/blog/edit.astro`)
2. Implement:
   - Title, slug, excerpt fields
   - Markdown editor with preview
   - Featured image selection
   - Categories and tags
   - SEO metadata
   - Save draft/publish actions

3. Create blog listing page (`/admin/blog/index.astro`)
   - Table view with search/filter
   - Quick actions (edit, delete, duplicate)
   - Status indicators

#### Phase 4: API Integration
1. Update `/api/cms/entry` endpoint for blog operations
2. Implement proper error handling
3. Add CSRF protection
4. Validate and sanitize inputs

### Design Decisions
1. **No JavaScript frameworks** - Use vanilla JS for interactions
2. **Server-side rendering** - Astro SSR for all forms
3. **Progressive enhancement** - Forms work without JS
4. **Local media storage** - Simple file system storage
5. **Tailwind CSS** - Consistent, maintainable styling

### Security Measures
1. Admin email verification on every request
2. CSRF tokens in forms
3. Input sanitization with DOMPurify
4. File upload validation (type, size)
5. SQL injection prevention via parameterized queries

### Performance Optimizations
1. Lazy load heavy components (markdown editor)
2. Image optimization on upload
3. Debounced auto-save
4. Efficient database queries with indexes

### Cleanup Tasks
- Remove all Decap CMS configuration files
- Remove Decap-specific dependencies
- Update documentation
- Create migration guide for content editors

### Next Steps
1. Start with core form components
2. Build admin layout
3. Implement blog editor as proof of concept
4. Test thoroughly before extending to other content types