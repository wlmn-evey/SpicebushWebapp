# MDX Content Structure Setup

Date: 2025-07-26

## Summary

Created a simplified MDX content structure for the Spicebush Montessori website migration from Astro + Supabase + Strapi to Astro + MDX + TinaCMS.

## What Was Created

### Core Files
1. **Content Collections** (`src/content/config.ts`)
   - Blog collection: title, description, publishDate, author, image, draft status
   - Teachers collection: name, role, image, email, credentials, order, active status
   - Programs collection: title, shortDescription, ageRange, schedule, image, order, active status

2. **Astro Configuration** (`astro.config.mjs`)
   - MDX integration for rich content
   - Tailwind CSS for styling
   - Static output for simple hosting

3. **TinaCMS Configuration** (`tina/config.ts`)
   - Visual editing for all content types
   - Media management
   - Rich text editing with MDX support

4. **Page Templates**
   - Blog listing and individual posts
   - Teachers directory
   - Programs overview and details
   - Simple home page

### Key Design Decisions

1. **Simplicity First**
   - No complex abstractions or type gymnastics
   - Clear, readable schemas
   - Straightforward page structures

2. **Type Safety**
   - Zod schemas for content validation
   - TypeScript throughout
   - Astro's built-in content collection types

3. **Editorial Experience**
   - TinaCMS for visual editing
   - MDX for rich content when needed
   - Clear content structure

4. **Maintainability**
   - Standard Astro patterns
   - Minimal dependencies
   - Clear file organization

## File Structure

```
simplified-app/
├── astro.config.mjs          # Astro configuration
├── package.json              # Dependencies
├── tsconfig.json            # TypeScript config
├── tailwind.config.mjs      # Tailwind setup
├── README.md                # Documentation
├── src/
│   ├── content/
│   │   ├── config.ts        # Content collection schemas
│   │   ├── blog/           # Blog posts (5 existing)
│   │   ├── teachers/       # Teacher profiles
│   │   └── programs/       # Program descriptions
│   ├── data/               # Static JSON data
│   ├── layouts/            # Page layouts
│   └── pages/              # Route pages
├── public/
│   └── images/            # Static images
└── tina/
    └── config.ts          # TinaCMS configuration
```

## Next Steps

1. Install dependencies and test the setup
2. Migrate existing content to the new structure
3. Set up TinaCMS cloud account for production
4. Style the components to match brand
5. Deploy to hosting platform

## Benefits of This Approach

- **No Database Complexity**: Everything is file-based
- **Version Controlled**: All content in Git
- **Fast**: Static generation, no runtime queries
- **Simple**: Easy to understand and maintain
- **Flexible**: MDX allows rich content when needed
- **Editor-Friendly**: TinaCMS provides visual editing

This structure provides everything the school needs without unnecessary complexity.