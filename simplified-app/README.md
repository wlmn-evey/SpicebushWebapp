# Spicebush Montessori - Simplified MDX + TinaCMS Structure

This is a simplified content structure for the Spicebush Montessori website using:
- **Astro** - Static site generator
- **MDX** - For rich content with components
- **TinaCMS** - For visual editing
- **Tailwind CSS** - For simple, maintainable styling

## Project Structure

```
simplified-app/
├── src/
│   ├── content/          # All MDX content files
│   │   ├── blog/        # Blog posts
│   │   ├── teachers/    # Teacher profiles
│   │   └── programs/    # Program descriptions
│   ├── data/            # JSON data files
│   │   ├── contact.json
│   │   ├── school-hours.json
│   │   └── tuition-rates.json
│   ├── layouts/         # Reusable page layouts
│   └── pages/           # Astro pages/routes
├── public/              # Static assets
│   └── images/         # Site images
└── tina/               # TinaCMS configuration
```

## Content Collections

### Blog Posts
- Title, description, publish date, author
- Optional featured image
- Draft/published status
- Rich MDX content

### Teachers
- Name, role, photo, email
- Credentials list
- Display order
- Active/inactive status
- Bio in MDX

### Programs
- Title, description, age range, schedule
- Optional featured image
- Display order
- Active/inactive status
- Full details in MDX

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up TinaCMS environment variables:
   ```bash
   TINA_CLIENT_ID=your-client-id
   TINA_TOKEN=your-token
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Access TinaCMS admin:
   ```
   http://localhost:4321/admin
   ```

## Key Features

- **Simple content structure** - Easy to understand and maintain
- **Type-safe collections** - Astro content collections with Zod schemas
- **Visual editing** - TinaCMS for non-technical editors
- **Static output** - Fast, secure, hostable anywhere
- **No over-engineering** - Just what the school needs

## Adding Content

### New Blog Post
Create a new `.mdx` file in `src/content/blog/`:
```mdx
---
title: "Your Post Title"
description: "Brief description"
publishDate: 2025-07-26
author: "Spicebush Montessori"
image: "/images/blog/featured.jpg"
draft: false
---

Your content here...
```

### New Teacher
Create a new `.mdx` file in `src/content/teachers/`:
```mdx
---
name: "Teacher Name"
role: "Lead Guide"
image: "/images/teachers/name.jpg"
email: "teacher@spicebushmontessori.org"
credentials: 
  - "AMI Certification"
  - "M.Ed. Education"
order: 1
active: true
---

Teacher bio here...
```

### New Program
Create a new `.mdx` file in `src/content/programs/`:
```mdx
---
title: "Program Name"
shortDescription: "Brief overview"
ageRange: "3-6 years"
schedule: "Mon-Fri, 8:30am-3:30pm"
image: "/images/programs/program.jpg"
order: 1
active: true
---

Program details here...
```

## Deployment

Build the static site:
```bash
npm run build
```

The output will be in the `dist/` folder, ready to deploy to any static host.

## Notes

- Keep it simple - resist adding complexity
- Use MDX for rich content when needed
- Let TinaCMS handle the editing experience
- Static JSON files for data that rarely changes
- Focus on what the school actually needs