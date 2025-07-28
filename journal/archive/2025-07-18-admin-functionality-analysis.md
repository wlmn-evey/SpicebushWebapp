# Admin Functionality Analysis - Spicebush Webapp
Date: 2025-07-18

## Executive Summary
The Spicebush webapp includes a comprehensive admin panel built into the Astro application. This analysis documents all admin functionality to help determine what should be migrated to Strapi.

## Admin Dashboard Structure

### 1. Authentication & Authorization

**Authentication System:**
- Uses Supabase Auth for user management
- Admin check is performed via email domain validation in `/app/src/lib/supabase.ts`
- Admin criteria:
  - Email contains `@spicebushmontessori.org`
  - Email is `admin@spicebushmontessori.test`
  - Email starts with `admin@`
  - Email is `evey@eveywinters.com`

**Auth Pages:**
- `/auth/login.astro` - Login page
- `/auth/register.astro` - Registration
- `/auth/forgot-password.astro` - Password reset
- `/auth/update-password.astro` - Password update

### 2. Admin Pages Overview

Located in `/app/src/pages/admin/`:

#### a) **Main Dashboard** (`/admin/index.astro`)
- Overview statistics:
  - Active Programs count
  - Tuition Rates count
  - Teacher Leaders count
  - System status indicator
- Quick Actions:
  - Add Holiday
  - Send Message
  - Generate Report
- Analytics Overview:
  - Website Visitors (with trend)
  - Tuition Calculator Uses
  - Contact Inquiries
  - Tour Requests
- Recent Activity Feed showing:
  - School hours updates
  - Tuition rate adjustments
  - Messages sent
  - New family enrollments

#### b) **School Hours Management** (`/admin/hours.astro`)
- Manage daily school schedules
- Before/after care times configuration
- Holiday closures management
- Special messages for the community
- Database table: `school_hours`

#### c) **Tuition & Programs** (`/admin/tuition.astro`)
- Components used:
  - `TuitionQuickActions.astro`
  - `ProgramsManagement.astro`
  - `TuitionRatesTable.astro`
  - `TuitionSettings.astro`
- Features:
  - Update tuition rates
  - Manage program offerings
  - Configure calculator settings
  - Sliding scale system management
- Database tables: `tuition_programs`, `tuition_rates`

#### d) **Teacher Leaders** (`/admin/teachers.astro`)
- Manage teacher profiles
- Edit bios and descriptions
- Upload/manage profile photos
- Control display order
- Active/inactive status management
- Database table: `teacher_leaders`

#### e) **User Management** (`/admin/users.astro`)
- Manage user accounts
- Family information
- Permissions management
- User search and filtering
- Add/edit/delete users

#### f) **Communications Center** (`/admin/communications.astro`)
- Send announcements to families
- Newsletter management
- Message history
- Recipient management

#### g) **Analytics Dashboard** (`/admin/analytics.astro`)
- Website performance metrics
- Enrollment trends
- Usage statistics
- Report generation
- Data visualization

#### h) **System Settings** (`/admin/settings.astro`)
- Components used:
  - `ImageManagementSettings.astro`
- Configuration options:
  - Security preferences
  - API keys management
  - Image management settings
  - Analytics configuration (Google Analytics, Tag Manager)
  - Payment settings (Stripe integration)
  - Social media links
  - School information
- Database table: `admin_settings`

### 3. Admin Components

Located in `/app/src/components/admin/`:

- **ImageManagementSettings.astro** - Image upload and management configuration
- **ProgramsManagement.astro** - CRUD operations for programs
- **TuitionQuickActions.astro** - Quick action buttons for common tuition tasks
- **TuitionRatesTable.astro** - Display and edit tuition rates in table format
- **TuitionSettings.astro** - Configure tuition calculator settings

### 4. Supporting Components

- **AdminNav.astro** - Admin sidebar navigation
- **AdminImageOverlay.astro** - Image management overlay interface
- **AuthNav.astro** - Authentication navigation
- **AuthForm.astro** - Reusable authentication form

### 5. Database Tables Managed by Admin

From migration files analysis:
- `school_hours` - Daily schedules and holiday closures
- `tuition_programs` - Program offerings (Half Day, Full Day, etc.)
- `tuition_rates` - Tuition pricing by program and hours
- `teacher_leaders` - Staff profiles and information
- `admin_settings` - System configuration (JSON storage)
- `managed_images` - Image management tracking

### 6. Key Features by Category

**Content Management:**
- Teacher profiles (bios, photos, contact info)
- School hours and schedules
- Holiday closures
- Special announcements

**Financial Management:**
- Tuition rates configuration
- Program offerings
- Sliding scale calculator settings
- Payment processor integration (Stripe)

**Communication:**
- Family announcements
- Newsletter management
- Contact form submissions

**Analytics & Reporting:**
- Website traffic metrics
- Enrollment statistics
- Tuition calculator usage
- Custom report generation

**System Configuration:**
- API keys (Analytics, Payment, etc.)
- Image optimization settings
- Security preferences
- Social media links

## Recommendations for Strapi Migration

Based on this analysis, the following admin features would be good candidates for Strapi migration:

1. **Content Management** - Teacher profiles, announcements, newsletters
2. **School Information** - Hours, programs, holiday schedules
3. **Media Management** - Teacher photos, gallery images

Features that should likely remain in the Astro app:
1. **User Authentication** - Already integrated with Supabase
2. **Analytics Dashboard** - Real-time data visualization
3. **Payment Configuration** - Sensitive API keys and settings
4. **Tuition Calculator Logic** - Complex calculations better suited for custom code

## Notes
- The admin panel is fully integrated with Supabase for data storage
- Authentication is role-based using email domain validation
- All admin pages include auth checks to prevent unauthorized access
- The UI uses consistent styling with the Spicebush brand colors