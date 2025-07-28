# Coming Soon Mode - Architectural Blueprint
Date: 2025-07-27
Architect: Claude (Project Architect)

## Executive Summary

This blueprint outlines the design and implementation of a "Coming Soon" mode feature for the Spicebush Montessori website. The feature will allow administrators to toggle the entire site into a maintenance/coming soon state through the Decap CMS interface, while maintaining admin preview access to the actual site content.

## Project Scope and Objectives

### Primary Requirements
1. Toggle control through Decap CMS admin interface
2. Professional coming soon page display when enabled
3. Admin users can preview actual site while in coming soon mode
4. Configurable content for coming soon page (launch date, contact info, newsletter)
5. Seamless integration with existing authentication system

### Technical Goals
- Minimal performance impact
- Clean separation between coming soon logic and site content
- Maintainable and extensible architecture
- Graceful fallback behavior

## Architectural Overview

### High-Level Components

```
┌─────────────────────────────────────────────────────────┐
│                   Decap CMS Admin                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │    Site Settings Collection                      │   │
│  │    - coming_soon_enabled (boolean)              │   │
│  │    - coming_soon_launch_date                    │   │
│  │    - coming_soon_message                        │   │
│  │    - coming_soon_newsletter_enabled             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 Astro Middleware Layer                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │    coming-soon.ts middleware                    │   │
│  │    - Check coming_soon_enabled setting          │   │
│  │    - Verify admin authentication status         │   │
│  │    - Route to appropriate view                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    ▼               ▼
        ┌───────────────────┐   ┌────────────────────┐
        │  Coming Soon Page  │   │   Regular Site     │
        │  (Public View)     │   │  (Admin Preview)   │
        └───────────────────┘   └────────────────────┘
```

### Component Interactions

1. **CMS Configuration** → Stores coming soon settings
2. **Middleware** → Intercepts all requests and checks settings
3. **Authentication Check** → Determines if user has admin access
4. **View Router** → Directs to coming soon page or actual site

## Detailed Implementation Plan

### Phase 1: CMS Configuration Setup

#### 1.1 Extend Settings Collection Schema

Location: `/public/admin/config.yml`

```yaml
# Add to existing school_settings collection
fields:
  # ... existing fields ...
  
  # Coming Soon Mode Settings
  - label: "Coming Soon Mode"
    name: "coming_soon_settings"
    widget: "object"
    fields:
      - {label: "Enable Coming Soon Mode", name: "enabled", widget: "boolean", default: false}
      - {label: "Expected Launch Date", name: "launch_date", widget: "datetime", required: false}
      - {label: "Coming Soon Message", name: "message", widget: "text", default: "We're working hard to bring you something amazing!"}
      - {label: "Show Newsletter Signup", name: "newsletter_enabled", widget: "boolean", default: true}
      - {label: "Newsletter Provider", name: "newsletter_provider", widget: "select", options: ["mailchimp", "convertkit", "custom"], default: "mailchimp"}
      - {label: "Newsletter Form ID", name: "newsletter_form_id", widget: "string", required: false}
      - {label: "Contact Email", name: "contact_email", widget: "string", default: "info@spicebushmontessori.org"}
      - {label: "Contact Phone", name: "contact_phone", widget: "string", default: "(XXX) XXX-XXXX"}
```

#### 1.2 Create Settings Entry File

Location: `/src/content/settings/coming-soon-mode.md`

```markdown
---
name: "Coming Soon Mode"
key: "coming_soon_mode"
value: "false"
description: "Toggle site-wide coming soon mode"
type: "boolean"
coming_soon_settings:
  enabled: false
  launch_date: null
  message: "We're working hard to bring you something amazing!"
  newsletter_enabled: true
  newsletter_provider: "mailchimp"
  newsletter_form_id: ""
  contact_email: "info@spicebushmontessori.org"
  contact_phone: "(XXX) XXX-XXXX"
---
```

### Phase 2: Middleware Implementation

#### 2.1 Create Middleware Infrastructure

Since Astro is configured for static output, we need to modify this to support middleware:

1. Update `astro.config.mjs` to use hybrid/server output
2. Create middleware file structure
3. Implement coming soon logic

#### 2.2 Middleware Logic Pseudocode

```typescript
// src/middleware.ts
interface ComingSoonSettings {
  enabled: boolean;
  launch_date?: string;
  message: string;
  newsletter_enabled: boolean;
  contact_email: string;
  contact_phone: string;
}

async function comingSoonMiddleware(context, next) {
  // 1. Get coming soon settings from content collection
  const settings = await getComingSoonSettings();
  
  // 2. Check if coming soon mode is enabled
  if (!settings.enabled) {
    return next(); // Continue to normal site
  }
  
  // 3. Check if user is authenticated admin
  const isAdmin = await checkAdminAuth(context.request);
  
  // 4. Allow admin preview with query parameter
  const isPreview = context.url.searchParams.get('preview') === 'true';
  
  if (isAdmin && isPreview) {
    // Add banner indicator for admin preview
    context.locals.showPreviewBanner = true;
    return next();
  }
  
  // 5. Redirect to coming soon page for all other requests
  // Exception: Allow access to auth pages and assets
  const allowedPaths = ['/auth/', '/admin/', '/_astro/', '/favicon'];
  const isAllowedPath = allowedPaths.some(path => 
    context.url.pathname.startsWith(path)
  );
  
  if (isAllowedPath) {
    return next();
  }
  
  // 6. Return coming soon page
  return Response.redirect('/coming-soon');
}
```

### Phase 3: Coming Soon Page Design

#### 3.1 Page Structure

Location: `/src/pages/coming-soon.astro`

```astro
---
// Component imports and data fetching
import Layout from '../layouts/Layout.astro';
import OptimizedImage from '../components/OptimizedImage.astro';
import NewsletterSignup from '../components/NewsletterSignup.astro';

// Get settings from content collection
const settings = await getComingSoonSettings();
---

<Layout title="Coming Soon - Spicebush Montessori">
  <main class="coming-soon-container">
    <!-- Logo Section -->
    <div class="logo-section">
      <OptimizedImage 
        src="/SpicebushLogo-03.png"
        alt="Spicebush Montessori"
        class="logo"
      />
    </div>
    
    <!-- Main Content -->
    <div class="content-section">
      <h1>Coming Soon</h1>
      <p class="message">{settings.message}</p>
      
      {settings.launch_date && (
        <div class="launch-date">
          <p>Expected Launch:</p>
          <time>{formatDate(settings.launch_date)}</time>
        </div>
      )}
    </div>
    
    <!-- Newsletter Section -->
    {settings.newsletter_enabled && (
      <NewsletterSignup 
        provider={settings.newsletter_provider}
        formId={settings.newsletter_form_id}
      />
    )}
    
    <!-- Contact Information -->
    <div class="contact-section">
      <h2>Contact Us</h2>
      <p>
        <a href={`mailto:${settings.contact_email}`}>
          {settings.contact_email}
        </a>
      </p>
      <p>{settings.contact_phone}</p>
    </div>
  </main>
</Layout>
```

#### 3.2 Styling Considerations

- Centered, minimalist design
- School brand colors and typography
- Responsive layout for all devices
- Subtle animations for engagement
- Accessibility compliant

### Phase 4: Admin Preview Implementation

#### 4.1 Preview Banner Component

Location: `/src/components/AdminPreviewBanner.astro`

```astro
---
const { showBanner } = Astro.props;
---

{showBanner && (
  <div class="admin-preview-banner">
    <p>
      🔍 Preview Mode - Site is in Coming Soon mode
      <a href="/admin/settings">Manage Settings</a>
    </p>
    <button onclick="window.location.href='/'">
      Exit Preview
    </button>
  </div>
)}
```

#### 4.2 Integration with Existing Layouts

Modify main layout to include preview banner when in preview mode.

### Phase 5: Testing and Quality Assurance

#### 5.1 Test Scenarios

1. **Toggle Activation**
   - Enable coming soon mode via CMS
   - Verify immediate effect on site
   - Test disable functionality

2. **Public Access**
   - Verify coming soon page displays
   - Test all routes redirect properly
   - Ensure assets still load

3. **Admin Preview**
   - Test admin authentication flow
   - Verify preview parameter functionality
   - Check preview banner display

4. **Content Updates**
   - Update coming soon message
   - Change launch date
   - Toggle newsletter feature

5. **Edge Cases**
   - Direct URL access attempts
   - SEO crawler behavior
   - API endpoint access

#### 5.2 Performance Validation

- Middleware execution time < 10ms
- No impact on static asset serving
- Efficient settings retrieval caching

## Implementation Roadmap

### Tasks Breakdown

1. **CMS Configuration** (2 hours)
   - Update config.yml schema
   - Create settings markdown file
   - Test CMS interface updates

2. **Middleware Development** (4 hours)
   - Convert to hybrid/server output
   - Implement middleware logic
   - Add authentication checks
   - Create preview functionality

3. **Coming Soon Page** (3 hours)
   - Design and implement page
   - Create newsletter component
   - Style and responsive design
   - Add animations

4. **Admin Preview Features** (2 hours)
   - Build preview banner
   - Integrate with layouts
   - Add preview controls

5. **Testing & Documentation** (2 hours)
   - Write test cases
   - Perform QA testing
   - Create admin documentation

### Total Estimated Time: 13 hours

## Risk Mitigation

### Identified Risks

1. **Static vs Server Output**
   - Risk: Performance impact of server rendering
   - Mitigation: Use edge functions or static generation with revalidation

2. **Cache Invalidation**
   - Risk: Settings changes not reflecting immediately
   - Mitigation: Implement cache busting strategy

3. **SEO Impact**
   - Risk: Search engines indexing coming soon page
   - Mitigation: Proper meta tags and robots.txt handling

4. **Authentication Edge Cases**
   - Risk: Admin lockout scenarios
   - Mitigation: Fallback authentication methods

## Success Metrics

1. Toggle activation time < 1 second
2. Zero downtime during mode switches
3. Admin preview load time < 2 seconds
4. 100% mobile responsive design
5. Accessibility score > 95

## Architecture Benefits

- **Separation of Concerns**: Coming soon logic isolated from main site
- **Scalability**: Easy to extend with additional features
- **Maintainability**: Clear code organization and documentation
- **Security**: Proper authentication and authorization checks
- **Performance**: Minimal overhead when feature is disabled

## Next Steps

1. Review and approve architectural design
2. Set up development environment
3. Begin Phase 1 implementation
4. Establish testing protocols
5. Schedule deployment window

---

This blueprint provides a comprehensive foundation for implementing the Coming Soon mode feature while maintaining code quality, performance, and user experience standards.