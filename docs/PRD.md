# Product Requirements Document — Spicebush Montessori Website

*Canonical source of truth for what this product is, who it serves, and what it does.*
*Last verified against codebase: April 5, 2026*

---

## 1. Product Summary

The Spicebush Montessori website is the public-facing web presence for Spicebush Montessori School. It serves two audiences: **parents and prospective families** visiting the public site, and **school administrators** managing content and operations through a private admin panel.

**Live URL**: https://spicebushmontessori.org

---

## 2. Users

### Parents & Prospective Families (Public)
- Browse school information (programs, philosophy, staff, policies)
- View school hours and schedule exceptions
- Use the tuition calculator to estimate costs
- Submit contact forms and tour requests
- Access summer camp information and enrollment links
- Make donations via external link
- Start enrollment via external link (Transparent Classroom)

### School Administrators (Authenticated)
- Manage all CMS content (pages, settings, SEO metadata)
- Manage staff profiles, hours, tuition settings, and FAQs
- Manage summer camp seasons, weeks, seat availability, and mode
- Manage school announcements and schedule exceptions
- View and export contact form submissions
- View donation records and analytics
- Upload and manage media assets
- Control coming-soon mode and camp mode
- Send test emails and manage communication templates

---

## 3. Core Features (Active Scope)

### 3.1 Public Website

#### Homepage
- Hero section with school branding
- Value propositions and trust indicators
- Featured teachers section
- Programs overview
- Testimonials
- Camp promotion module (when camp mode is active or in prep)
- Announcement bar (for active school announcements)

#### Informational Pages
- **About** — school philosophy and history
- **Programs** — program descriptions and age groups
- **Our Principles** — Montessori educational approach
- **Resources** — parent resources
- **Policies** — school policies overview
- **Privacy Policy**, **Non-Discrimination Policy**, **Accessibility** — compliance pages

#### Contact & Tours
- Contact form with multi-layered bot protection (honeypot, timing check, Turnstile CAPTCHA, rate limiting)
- Tour scheduling request form
- Contact success confirmation page
- All form submissions stored in database with attribution tracking (UTM, referrer, session)

#### Hours Widget
- Displays current school hours by day of week
- Highlights today's hours
- Shows Friday early closing (3 PM)
- Respects schedule exceptions (closures, modified hours)

#### Tuition Calculator
- React interactive island component
- Calculates estimated tuition based on program type and household income
- Uses sliding-scale discount tiers from database
- Admin-configurable base rates and discount brackets

#### Summer Camp (`/camp`)
- Camp landing page with season info, week cards, and seat availability
- Per-week status chips: Open, Limited, Full, Waitlist, Closed
- Enrollment links to Transparent Classroom (per-week)
- Camp coming-soon page (`/camp-coming-soon`) when camp is inactive
- Sitewide promotional modules when camp promotions are enabled

#### Donations & Enrollment
- External link placeholders managed via admin settings
- Currently redirect to `/contact` if external links are not yet configured
- Intended to link to external donation platform and Transparent Classroom enrollment

#### Coming-Soon Mode
- Full-site coming-soon gate controlled by database setting or environment variable
- Admin bypass via authenticated session
- Preview mode for admins to see the site while public sees coming-soon page

#### SEO
- Per-page SEO metadata (title, description, OG tags) managed via admin
- Robots.txt dynamically generated
- Camp pages indexed only when camp mode is active

### 3.2 Admin Panel (`/admin/*`)

All admin pages are auth-gated via magic-link session authentication.

| Module | Path | Purpose |
|--------|------|---------|
| Dashboard | `/admin` | Overview and quick links |
| Hours | `/admin/hours` | Manage school hours by day of week |
| Staff | `/admin/staff` | Manage teacher/staff profiles |
| Tuition | `/admin/tuition` | Manage base rates and discount brackets |
| Camp | `/admin/camp` | Manage camp seasons, weeks, seats, mode |
| Announcements | `/admin/announcements` | School announcements and schedule exceptions |
| Settings | `/admin/settings` | Site-wide settings (coming-soon, external links, camp mode, etc.) |
| SEO | `/admin/seo` | Per-page SEO metadata management |
| FAQ | `/admin/faq` | Manage FAQ content |
| Contact Submissions | `/admin/contact-submissions` | View and export contact form entries |
| Donations | `/admin/donations` | View donation records |
| Media | `/admin/media` | Upload and manage images/media |
| Testimonials | `/admin/testimonials` | Manage parent testimonials |

### 3.3 Analytics & Tracking
- Custom analytics event tracking (page views, form submissions, camp clicks)
- Ad spend tracking and campaign value reporting
- GA4 reporting integration
- Attribution data captured on contact form submissions

### 3.4 Email System
- Magic-link delivery for admin authentication
- Contact form confirmation emails
- Donation thank-you emails
- Announcement notification emails
- Tour request confirmation emails
- Configurable email provider (Resend, SendGrid, Postmark, Unione)

---

## 4. Camp Mode System

Camp mode is a central product concept that controls seasonal camp visibility across the entire site.

### Mode States
| Mode | Public Behavior | Admin Behavior |
|------|----------------|----------------|
| `on` | Camp pages visible, promotions active | Full access |
| `off` | Camp pages redirect to coming-soon | Full access |
| `prep` | Camp pages redirect to coming-soon | Full access (preview) |
| `auto` | Active only within configured date window | Full access |

### Seat Status Logic
Each camp week computes availability: `available = capacity_total - seats_confirmed - seats_held`

Status precedence: closed > waitlist > full > limited > open

### Promotion Zones
When camp promotions are enabled, promotional content appears on: announcement bar, homepage, programs page, tuition page, and contact page.

---

## 5. Out of Scope (Current Phase)

These features are explicitly deferred and not part of active development:

- **Public blog** — content may exist in DB but blog UI is removed/redirected
- **Newsletter / mailing list capture** — removed from active scope
- **Stripe / payment processing** — deferred; donation and enrollment use external links
- **On-site enrollment checkout** — Transparent Classroom is the system of record

---

## 6. Business Constraints

- **Enrollment is external**: Transparent Classroom owns the enrollment workflow. The website links to it but never processes enrollment directly.
- **Single school**: This is not a multi-tenant system. All content and settings serve one school.
- **Mobile-first**: Parent-facing pages must be fast and readable on mobile devices.
- **Admin users are non-technical**: The admin panel must be usable by school staff without developer assistance.
- **Seasonal operations**: Camp and announcements are inherently seasonal; the system must handle time-windowed visibility cleanly.

---

## 7. Success Criteria

- Public site loads quickly and is accessible (WCAG AA compliance target)
- Contact forms reliably deliver submissions to the database and send confirmation emails
- Admin panel allows school staff to manage all content without developer intervention
- Camp mode transitions work correctly with no redirect loops
- Seat availability is accurate and updates reflect in both admin and public views
- Coming-soon mode fully gates the site for non-admins when enabled
- All admin routes are inaccessible to unauthenticated users
