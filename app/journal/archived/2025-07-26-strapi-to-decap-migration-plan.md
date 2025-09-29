# Strapi to Decap CMS Migration Plan
*Date: July 26, 2025*
*Architect: Claude*
*Purpose: Comprehensive migration plan from Strapi to Decap CMS for Spicebush Montessori*

## Executive Summary

This document outlines a phased migration from Strapi to Decap CMS, maintaining Supabase for critical data while moving content management to a simpler, Git-based solution. The migration will reduce infrastructure complexity, improve performance, and provide a user-friendly interface for non-technical staff.

## Current State Analysis

### What We Have
1. **Strapi**: Currently managing only blog posts (5 total)
   - Running as separate Docker container
   - Adds significant complexity for minimal value
   - Content types: blog-posts, categories, authors

2. **Supabase**: Managing critical dynamic data
   - User authentication and sessions
   - Tuition rates and calculator data
   - School hours and schedules
   - Admin settings
   - Teacher profiles

3. **Astro**: Static site generator with React support
   - Already configured for static output
   - Supports MDX out of the box
   - Git-based workflow in place

## Migration Architecture

### Data Classification

#### Stays in Supabase (Dynamic/Critical)
- User authentication and sessions
- Tuition rates and calculator logic
- Form submissions (contact, tour requests)
- Real-time settings that affect functionality
- User roles and permissions
- Analytics data
- Payment/donation records

#### Moves to Decap CMS (Content/Static)
- Blog posts and articles
- News and announcements
- Staff profiles and bios
- School policies and documents
- Event descriptions
- Photo galleries and captions
- Program descriptions
- Testimonials
- FAQ content
- Resource library documents

### Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Astro)                       │
├─────────────────────────┬───────────────────────────────┤
│    Dynamic Data API     │      Static Content           │
│    (Supabase)          │      (Decap CMS)              │
├─────────────────────────┼───────────────────────────────┤
│ • Authentication        │ • Blog Posts (MDX)            │
│ • Tuition Calculator    │ • Staff Profiles              │
│ • School Hours         │ • Announcements               │
│ • Form Submissions     │ • Policies                    │
│ • Admin Settings       │ • Events                      │
│ • User Management      │ • Resources                   │
└─────────────────────────┴───────────────────────────────┘
```

## Content Schema Definitions

### 1. Blog Posts (blog.md)
```yaml
collections:
  - name: "blog"
    label: "Blog Posts"
    folder: "src/content/blog"
    create: true
    slug: "{{year}}-{{month}}-{{day}}-{{slug}}"
    fields:
      - {label: "Title", name: "title", widget: "string", required: true}
      - {label: "Publish Date", name: "date", widget: "datetime", required: true}
      - {label: "Author", name: "author", widget: "relation", collection: "staff", search_fields: ["name"], value_field: "name"}
      - {label: "Categories", name: "categories", widget: "list", default: ["News"]}
      - {label: "Featured Image", name: "image", widget: "image", required: false}
      - {label: "Image Alt Text", name: "imageAlt", widget: "string", required: false}
      - {label: "Excerpt", name: "excerpt", widget: "text", required: true}
      - {label: "SEO Title", name: "seoTitle", widget: "string", required: false}
      - {label: "SEO Description", name: "seoDescription", widget: "text", required: false}
      - {label: "Draft", name: "draft", widget: "boolean", default: false}
      - {label: "Body", name: "body", widget: "markdown", required: true}
```

### 2. Staff Profiles (staff.md)
```yaml
collections:
  - name: "staff"
    label: "Staff & Teachers"
    folder: "src/content/staff"
    create: true
    slug: "{{slug}}"
    fields:
      - {label: "Name", name: "name", widget: "string", required: true}
      - {label: "Role", name: "role", widget: "string", required: true}
      - {label: "Photo", name: "photo", widget: "image", required: true}
      - {label: "Email", name: "email", widget: "string", required: false}
      - {label: "Credentials", name: "credentials", widget: "list", default: []}
      - {label: "Bio", name: "bio", widget: "markdown", required: true}
      - {label: "Teaching Philosophy", name: "philosophy", widget: "text", required: false}
      - {label: "Languages Spoken", name: "languages", widget: "list", default: ["English"]}
      - {label: "Start Year", name: "startYear", widget: "number", required: true}
      - {label: "Display Order", name: "order", widget: "number", default: 99}
```

### 3. Announcements (announcements.md)
```yaml
collections:
  - name: "announcements"
    label: "Announcements & Notices"
    folder: "src/content/announcements"
    create: true
    slug: "{{year}}-{{month}}-{{day}}-{{slug}}"
    fields:
      - {label: "Title", name: "title", widget: "string", required: true}
      - {label: "Type", name: "type", widget: "select", options: ["notice", "closure", "event", "update"], default: "notice"}
      - {label: "Priority", name: "priority", widget: "select", options: ["low", "normal", "high", "urgent"], default: "normal"}
      - {label: "Start Date", name: "startDate", widget: "datetime", required: true}
      - {label: "End Date", name: "endDate", widget: "datetime", required: true}
      - {label: "Content", name: "body", widget: "markdown", required: true}
      - {label: "Target Audience", name: "audience", widget: "select", multiple: true, options: ["all", "parents", "staff", "community"], default: ["all"]}
```

### 4. Events (events.md)
```yaml
collections:
  - name: "events"
    label: "Events"
    folder: "src/content/events"
    create: true
    slug: "{{year}}-{{month}}-{{day}}-{{slug}}"
    fields:
      - {label: "Event Name", name: "title", widget: "string", required: true}
      - {label: "Event Date", name: "date", widget: "datetime", required: true}
      - {label: "End Date", name: "endDate", widget: "datetime", required: false}
      - {label: "Location", name: "location", widget: "string", required: true}
      - {label: "Event Type", name: "type", widget: "select", options: ["school", "community", "fundraising", "parent-education"], default: "school"}
      - {label: "Description", name: "description", widget: "markdown", required: true}
      - {label: "Featured Image", name: "image", widget: "image", required: false}
      - {label: "RSVP Required", name: "rsvpRequired", widget: "boolean", default: false}
      - {label: "RSVP Link", name: "rsvpLink", widget: "string", required: false}
      - {label: "Cost", name: "cost", widget: "string", default: "Free"}
```

### 5. Resources (resources.md)
```yaml
collections:
  - name: "resources"
    label: "Parent Resources"
    folder: "src/content/resources"
    create: true
    slug: "{{slug}}"
    fields:
      - {label: "Title", name: "title", widget: "string", required: true}
      - {label: "Category", name: "category", widget: "select", options: ["montessori-education", "parenting", "child-development", "school-policies", "forms"], required: true}
      - {label: "Description", name: "description", widget: "text", required: true}
      - {label: "Resource Type", name: "type", widget: "select", options: ["article", "pdf", "video", "link"], required: true}
      - {label: "File", name: "file", widget: "file", required: false}
      - {label: "External Link", name: "link", widget: "string", required: false}
      - {label: "Content", name: "body", widget: "markdown", required: false}
      - {label: "Tags", name: "tags", widget: "list", default: []}
```

### 6. Testimonials (testimonials.md)
```yaml
collections:
  - name: "testimonials"
    label: "Testimonials"
    folder: "src/content/testimonials"
    create: true
    slug: "{{slug}}"
    fields:
      - {label: "Parent Name", name: "name", widget: "string", required: true}
      - {label: "Child's Grade/Program", name: "program", widget: "string", required: false}
      - {label: "Year", name: "year", widget: "number", required: true}
      - {label: "Quote", name: "quote", widget: "text", required: true}
      - {label: "Featured", name: "featured", widget: "boolean", default: false}
```

## Implementation Phases

### Phase 1: Infrastructure Setup (Day 1-2)

#### 1.1 Install and Configure Decap CMS
```bash
# Install Decap CMS
npm install decap-cms-app

# Create admin directory
mkdir -p public/admin

# Create config file
touch public/admin/config.yml
touch public/admin/index.html
```

#### 1.2 Decap CMS Configuration (config.yml)
```yaml
backend:
  name: git-gateway
  branch: main
  commit_messages:
    create: 'Create {{collection}} "{{slug}}"'
    update: 'Update {{collection}} "{{slug}}"'
    delete: 'Delete {{collection}} "{{slug}}"'
    uploadMedia: '[skip ci] Upload "{{path}}"'
    deleteMedia: '[skip ci] Delete "{{path}}"'

local_backend: true # Enable local development

media_folder: "public/uploads"
public_folder: "/uploads"

# Collections defined above...
```

#### 1.3 Supabase Auth Integration
```typescript
// src/lib/decap-auth.ts
import { createClient } from '@supabase/supabase-js';

export async function handleDecapAuth(user) {
  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  );
  
  // Check if user has admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (profile?.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }
  
  return true;
}
```

### Phase 2: Content Migration (Day 3-4)

#### 2.1 Export Strapi Content
```javascript
// scripts/export-strapi-content.js
const fs = require('fs');
const fetch = require('node-fetch');

async function exportStrapiContent() {
  const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
  
  // Export blog posts
  const postsRes = await fetch(`${STRAPI_URL}/api/blog-posts?populate=*`);
  const posts = await postsRes.json();
  
  // Convert to MDX format
  posts.data.forEach(post => {
    const frontmatter = {
      title: post.attributes.title,
      date: post.attributes.publishedAt,
      author: post.attributes.author?.data?.attributes?.username || 'Spicebush Team',
      categories: post.attributes.categories?.data?.map(c => c.attributes.name) || [],
      excerpt: post.attributes.excerpt,
      image: post.attributes.featuredImage?.data?.attributes?.url,
      seoTitle: post.attributes.seoTitle,
      seoDescription: post.attributes.seoDescription
    };
    
    const content = `---
${Object.entries(frontmatter).map(([key, value]) => 
  `${key}: ${JSON.stringify(value)}`
).join('\n')}
---

${post.attributes.content}
`;
    
    const filename = `${post.attributes.publishedAt.split('T')[0]}-${post.attributes.slug}.mdx`;
    fs.writeFileSync(`src/content/blog/${filename}`, content);
  });
}
```

#### 2.2 Create Content Collections
```typescript
// src/content/config.ts
import { z, defineCollection } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    author: z.string(),
    categories: z.array(z.string()),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    excerpt: z.string(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const staffCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    role: z.string(),
    photo: z.string(),
    email: z.string().email().optional(),
    credentials: z.array(z.string()).default([]),
    languages: z.array(z.string()).default(['English']),
    startYear: z.number(),
    order: z.number().default(99),
  }),
});

// ... other collections

export const collections = {
  blog: blogCollection,
  staff: staffCollection,
  announcements: announcementsCollection,
  events: eventsCollection,
  resources: resourcesCollection,
  testimonials: testimonialsCollection,
};
```

### Phase 3: Update Components (Day 5)

#### 3.1 Update Blog Pages
```astro
---
// src/pages/blog/[...slug].astro
import { getCollection } from 'astro:content';
import Layout from '../../layouts/Layout.astro';

export async function getStaticPaths() {
  const blogEntries = await getCollection('blog', ({ data }) => {
    return data.draft !== true;
  });
  
  return blogEntries.map(entry => ({
    params: { slug: entry.slug },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content } = await entry.render();
---

<Layout title={entry.data.title}>
  <article>
    <h1>{entry.data.title}</h1>
    <Content />
  </article>
</Layout>
```

#### 3.2 Create Admin Interface Integration
```astro
---
// src/pages/admin/content.astro
import AdminLayout from '../../layouts/AdminLayout.astro';
import { supabase } from '../../lib/supabase';

// Check admin authentication
const user = await supabase.auth.getUser();
if (!user.data.user || !isAdmin(user.data.user.email)) {
  return Astro.redirect('/auth/login');
}
---

<AdminLayout title="Content Management">
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">Content Management</h1>
    
    <div class="bg-white rounded-lg shadow-md p-6">
      <p class="mb-4">Access the content management system to edit blog posts, staff profiles, and more.</p>
      
      <a href="/admin/cms" class="btn btn-primary">
        Open Content Editor
      </a>
      
      <div class="mt-8">
        <h2 class="text-xl font-semibold mb-4">Quick Links</h2>
        <ul class="space-y-2">
          <li><a href="/admin/cms/#/collections/blog" class="text-blue-600 hover:underline">Manage Blog Posts</a></li>
          <li><a href="/admin/cms/#/collections/staff" class="text-blue-600 hover:underline">Manage Staff Profiles</a></li>
          <li><a href="/admin/cms/#/collections/announcements" class="text-blue-600 hover:underline">Manage Announcements</a></li>
          <li><a href="/admin/cms/#/collections/events" class="text-blue-600 hover:underline">Manage Events</a></li>
        </ul>
      </div>
    </div>
  </div>
</AdminLayout>
```

### Phase 4: Remove Strapi (Day 6)

#### 4.1 Update Docker Configuration
```yaml
# docker-compose.yml - Remove these services:
# - strapi
# - strapi-db
```

#### 4.2 Clean Up Environment Variables
```bash
# Remove from .env:
# STRAPI_URL
# STRAPI_DATABASE_*
# STRAPI_ADMIN_*
```

#### 4.3 Remove Strapi Dependencies
```bash
# Remove any Strapi-related packages
npm uninstall @strapi/strapi @strapi/plugin-*
```

## Multilingual Support Plan

### Phase 1: Basic Structure
```typescript
// src/content/config.ts
const translatedContent = defineCollection({
  type: 'content',
  schema: z.object({
    lang: z.enum(['en', 'es', 'fr', 'ar', 'zh', 'ru', 'pt', 'hi', 'ur']),
    translations: z.record(z.string(), z.string()),
  }),
});
```

### Phase 2: Decap CMS Multilingual Fields
```yaml
# In config.yml
fields:
  - label: "Content"
    name: "content"
    widget: "object"
    fields:
      - {label: "English", name: "en", widget: "markdown", required: true}
      - {label: "Spanish", name: "es", widget: "markdown", required: false}
      - {label: "French", name: "fr", widget: "markdown", required: false}
      # ... other languages
```

## User Training Plan

### 1. Documentation
- Create user guide with screenshots
- Record video tutorials for common tasks
- Provide cheat sheet for markdown formatting

### 2. Training Sessions
- Initial 2-hour training for all staff
- Weekly office hours during first month
- Create Slack channel for questions

### 3. Content Templates
- Pre-built templates for common content types
- Example content for reference
- Style guide for consistency

## Migration Timeline

### Week 1
- **Day 1-2**: Infrastructure setup and Decap CMS configuration
- **Day 3-4**: Content migration from Strapi
- **Day 5**: Component updates and testing
- **Day 6**: Remove Strapi and cleanup
- **Day 7**: User training and documentation

### Week 2
- **Day 8-9**: Bug fixes and refinements
- **Day 10**: Advanced features (multilingual setup)
- **Day 11-12**: Performance optimization
- **Day 13-14**: Final testing and go-live

## Risk Mitigation

### 1. Data Loss Prevention
- Full backup of Strapi data before migration
- Git-based version control for all content
- Ability to rollback at any point

### 2. User Adoption
- Comprehensive training program
- Similar interface to familiar tools
- Ongoing support during transition

### 3. Technical Issues
- Thorough testing before Strapi removal
- Staged rollout with parallel running
- Clear rollback procedures

## Success Metrics

### Technical Metrics
- Page load time improvement: >30%
- Build time reduction: >50%
- Infrastructure cost reduction: ~$50/month
- Zero content loss during migration

### User Metrics
- Staff can create/edit content within 1 week
- 90% user satisfaction with new system
- Reduced support tickets for content management
- Faster content publishing workflow

## Maintenance Plan

### Regular Tasks
- Weekly content backups to cloud storage
- Monthly review of user permissions
- Quarterly training refreshers
- Annual review of content schemas

### Monitoring
- Git commit activity for content changes
- Build success rates
- User feedback collection
- Performance metrics tracking

## Conclusion

This migration plan provides a clear path from Strapi to Decap CMS while:
- Maintaining all current functionality
- Reducing infrastructure complexity
- Improving performance and developer experience
- Providing better user experience for content editors
- Setting foundation for future multilingual support

The phased approach ensures minimal disruption while delivering immediate benefits through simplified architecture and improved maintainability.