# Information Flow Documentation

## Overview
This document explains how data flows through the Spicebush Montessori website, from user interactions to database storage and back to the UI. Understanding these flows is critical for debugging, extending functionality, and maintaining data integrity.

## Core Data Flow Patterns

### 1. Public Content Display Flow

```
Content Request Flow:
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Browser   │ --> │ Astro Router │ --> │ Page Component  │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                    │
                                          ┌─────────▼────────┐
                                          │ Content Loader   │
                                          └────────┬─────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────┐
                    ▼                              ▼                          ▼
         ┌──────────────────┐          ┌───────────────────┐      ┌──────────────────┐
         │ Markdown Files   │          │ Database Content  │      │ Static Assets    │
         │ (Blog, Staff)    │          │ (Hours, Tuition)  │      │ (Images, Files)  │
         └──────────────────┘          └───────────────────┘      └──────────────────┘
                    │                              │                          │
                    └──────────────────────────────┼──────────────────────────┘
                                                   ▼
                                          ┌─────────────────┐
                                          │ HTML Renderer   │
                                          └─────────────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │ Client Browser  │
                                          └─────────────────┘
```

### 2. Admin Content Creation Workflow

```
Admin Creates/Edits Content:
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Admin User  │ --> │  Auth Check  │ --> │  Admin Form     │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                    │
                                          ┌─────────▼────────┐
                                          │ Form Validation  │
                                          └────────┬─────────┘
                                                   │
                                          ┌─────────▼────────┐
                                          │ Content Handler  │
                                          └────────┬─────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────┐
                    ▼                              ▼                          ▼
         ┌──────────────────┐          ┌───────────────────┐      ┌──────────────────┐
         │ Write Markdown   │          │ Update Database   │      │ Upload Media     │
         │ (Blog, Photos)   │          │ (Supabase)        │      │ (Storage API)    │
         └──────────────────┘          └───────────────────┘      └──────────────────┘
                    │                              │                          │
                    └──────────────────────────────┼──────────────────────────┘
                                                   ▼
                                          ┌─────────────────┐
                                          │ Success/Error   │
                                          │    Response     │
                                          └─────────────────┘
```

### 3. User Authentication Flow

```
Authentication Process:
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│    User     │ --> │ Login Form   │ --> │ Auth Handler    │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                    │
                                          ┌─────────▼────────┐
                                          │ Supabase Auth   │
                                          └────────┬─────────┘
                                                   │
                           ┌───────────────────────┼───────────────────────┐
                           ▼                       ▼                       ▼
                 ┌──────────────────┐   ┌───────────────────┐   ┌──────────────────┐
                 │ Magic Link Email │   │ Password Verify   │   │ OAuth Provider   │
                 └──────────────────┘   └───────────────────┘   └──────────────────┘
                           │                       │                       │
                           └───────────────────────┼───────────────────────┘
                                                   ▼
                                          ┌─────────────────┐
                                          │ Create Session  │
                                          └────────┬────────┘
                                                   │
                                          ┌─────────▼────────┐
                                          │ Set Auth Cookie │
                                          └────────┬─────────┘
                                                   │
                                          ┌─────────▼────────┐
                                          │ Redirect User   │
                                          └─────────────────┘
```

## Specific Data Flows

### Blog Post Publishing

1. **Creation Phase**
   ```
   Admin Dashboard → Create Post Form → Validate Fields
                                    ↓
                          Save as Markdown File
                                    ↓
                          Update Blog Index Cache
   ```

2. **Display Phase**
   ```
   User Request → Route Match → Load Blog Collection
                            ↓
                    Parse Markdown → Apply Template
                                  ↓
                          Render HTML with SEO Meta
   ```

### Tuition Calculator Data Flow

1. **Data Loading**
   ```
   Calculator Component → Load Settings → Query Tuition Rates
                                     ↓
                            Filter Active Programs
                                     ↓
                          Present Options to User
   ```

2. **Calculation Process**
   ```
   User Inputs → Validate Data → Apply Business Rules
                             ↓
                    Calculate Base Tuition
                             ↓
                    Apply Discounts/Increases
                             ↓
                    Display Results
   ```

### Image Upload and Processing

1. **Upload Flow**
   ```
   Select Image → Validate File → Read EXIF Data
                              ↓
                      Generate Unique Filename
                              ↓
                      Process with Sharp
                              ↓
   Create Variants → Store in /public/images
                              ↓
                    Create Photo Entry
   ```

2. **Display Flow**
   ```
   Image Component → Load Photo Metadata → Select Best Variant
                                       ↓
                              Apply Focal Points
                                       ↓
                          Render Responsive Image
   ```

### Form Submission Pipeline

1. **Contact Form**
   ```
   User Fills Form → Client Validation → Submit to API
                                     ↓
                            Server Validation
                                     ↓
                          Store in Database
                                     ↓
                    Send Email Notification
                                     ↓
                    Return Confirmation
   ```

2. **Admin Forms**
   ```
   Admin Input → Auth Check → Validate Permissions
                          ↓
                    Process Form Data
                          ↓
                 Update Database/Files
                          ↓
                 Invalidate Caches
                          ↓
                 Show Success/Error
   ```

## Database Transaction Flows

### Read Operations
```sql
-- Public data flow
Request → PostgREST → Row Level Security → Filter Data → Return JSON

-- Admin data flow  
Request → Auth Token → Verify Admin → Full Access → Return Data
```

### Write Operations
```sql
-- Insert flow
Data → Validate → Begin Transaction → Insert → Update Timestamps → Commit

-- Update flow
Data → Find Record → Check Permissions → Update → Log Change → Commit
```

## Caching Strategy

### Build-Time Caching
- Static pages pre-rendered
- Markdown content parsed once
- Images optimized during build

### Runtime Caching
- Database queries cached in memory
- Session data in cookies
- Static assets with long TTL

## Error Handling Flows

### Client-Side Errors
```
Error Occurs → Catch Block → Log to Console
                          ↓
                  Show User Message
                          ↓
                  Fallback Content
```

### Server-Side Errors
```
Error Occurs → Error Boundary → Log to Server
                             ↓
                     Return Error Page
                             ↓
                  Send Alert (if critical)
```

## Security Checkpoints

### Authentication Gates
1. Route-level checks in middleware
2. Component-level permission checks
3. API endpoint authentication
4. Database RLS policies

### Data Validation Points
1. Client-side form validation
2. Server-side input sanitization
3. Database constraints
4. Business logic validation

## Performance Optimization Points

### Critical Render Path
```
Initial Request → Static HTML → Hydrate Islands → Load Images
                            ↓
                  Progressive Enhancement
```

### Lazy Loading Strategy
```
Page Load → Render Above Fold → Observer Init
                             ↓
                  Load on Scroll → Cache Results
```

## Monitoring and Logging

### User Activity Flow
```
User Action → Event Tracking → Analytics
                           ↓
                    Performance Metrics
```

### Error Tracking
```
Error → Capture Context → Log to File
                      ↓
              Alert if Critical
```

This information flow documentation provides a comprehensive view of how data moves through the Spicebush Montessori website system. Understanding these flows is essential for debugging issues, implementing new features, and maintaining system performance.