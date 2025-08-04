# Simplification Implementation Guide

## Quick Start: Phase 1 - Remove Strapi

This guide provides concrete steps to begin simplifying the Spicebush Montessori webapp, starting with removing Strapi and migrating to MDX for blog posts.

## Prerequisites

Before starting, ensure you have:
- Node.js 18+ installed
- Access to the current Strapi admin panel
- Basic familiarity with Markdown

## Step 1: Export Blog Content from Strapi

### 1.1 Access Strapi Content

```bash
# Start current Docker setup to access Strapi
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app
docker-compose up strapi strapi-db

# Strapi will be available at http://localhost:1337/admin
```

### 1.2 Export Blog Posts

Create a script to export all blog posts:

```javascript
// scripts/export-strapi-blogs.js
const fs = require('fs');
const path = require('path');

async function exportBlogs() {
  const response = await fetch('http://localhost:1337/api/blog-posts?populate=*');
  const { data } = await response.json();
  
  const exportDir = path.join(__dirname, '../exported-blogs');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }
  
  data.forEach(post => {
    const { title, content, slug, publishedAt, excerpt, author } = post.attributes;
    const filename = `${slug}.mdx`;
    
    const frontmatter = `---
title: "${title}"
date: ${publishedAt}
author: "${author?.data?.attributes?.username || 'Spicebush Team'}"
excerpt: "${excerpt || ''}"
image: "${post.attributes.featuredImage?.data?.attributes?.url || ''}"
---`;
    
    const mdxContent = `${frontmatter}\n\n${content}`;
    
    fs.writeFileSync(path.join(exportDir, filename), mdxContent);
    console.log(`Exported: ${filename}`);
  });
}

exportBlogs();
```

## Step 2: Set Up MDX in Astro

### 2.1 Install Dependencies

```bash
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app
npm install @astrojs/mdx
```

### 2.2 Update Astro Configuration

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://spicebushmontessori.org',
  integrations: [
    tailwind(),
    sitemap(),
    react(),
    mdx() // Add MDX support
  ],
  output: 'static'
});
```

### 2.3 Create Content Collections

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    author: z.string(),
    excerpt: z.string().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = { blog };
```

## Step 3: Migrate Blog Content

### 3.1 Create Blog Content Directory

```bash
mkdir -p src/content/blog
```

### 3.2 Move Exported MDX Files

Based on the existing blog posts in `/docs/blog/`, create properly formatted MDX files:

```markdown
<!-- src/content/blog/embracing-holistic-development.mdx -->
---
title: "Embracing Holistic Development: Spicebush Montessori's Educational Values"
date: 2024-10-29
author: "Marketing Team"
excerpt: "Spicebush Montessori School in Glen Mills, Pennsylvania, is committed to holistic education guided by the SPICES framework."
image: "/images/blog/spicebush-logo.png"
tags: ["education", "montessori", "values"]
---

import { Image } from 'astro:assets';

Spicebush Montessori School in Glen Mills, Pennsylvania, is committed to holistic education guided by the SPICES framework: Social Justice, Peace, Inclusion, Community, Environment, and Simplicity.

## Key Values

### Social Justice
The curriculum is designed to raise children who are "aware of and engaged with the issues of fairness and equity" through classroom discussions and community service projects.

### Peace
Peace is cultivated through:
- Conflict resolution modeling
- Encouraging peaceful interactions
- Promoting understanding and respect

[Continue with rest of content...]
```

## Step 4: Update Blog Pages

### 4.1 Create New Blog Listing Page

```astro
---
// src/pages/blog/index.astro
import Layout from '../../layouts/Layout.astro';
import { getCollection } from 'astro:content';

const posts = await getCollection('blog');
const sortedPosts = posts.sort((a, b) => 
  new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
);
---

<Layout title="Blog - Spicebush Montessori School">
  <main>
    <h1>Our Blog</h1>
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {sortedPosts.map((post) => (
        <article class="border rounded-lg p-6 hover:shadow-lg transition-shadow">
          {post.data.image && (
            <img 
              src={post.data.image} 
              alt={post.data.title}
              class="w-full h-48 object-cover rounded mb-4"
            />
          )}
          <h2 class="text-xl font-bold mb-2">
            <a href={`/blog/${post.slug}`} class="hover:text-moss-green">
              {post.data.title}
            </a>
          </h2>
          <p class="text-gray-600 mb-4">{post.data.excerpt}</p>
          <div class="text-sm text-gray-500">
            <time datetime={post.data.date.toISOString()}>
              {post.data.date.toLocaleDateString()}
            </time>
            {' • '}
            {post.data.author}
          </div>
        </article>
      ))}
    </div>
  </main>
</Layout>
```

### 4.2 Create Blog Post Page

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

<Layout title={`${post.data.title} - Spicebush Montessori`}>
  <article class="max-w-4xl mx-auto px-4 py-8">
    <header class="mb-8">
      <h1 class="text-4xl font-bold mb-4">{post.data.title}</h1>
      <div class="text-gray-600">
        <time datetime={post.data.date.toISOString()}>
          {post.data.date.toLocaleDateString()}
        </time>
        {' • '}
        {post.data.author}
      </div>
    </header>
    
    {post.data.image && (
      <img 
        src={post.data.image} 
        alt={post.data.title}
        class="w-full rounded-lg mb-8"
      />
    )}
    
    <div class="prose prose-lg max-w-none">
      <Content />
    </div>
  </article>
</Layout>
```

## Step 5: Remove Strapi Dependencies

### 5.1 Update Docker Compose

Create a simplified docker-compose file without Strapi:

```yaml
# docker-compose.simple.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "4321:4321"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
```

### 5.2 Remove Strapi References

1. Delete the blog-backend directory (after confirming export)
2. Remove Strapi service from docker-compose.yml
3. Update any environment variables referencing Strapi

## Step 6: Test and Verify

### 6.1 Start Simplified Development

```bash
# Use the simplified docker compose
docker-compose -f docker-compose.simple.yml up

# Or run directly with npm
npm run dev
```

### 6.2 Verification Checklist

- [ ] All blog posts display correctly
- [ ] Blog listing page works
- [ ] Individual blog post pages render
- [ ] Images load properly
- [ ] SEO metadata is preserved
- [ ] URLs match previous structure (or redirects are in place)

## Step 7: Deploy Changes

### 7.1 Update Build Command

```json
// package.json
{
  "scripts": {
    "build": "astro build",
    "preview": "astro preview"
  }
}
```

### 7.2 Deploy to Netlify

```bash
# Build the site
npm run build

# Deploy with Netlify CLI
netlify deploy --dir=dist
netlify deploy --prod --dir=dist
```

## Next Steps

After successfully removing Strapi:

1. **Phase 2**: Migrate dynamic data (tuition, hours) to JSON files
2. **Phase 3**: Simplify authentication 
3. **Phase 4**: Remove Docker for local development
4. **Phase 5**: Complete production deployment

## Rollback Plan

If issues arise:

1. The original code is preserved in git
2. Strapi data is exported and saved
3. Can quickly revert by checking out previous commit
4. No data is deleted until new system is proven

## Benefits Achieved in Phase 1

- Removed entire CMS infrastructure for 5 blog posts
- Simplified deployment (no Strapi to maintain)
- Improved performance (static generation)
- Reduced security surface area
- Enabled version control for all content

## Support

For questions or issues during migration:
1. Check the `/journal` directory for context
2. Review git history for previous implementations
3. Test thoroughly in development before deploying