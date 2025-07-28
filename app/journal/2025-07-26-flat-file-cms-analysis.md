# Flat File CMS Analysis for Spicebush Montessori
*Date: July 26, 2025*
*Purpose: Evaluate flat file CMS options to reduce complexity while maintaining functionality*

## Current Architecture Analysis

### What We Have Now
1. **Supabase**: Handling critical dynamic data
   - User authentication
   - Tuition calculator rates
   - Admin settings
   - Real-time data needs

2. **Strapi**: Currently only used for blog posts
   - 5 blog posts total
   - Running as separate Docker service
   - Adds significant complexity for minimal benefit
   - Requires maintenance and updates

3. **Static Content**: Already in Astro components
   - School information
   - Program descriptions
   - Static pages

## Critical vs Non-Critical Data Classification

### Critical Data (Keep in Supabase)
- User authentication and sessions
- Tuition rates and calculator logic
- Admin permissions
- Form submissions (contact, tour requests)
- Dynamic settings that affect functionality

### Non-Critical Data (Can Use Flat File CMS)
- Blog posts and articles
- News and announcements
- Photo galleries
- Staff bios
- Event descriptions
- Resource library content
- General page content updates

## Flat File CMS Options Analysis

### 1. MDX (Markdown + JSX) - Built into Astro
**Pros:**
- Zero additional dependencies
- Already supported by Astro
- Version controlled with Git
- Can include React components
- Fast build times
- No runtime overhead

**Cons:**
- Requires Git knowledge for content updates
- No GUI for non-technical users
- Manual image management

**Best For:** Developer-managed content, documentation

**Implementation Effort:** Minimal (1-2 days)

### 2. Decap CMS (formerly Netlify CMS)
**Pros:**
- Open source and free
- Git-based (content stored as markdown)
- Web-based admin interface
- Works with any static site generator
- No database required
- Supports custom widgets
- Media library management
- Editorial workflow with drafts

**Cons:**
- Requires OAuth setup for authentication
- Limited to Git-based workflows
- Can be slow with large media libraries

**Best For:** Non-technical users who need GUI

**Implementation Effort:** Moderate (3-5 days)

### 3. Keystatic
**Pros:**
- Modern, TypeScript-first
- Local development GUI
- Git-based storage
- Great developer experience
- Built for React/Astro
- Type-safe content schemas
- Live preview

**Cons:**
- Newer, smaller community
- Requires Node.js for local editing
- Cloud version is paid

**Best For:** Technical teams wanting modern DX

**Implementation Effort:** Moderate (3-5 days)

### 4. TinaCMS
**Pros:**
- Visual editing on the actual site
- Git-based or cloud storage
- Great user experience
- MDX support
- Real-time preview

**Cons:**
- Only 2 free users (major limitation for Spicebush)
- Cloud features require subscription
- More complex setup

**Best For:** Sites needing visual editing

**Implementation Effort:** High (5-7 days)

### 5. JSON/YAML Files
**Pros:**
- Simplest possible solution
- No dependencies
- Can build simple admin UI
- Complete control

**Cons:**
- No built-in editor
- Need to build admin interface
- No media management

**Best For:** Structured data (hours, rates)

**Implementation Effort:** Low for data, High for admin UI

## Recommendation: Hybrid Approach

### Phase 1: Immediate (Replace Strapi)
**Use MDX for blog posts**
- Migrate 5 existing blog posts to MDX
- Remove Strapi completely
- Reduces Docker complexity immediately
- Can be done in 1 day

### Phase 2: Short Term (Admin Interface)
**Add Decap CMS for non-technical users**
- Free and open source
- Provides GUI for content editing
- Works with MDX files
- Handles media uploads
- Implementation: 3-5 days

### Phase 3: Structured Data
**Use JSON files for semi-static data**
- School hours
- Contact information
- Simple data that rarely changes
- Build simple admin forms in existing admin panel

## Implementation Plan

### Step 1: Migrate Blog from Strapi to MDX (Day 1)
```
1. Create /src/content/blog/ directory
2. Export existing blog posts from Strapi
3. Convert to MDX format
4. Update blog listing page
5. Remove Strapi from docker-compose.yml
```

### Step 2: Set Up Basic MDX Collections (Day 2)
```
1. Configure Astro content collections
2. Create schemas for blog posts
3. Add frontmatter validation
4. Test blog functionality
```

### Step 3: Add Decap CMS (Days 3-5)
```
1. Install Decap CMS
2. Configure authentication (GitHub OAuth)
3. Set up content models
4. Create editorial workflow
5. Test with non-technical user
```

### Step 4: Migrate Semi-Static Data (Day 6)
```
1. Move school hours to JSON
2. Move contact info to JSON
3. Create admin UI for editing
4. Test data updates
```

## Benefits of This Approach

1. **Immediate Complexity Reduction**
   - Remove Strapi and its Docker container
   - Fewer moving parts
   - Simpler deployment

2. **Better Performance**
   - No API calls for blog posts
   - Static generation at build time
   - Faster page loads

3. **Cost Effective**
   - No CMS hosting costs
   - No user limits with Decap CMS
   - Uses existing GitHub for storage

4. **Developer Friendly**
   - Content version controlled
   - Easy rollbacks
   - Works with existing workflow

5. **User Friendly**
   - Decap provides GUI for non-technical users
   - Familiar editing interface
   - Preview capabilities

## Migration Checklist

- [ ] Export all blog posts from Strapi
- [ ] Set up MDX content collections
- [ ] Migrate blog posts to MDX
- [ ] Update blog pages to use MDX
- [ ] Remove Strapi from docker-compose
- [ ] Install and configure Decap CMS
- [ ] Set up GitHub OAuth
- [ ] Create content models in Decap
- [ ] Test content editing workflow
- [ ] Train staff on new system
- [ ] Document the new process

## Risks and Mitigation

1. **Risk:** Staff unfamiliar with new system
   **Mitigation:** Provide training, create documentation

2. **Risk:** Loss of Strapi features
   **Mitigation:** Most features unused, MDX provides what's needed

3. **Risk:** Git conflicts with multiple editors
   **Mitigation:** Decap handles this with editorial workflow

## Conclusion

Moving from Strapi to MDX + Decap CMS will:
- Reduce complexity significantly
- Maintain all current functionality
- Provide better performance
- Save on hosting costs
- Give non-technical users a GUI
- Make the system more maintainable

This is the pragmatic solution that fits Spicebush's actual needs without over-engineering.