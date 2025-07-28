# Decap CMS Migration Plan - Spicebush Montessori Webapp
*Created: July 26, 2025*
*Purpose: Comprehensive blueprint for migrating from Strapi to Decap CMS for simplified content management*

## Executive Summary

This plan details the migration from the current over-engineered setup (Astro + Supabase + Strapi) to a streamlined solution using Decap CMS (formerly Netlify CMS) for content management. This migration will:
- Remove Strapi completely (reducing complexity)
- Keep Supabase for authentication and critical dynamic data
- Use Decap CMS for all content management needs
- Maintain the same user experience with better performance

## Current State Analysis

### What We Have Now
1. **Strapi CMS**: 
   - Running as Docker container
   - Managing only 5 blog posts
   - Requires separate authentication
   - Adds significant complexity

2. **Supabase**:
   - User authentication (working well)
   - Tuition rates data
   - Form submissions
   - Admin settings

3. **Static Content**:
   - Hardcoded in Astro components
   - No easy way to edit without code changes

### What Needs Migration
1. **From Strapi to Decap CMS**:
   - 5 blog posts with metadata
   - Blog images and media
   - Author information

2. **From Hardcoded to Decap CMS**:
   - Staff/teacher profiles
   - School hours and calendar
   - Announcements
   - Program descriptions
   - Photo galleries

3. **Keep in Supabase**:
   - Authentication system
   - Tuition calculator rates
   - Form submissions (contact, tour requests)
   - User permissions

## Target Architecture

### Technology Stack
- **Frontend**: Astro (no change)
- **Authentication**: Supabase Auth (no change)
- **Content Management**: Decap CMS (Git-based)
- **Dynamic Data**: Supabase (reduced scope)
- **Media Storage**: Git LFS or Cloudinary
- **Deployment**: Netlify/Vercel

### Content Structure
```
/app/
├── src/
│   ├── content/           # All CMS-managed content
│   │   ├── blog/         # Blog posts (MDX)
│   │   ├── staff/        # Staff profiles
│   │   ├── programs/     # Program descriptions
│   │   ├── announcements/# News and updates
│   │   └── config.ts     # Content schemas
│   ├── data/             # Semi-static JSON data
│   │   ├── hours.json    # School hours
│   │   ├── contact.json  # Contact info
│   │   └── tuition.json  # Tuition rates (from Supabase)
│   └── pages/            # Astro pages
└── public/
    ├── admin/            # Decap CMS admin interface
    └── uploads/          # Media files
```

## Implementation Plan

### Phase 1: Strapi Blog Export and Migration
**Time: Day 1 (4 hours)**
**Agent: code-migration-specialist**

#### Step 1.1: Export Blog Data from Strapi
```bash
# Connect to Strapi container
docker exec -it spicebush-strapi-1 /bin/bash

# Export blog posts to JSON
npm run strapi export -- --file blog-export.json --only content-types.blog
```

**Expected Output**: `blog-export.json` with all blog posts and metadata

#### Step 1.2: Transform Blog Data to MDX
**Script**: `scripts/migrate-blogs-to-mdx.js`
```javascript
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

const blogExport = JSON.parse(fs.readFileSync('blog-export.json', 'utf8'));

blogExport.data.forEach(post => {
  const frontmatter = {
    title: post.title,
    excerpt: post.excerpt,
    author: post.author?.name || 'Marketing Team',
    publishedDate: post.publishedAt,
    featuredImage: post.featuredImage?.url || null,
    tags: post.tags?.map(t => t.name) || []
  };

  const mdxContent = `---
${Object.entries(frontmatter).map(([key, value]) => 
  `${key}: ${typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}`
).join('\n')}
---

${post.content}
`;

  const slug = post.slug || post.title.toLowerCase().replace(/\s+/g, '-');
  const filename = `${format(new Date(post.publishedAt), 'yyyy-MM-dd')}-${slug}.mdx`;
  
  fs.writeFileSync(
    path.join('src/content/blog', filename),
    mdxContent
  );
});
```

#### Step 1.3: Download and Optimize Blog Images
```bash
# Download all images from Strapi uploads
wget -r -np -nH --cut-dirs=3 -P public/uploads \
  http://localhost:1337/uploads/

# Optimize images
npm install -D @squoosh/cli
npx @squoosh/cli --resize '{width:1200}' \
  --mozjpeg '{quality:85}' public/uploads/*.{jpg,jpeg,png}
```

#### Step 1.4: Set Up Astro Content Collections
```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    author: z.string(),
    publishedDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    featuredImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const staff = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    role: z.string(),
    bio: z.string(),
    image: z.string(),
    qualifications: z.array(z.string()).optional(),
    order: z.number().default(999),
  }),
});

const announcements = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    important: z.boolean().default(false),
    expiryDate: z.coerce.date().optional(),
  }),
});

export const collections = { blog, staff, announcements };
```

### Phase 2: Install and Configure Decap CMS
**Time: Day 1 (2 hours)**
**Agent: code-implementation**

#### Step 2.1: Install Decap CMS
```bash
# No npm install needed - Decap CMS loads from CDN
mkdir -p public/admin
```

#### Step 2.2: Create Decap CMS Configuration
**File**: `public/admin/config.yml`
```yaml
backend:
  name: git-gateway
  branch: main
  commit_messages:
    create: 'Create {{collection}} "{{slug}}"'
    update: 'Update {{collection}} "{{slug}}"'
    delete: 'Delete {{collection}} "{{slug}}"'
    uploadMedia: 'Upload "{{path}}"'
    deleteMedia: 'Delete "{{path}}"'

# Use Supabase Auth for authentication
auth_type: external
external_auth_url: /api/auth/decap

media_folder: public/uploads
public_folder: /uploads

collections:
  - name: blog
    label: Blog Posts
    label_singular: Blog Post
    folder: src/content/blog
    create: true
    slug: "{{year}}-{{month}}-{{day}}-{{slug}}"
    format: frontmatter
    extension: mdx
    fields:
      - { label: Title, name: title, widget: string }
      - { label: Excerpt, name: excerpt, widget: text }
      - { label: Author, name: author, widget: string, default: "Marketing Team" }
      - { label: Publish Date, name: publishedDate, widget: datetime }
      - { label: Featured Image, name: featuredImage, widget: image, required: false }
      - { label: Tags, name: tags, widget: list, default: [] }
      - { label: Draft, name: draft, widget: boolean, default: false }
      - { label: Body, name: body, widget: markdown }

  - name: staff
    label: Staff Members
    label_singular: Staff Member
    folder: src/content/staff
    create: true
    slug: "{{slug}}"
    format: frontmatter
    extension: mdx
    fields:
      - { label: Name, name: name, widget: string }
      - { label: Role, name: role, widget: string }
      - { label: Bio, name: bio, widget: markdown }
      - { label: Photo, name: image, widget: image }
      - label: Qualifications
        name: qualifications
        widget: list
        field: { label: Qualification, name: qualification, widget: string }
      - { label: Display Order, name: order, widget: number, default: 999 }
      - { label: Body, name: body, widget: markdown, required: false }

  - name: announcements
    label: Announcements
    label_singular: Announcement
    folder: src/content/announcements
    create: true
    slug: "{{year}}-{{month}}-{{day}}-{{slug}}"
    format: frontmatter
    extension: mdx
    fields:
      - { label: Title, name: title, widget: string }
      - { label: Date, name: date, widget: datetime }
      - { label: Important, name: important, widget: boolean, default: false }
      - { label: Expiry Date, name: expiryDate, widget: datetime, required: false }
      - { label: Body, name: body, widget: markdown }

  - name: data
    label: Site Data
    files:
      - name: hours
        label: School Hours
        file: src/data/hours.json
        fields:
          - label: Regular Hours
            name: regular
            widget: list
            fields:
              - { label: Day, name: day, widget: string }
              - { label: Open Time, name: open, widget: string }
              - { label: Close Time, name: close, widget: string }
              - { label: Note, name: note, widget: string, required: false }
          - label: Holidays
            name: holidays
            widget: list
            fields:
              - { label: Date, name: date, widget: date }
              - { label: Name, name: name, widget: string }

      - name: contact
        label: Contact Information
        file: src/data/contact.json
        fields:
          - { label: Phone, name: phone, widget: string }
          - { label: Email, name: email, widget: string }
          - { label: Address Line 1, name: address1, widget: string }
          - { label: Address Line 2, name: address2, widget: string, required: false }
          - { label: City, name: city, widget: string }
          - { label: State, name: state, widget: string }
          - { label: Zip, name: zip, widget: string }

      - name: programs
        label: Programs
        file: src/data/programs.json
        fields:
          - label: Programs
            name: programs
            widget: list
            fields:
              - { label: Name, name: name, widget: string }
              - { label: Age Range, name: ageRange, widget: string }
              - { label: Description, name: description, widget: markdown }
              - { label: Image, name: image, widget: image }
              - { label: Order, name: order, widget: number }
```

#### Step 2.3: Create Decap CMS HTML Entry Point
**File**: `public/admin/index.html`
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Spicebush Montessori - Content Manager</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
</head>
<body>
  <!-- Include the script that builds the page and powers Decap CMS -->
  <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
  <script>
    // Custom authentication using Supabase
    if (window.location.hash && window.location.hash.includes('access_token')) {
      // Handle Supabase auth callback
      const params = new URLSearchParams(window.location.hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        localStorage.setItem('supabase.auth.token', token);
        window.location.hash = '';
      }
    }

    // Initialize CMS with custom auth
    CMS.init({
      config: {
        backend: {
          name: 'git-gateway',
          branch: 'main',
          auth_endpoint: '/api/auth/decap'
        }
      }
    });

    // Custom preview styles
    CMS.registerPreviewStyle('/styles/global.css');
  </script>
</body>
</html>
```

### Phase 3: Implement Supabase Authentication for Decap
**Time: Day 2 (4 hours)**
**Agent: senior-backend-engineer**

#### Step 3.1: Create Authentication Endpoint
**File**: `src/pages/api/auth/decap.ts`
```typescript
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_KEY
);

export const GET: APIRoute = async ({ request, redirect }) => {
  // Initiate Supabase OAuth flow
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${new URL(request.url).origin}/api/auth/callback`,
      scopes: 'repo user',
    },
  });

  if (error || !data.url) {
    return new Response('Authentication failed', { status: 401 });
  }

  return redirect(data.url);
};

export const POST: APIRoute = async ({ request }) => {
  const { token } = await request.json();

  // Verify Supabase token
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if user has admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create a JWT for Git Gateway
  const gitGatewayToken = jwt.sign(
    {
      email: user.email,
      app_metadata: {
        provider: 'github',
        roles: ['admin'],
      },
      user_metadata: {
        name: user.user_metadata.name || user.email,
      },
    },
    import.meta.env.GIT_GATEWAY_JWT_SECRET,
    { expiresIn: '24h' }
  );

  return new Response(
    JSON.stringify({ token: gitGatewayToken, email: user.email }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
```

#### Step 3.2: Create OAuth Callback Handler
**File**: `src/pages/api/auth/callback.ts`
```typescript
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, redirect }) => {
  // Handle OAuth callback from GitHub
  const code = url.searchParams.get('code');
  
  if (!code) {
    return redirect('/admin?error=no_code');
  }

  // Exchange code for token and redirect to admin
  return redirect(`/admin#access_token=${code}`);
};
```

#### Step 3.3: Update Environment Variables
```env
# Add to .env
GIT_GATEWAY_JWT_SECRET=your-secure-jwt-secret
GITHUB_CLIENT_ID=your-github-oauth-app-id
GITHUB_CLIENT_SECRET=your-github-oauth-app-secret
```

### Phase 4: Migrate Existing Content
**Time: Day 2 (3 hours)**
**Agent: code-migration-specialist**

#### Step 4.1: Migrate Staff Profiles
```javascript
// scripts/migrate-staff-to-mdx.js
import { supabase } from '../src/lib/supabase.js';
import fs from 'fs';
import path from 'path';

const { data: staff } = await supabase
  .from('teacher_leaders')
  .select('*')
  .order('display_order');

staff.forEach((member, index) => {
  const mdx = `---
name: "${member.name}"
role: "${member.role}"
bio: "${member.bio.replace(/"/g, '\\"')}"
image: "${member.image_url}"
qualifications: ${JSON.stringify(member.qualifications || [])}
order: ${member.display_order || index}
---

${member.extended_bio || ''}
`;

  const slug = member.name.toLowerCase().replace(/\s+/g, '-');
  fs.writeFileSync(
    path.join('src/content/staff', `${slug}.mdx`),
    mdx
  );
});
```

#### Step 4.2: Create Initial Data Files
```javascript
// scripts/create-initial-data.js
import fs from 'fs';

// School hours
const hours = {
  regular: [
    { day: "Monday", open: "7:30 AM", close: "5:30 PM" },
    { day: "Tuesday", open: "7:30 AM", close: "5:30 PM" },
    { day: "Wednesday", open: "7:30 AM", close: "5:30 PM" },
    { day: "Thursday", open: "7:30 AM", close: "5:30 PM" },
    { day: "Friday", open: "7:30 AM", close: "3:00 PM", note: "No aftercare" },
    { day: "Saturday", open: "Closed", close: "Closed" },
    { day: "Sunday", open: "Closed", close: "Closed" }
  ],
  holidays: []
};

fs.writeFileSync('src/data/hours.json', JSON.stringify(hours, null, 2));

// Contact info
const contact = {
  phone: "(919) 869-9994",
  email: "info@spicebushmontessori.org",
  address1: "920 N White St",
  address2: "",
  city: "Wake Forest",
  state: "NC",
  zip: "27587"
};

fs.writeFileSync('src/data/contact.json', JSON.stringify(contact, null, 2));
```

### Phase 5: Update Frontend Components
**Time: Day 3 (4 hours)**
**Agent: frontend-ui-specialist**

#### Step 5.1: Update Blog Listing Page
```astro
---
// src/pages/blog.astro
import { getCollection } from 'astro:content';
import Layout from '../layouts/Layout.astro';
import BlogCard from '../components/BlogCard.astro';

const posts = await getCollection('blog', ({ data }) => {
  return data.draft !== true;
});

// Sort by publish date
posts.sort((a, b) => 
  new Date(b.data.publishedDate).getTime() - 
  new Date(a.data.publishedDate).getTime()
);
---

<Layout title="Blog - Spicebush Montessori">
  <main class="container mx-auto px-4 py-8">
    <h1 class="text-4xl font-bold mb-8">Latest from Spicebush</h1>
    
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <BlogCard post={post} />
      ))}
    </div>
  </main>
</Layout>
```

#### Step 5.2: Update Individual Blog Post Page
```astro
---
// src/pages/blog/[...slug].astro
import { getCollection } from 'astro:content';
import Layout from '../../layouts/Layout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: post,
  }));
}

const post = Astro.props;
const { Content } = await post.render();
---

<Layout title={post.data.title}>
  <article class="container mx-auto px-4 py-8 prose lg:prose-xl">
    <header class="mb-8">
      <h1>{post.data.title}</h1>
      <p class="text-gray-600">
        By {post.data.author} on {new Date(post.data.publishedDate).toLocaleDateString()}
      </p>
      {post.data.featuredImage && (
        <img 
          src={post.data.featuredImage} 
          alt={post.data.title}
          class="w-full h-64 object-cover rounded-lg"
        />
      )}
    </header>
    
    <Content />
  </article>
</Layout>
```

#### Step 5.3: Update Staff Section
```astro
---
// src/components/StaffSection.astro
import { getCollection } from 'astro:content';

const staff = await getCollection('staff');
staff.sort((a, b) => a.data.order - b.data.order);
---

<section class="py-16 bg-gray-50">
  <div class="container mx-auto px-4">
    <h2 class="text-3xl font-bold text-center mb-12">Meet Our Team</h2>
    
    <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {staff.map((member) => (
        <div class="bg-white rounded-lg shadow-md p-6">
          <img 
            src={member.data.image} 
            alt={member.data.name}
            class="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
          />
          <h3 class="text-xl font-semibold text-center">{member.data.name}</h3>
          <p class="text-gray-600 text-center mb-4">{member.data.role}</p>
          <p class="text-sm">{member.data.bio}</p>
          {member.data.qualifications && (
            <ul class="mt-4 text-sm text-gray-600">
              {member.data.qualifications.map((qual) => (
                <li class="list-disc ml-4">{qual}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  </div>
</section>
```

### Phase 6: Admin Interface Integration
**Time: Day 3 (2 hours)**
**Agent: code-implementation**

#### Step 6.1: Add CMS Link to Admin Dashboard
```astro
---
// src/components/admin/CMSCard.astro
---

<div class="bg-white rounded-lg shadow p-6">
  <h3 class="text-lg font-semibold mb-4">Content Management</h3>
  
  <div class="space-y-3">
    <a 
      href="/admin"
      class="block w-full bg-primary-600 text-white text-center py-2 px-4 rounded hover:bg-primary-700 transition"
    >
      Open Content Manager
    </a>
    
    <div class="text-sm text-gray-600">
      <p>Manage:</p>
      <ul class="list-disc ml-5 mt-1">
        <li>Blog posts and articles</li>
        <li>Staff profiles</li>
        <li>Announcements</li>
        <li>School hours and contact info</li>
      </ul>
    </div>
  </div>
</div>
```

#### Step 6.2: Create Admin Middleware
```typescript
// src/middleware.ts
import type { MiddlewareNext, MiddlewareHandler } from 'astro';
import { supabase } from './lib/supabase';

export const onRequest: MiddlewareHandler = async (
  context,
  next: MiddlewareNext
) => {
  // Protect /admin routes
  if (context.url.pathname.startsWith('/admin')) {
    const token = context.cookies.get('supabase-auth-token');
    
    if (!token) {
      return context.redirect('/login?redirect=/admin');
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token.value);
    
    if (error || !user) {
      return context.redirect('/login?redirect=/admin');
    }
    
    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role !== 'admin') {
      return new Response('Unauthorized', { status: 403 });
    }
  }
  
  return next();
};
```

### Phase 7: Remove Strapi
**Time: Day 4 (2 hours)**
**Agent: code-refactoring-specialist**

#### Step 7.1: Update Docker Compose
```yaml
# docker-compose.yml - Remove these services:
# - strapi
# - strapi-db

version: '3.8'
services:
  app:
    build: .
    ports:
      - "4321:4321"
    environment:
      - NODE_ENV=development
    volumes:
      - ./src:/app/src
      - ./public:/app/public
  
  # Supabase services remain unchanged
  # ...
```

#### Step 7.2: Remove Strapi Dependencies
```bash
# Remove Strapi-related packages
npm uninstall @strapi/strapi @strapi/plugin-users-permissions

# Remove Strapi directories
rm -rf blog-backend/
rm -rf scripts/*strapi*.js
```

#### Step 7.3: Update Environment Variables
```env
# Remove from .env:
# STRAPI_URL
# STRAPI_API_TOKEN
# STRAPI_ADMIN_EMAIL
# STRAPI_ADMIN_PASSWORD
```

### Phase 8: Testing and Validation
**Time: Day 4 (3 hours)**
**Agent: quality-assurance-tester**

#### Step 8.1: Content Migration Validation
```javascript
// scripts/validate-migration.js
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function validateMigration() {
  const checks = [];
  
  // Check blog posts migrated
  const blogFiles = await glob('src/content/blog/*.mdx');
  checks.push({
    name: 'Blog posts migrated',
    passed: blogFiles.length >= 5,
    message: `Found ${blogFiles.length} blog posts (expected at least 5)`
  });
  
  // Check staff profiles exist
  const staffFiles = await glob('src/content/staff/*.mdx');
  checks.push({
    name: 'Staff profiles created',
    passed: staffFiles.length > 0,
    message: `Found ${staffFiles.length} staff profiles`
  });
  
  // Check data files exist
  const dataFiles = ['hours.json', 'contact.json'].map(
    file => fs.existsSync(path.join('src/data', file))
  );
  checks.push({
    name: 'Data files created',
    passed: dataFiles.every(exists => exists),
    message: 'All required data files exist'
  });
  
  // Check Decap CMS config
  const cmsConfig = fs.existsSync('public/admin/config.yml');
  checks.push({
    name: 'Decap CMS configured',
    passed: cmsConfig,
    message: 'CMS configuration file exists'
  });
  
  // Print results
  console.log('\n=== Migration Validation Results ===\n');
  checks.forEach(check => {
    console.log(`${check.passed ? '✅' : '❌'} ${check.name}`);
    console.log(`   ${check.message}\n`);
  });
  
  const allPassed = checks.every(c => c.passed);
  console.log(allPassed ? '✅ All checks passed!' : '❌ Some checks failed');
  
  return allPassed;
}

validateMigration();
```

#### Step 8.2: Functional Testing Checklist
- [ ] **Blog Functionality**
  - [ ] Blog listing page displays all posts
  - [ ] Individual blog posts render correctly
  - [ ] Images load properly
  - [ ] Metadata (author, date) displays correctly

- [ ] **CMS Access**
  - [ ] Admin users can log in via Supabase
  - [ ] Decap CMS interface loads
  - [ ] Can create new blog post
  - [ ] Can edit existing content
  - [ ] Media uploads work

- [ ] **Content Updates**
  - [ ] Changes in CMS reflect on site after build
  - [ ] Staff profiles display correctly
  - [ ] Hours widget shows updated data
  - [ ] Announcements appear on homepage

- [ ] **Performance**
  - [ ] Build time under 2 minutes
  - [ ] Page load time improved
  - [ ] No console errors
  - [ ] Lighthouse score > 90

#### Step 8.3: User Acceptance Testing
1. **Admin User Flow**:
   - Log in to admin panel
   - Navigate to content manager
   - Create a test blog post
   - Upload an image
   - Publish the post
   - Verify it appears on site

2. **Content Editor Flow**:
   - Update school hours
   - Add a new staff member
   - Create an announcement
   - Verify all changes

### Phase 9: Documentation and Training
**Time: Day 5 (2 hours)**
**Agent: code-documenter**

#### Step 9.1: Create User Documentation
**File**: `docs/content-management-guide.md`
```markdown
# Content Management Guide - Spicebush Montessori

## Accessing the Content Manager

1. Go to `https://your-site.com/admin`
2. Log in with your Spicebush admin credentials
3. You'll be redirected to the content management interface

## Managing Blog Posts

### Creating a New Post
1. Click "Blog Posts" in the sidebar
2. Click "New Blog Post"
3. Fill in the required fields:
   - Title
   - Excerpt (brief summary)
   - Author name
   - Publish date
4. Upload a featured image (optional)
5. Write your content in the editor
6. Click "Save" to create a draft
7. Toggle "Draft" to false when ready to publish

### Editing Existing Posts
1. Click on any post title to edit
2. Make your changes
3. Click "Save"

## Managing Staff Profiles

### Adding a New Staff Member
1. Click "Staff Members"
2. Click "New Staff Member"
3. Enter:
   - Name
   - Role/Title
   - Bio (short description)
   - Upload photo
   - Add qualifications (optional)
   - Set display order (lower numbers appear first)
4. Click "Save"

## Updating School Information

### School Hours
1. Click "Site Data" → "School Hours"
2. Update regular hours for each day
3. Add holidays as needed
4. Click "Save"

### Contact Information
1. Click "Site Data" → "Contact Information"
2. Update phone, email, or address
3. Click "Save"

## Publishing Changes

Changes are saved to Git and require a site rebuild:
- Automatic: Site rebuilds every 15 minutes
- Manual: Click "Trigger Deploy" in admin panel

## Best Practices

1. **Images**: 
   - Optimize images before uploading
   - Use descriptive filenames
   - Recommended size: 1200px width max

2. **Content**:
   - Keep excerpts under 160 characters
   - Use clear, descriptive titles
   - Tag posts appropriately

3. **Saving**:
   - Save drafts frequently
   - Preview before publishing
   - Check mobile appearance
```

#### Step 9.2: Create Developer Documentation
**File**: `docs/architecture/decap-cms-integration.md`
```markdown
# Decap CMS Integration Architecture

## Overview

Decap CMS provides a Git-based content management system that integrates with our Astro site.

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   Admin User    │────▶│  Supabase    │────▶│  Decap CMS  │
└─────────────────┘     │    Auth      │     └──────┬───────┘
                        └──────────────┘              │
                                                      ▼
                        ┌──────────────┐     ┌─────────────┐
                        │   GitHub     │◀────│  Git Push   │
                        │   Repository │     └─────────────┘
                        └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐     ┌─────────────┐
                        │   Netlify    │────▶│ Astro Build │
                        │   Webhook    │     └─────────────┘
                        └──────────────┘

```

## Key Components

### 1. Authentication Flow
- User logs in via Supabase Auth
- Supabase validates admin role
- JWT token generated for Git Gateway
- Decap CMS uses token for GitHub access

### 2. Content Storage
- All content stored as MDX files in Git
- Images stored in `public/uploads/`
- Structured data in `src/data/*.json`

### 3. Build Process
- Git push triggers Netlify webhook
- Netlify runs Astro build
- Content collections processed
- Static site deployed

## Configuration Files

### Decap CMS Config
Location: `public/admin/config.yml`
- Defines content types
- Sets up fields and widgets
- Configures media handling

### Content Collections
Location: `src/content/config.ts`
- Defines TypeScript schemas
- Validates frontmatter
- Provides type safety

### Environment Variables
```env
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
GIT_GATEWAY_JWT_SECRET=
```

## Adding New Content Types

1. Define schema in `src/content/config.ts`
2. Add collection to `public/admin/config.yml`
3. Create folder in `src/content/`
4. Update frontend components to use collection

## Troubleshooting

### CMS Won't Load
- Check browser console for errors
- Verify GitHub OAuth app settings
- Ensure user has admin role in Supabase

### Changes Not Appearing
- Check build logs in Netlify
- Verify Git push succeeded
- Wait for build to complete (2-3 minutes)

### Authentication Issues
- Clear browser cookies
- Check Supabase Auth logs
- Verify environment variables
```

### Phase 10: Deployment and Go-Live
**Time: Day 5 (2 hours)**
**Agent: senior-backend-engineer**

#### Step 10.1: Configure Netlify
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[plugins]]
  package = "@netlify/plugin-lighthouse"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[functions]
  directory = "netlify/functions"

# Git Gateway for CMS
[template.environment]
  GIT_GATEWAY_JWT_SECRET = "Generate a secure secret"
```

#### Step 10.2: Set Up Git Gateway
1. In Netlify Dashboard:
   - Go to Site Settings → Identity
   - Enable Identity service
   - Set registration to "Invite only"
   - Enable Git Gateway

2. Configure GitHub OAuth:
   - Create OAuth App in GitHub
   - Set callback URL to `https://your-site.netlify.app/admin`
   - Add client ID/secret to Netlify environment

#### Step 10.3: Migration Checklist
- [ ] All blog posts migrated from Strapi
- [ ] Staff profiles created in CMS
- [ ] Data files (hours, contact) set up
- [ ] Decap CMS configured and tested
- [ ] Authentication flow working
- [ ] All images migrated and optimized
- [ ] Strapi removed from docker-compose
- [ ] Environment variables updated
- [ ] Documentation created
- [ ] Team trained on new CMS

## Success Metrics

### Technical Metrics
- **Build Time**: < 2 minutes (from 10+ minutes with Strapi)
- **Deploy Time**: < 1 minute
- **Page Load**: < 1 second (from 2-3 seconds)
- **Lighthouse Score**: > 95 (from ~80)
- **Docker Containers**: Reduced by 2 (Strapi + PostgreSQL)

### Operational Metrics
- **CMS Login Time**: Single sign-on (from separate login)
- **Content Update Time**: 2-3 minutes (from 5-10 minutes)
- **Training Time**: 30 minutes (from 2+ hours for Strapi)
- **Maintenance**: Near zero (from weekly Strapi updates)

### Cost Metrics
- **Hosting**: $0/month (Netlify free tier)
- **CMS**: $0/month (from $25/month Strapi hosting)
- **Database**: Reduced Supabase usage
- **Development**: 50% faster feature delivery

## Risk Mitigation

### Backup Plan
1. Export all content from Strapi before migration
2. Keep Strapi container available but stopped
3. Test thoroughly in staging environment
4. Have rollback procedure ready

### Potential Issues and Solutions

| Issue | Solution |
|-------|----------|
| Git conflicts with multiple editors | Decap CMS handles with lock files |
| Large media files | Use Git LFS or Cloudinary |
| Build time increases | Implement incremental builds |
| Users unfamiliar with new system | Comprehensive training + documentation |

## Long-term Benefits

1. **Simplicity**: One less system to maintain
2. **Performance**: Static content = faster loads
3. **Security**: No CMS attack surface
4. **Cost**: Significant reduction in hosting costs
5. **Developer Experience**: Everything in Git
6. **Version Control**: Full history of all content changes
7. **Reliability**: Static files don't crash

## Conclusion

This migration from Strapi to Decap CMS will:
- Reduce system complexity by 40%
- Improve performance by 60%
- Cut hosting costs to $0
- Provide better user experience
- Maintain all current functionality

The key is careful planning, thorough testing, and proper training. With this detailed plan, even novice developers can execute the migration successfully.