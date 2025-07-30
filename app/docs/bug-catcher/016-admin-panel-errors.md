---
id: 016
title: "Admin Panel Functionality Issues"
severity: high
status: open
category: functionality
affected_pages: ["/admin/*", "all admin routes"]
related_bugs: [015, 002, 019]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 016: Admin Panel Functionality Issues

## Description
The admin panel experiences multiple functionality issues including blank pages, failed data saves, permission errors, and UI components not loading. This prevents administrators from managing site content effectively.

## Steps to Reproduce
1. Login to admin panel
2. Navigate to any admin section
3. Attempt to edit content
4. Try to save changes
5. Experience various errors or blank pages

## Expected Behavior
- Admin panel loads completely
- All sections accessible with proper permissions
- Data saves successfully
- Real-time preview works
- No console errors

## Actual Behavior
- Some pages load blank
- Save operations fail silently
- Permission errors despite admin role
- Preview functionality broken
- Multiple console errors

## Admin Panel Issues
```
Functionality Audit:
1. Content Management
   - Blog editor: Save fails
   - Image upload: Times out
   - Settings: Not persisting
   - Preview: Shows blank

2. UI Components
   - Rich text editor: Not loading
   - Date pickers: Broken
   - Dropdowns: Empty options
   - Forms: Validation missing

3. Data Operations
   - Create: Inconsistent
   - Read: Missing data
   - Update: Silent failures
   - Delete: No confirmation

4. Navigation
   - Routes: Some 404
   - Breadcrumbs: Incorrect
   - Back button: Loses data
   - Deep links: Don't work

5. Performance
   - Load time: >5 seconds
   - Saves: >10 seconds
   - Search: Times out
   - Exports: Fail on large data
```

## Affected Files
- `/src/pages/admin/*.astro` - Admin pages
- `/src/components/admin/*.astro` - Admin components
- `/src/lib/admin-auth-check.ts` - Permission logic
- API endpoints for admin operations
- Admin-specific JavaScript bundles

## Potential Causes
1. **Component Loading Issues**
   - Client hydration failures
   - Missing dependencies
   - Race conditions

2. **API Failures**
   - Incorrect endpoints
   - Auth token issues
   - CORS problems

3. **State Management**
   - Lost form data
   - Stale cache
   - Conflicting updates

## Suggested Fixes

### Option 1: Robust Admin Layout with Error Boundaries
```astro
---
// AdminLayout.astro
import { checkAdminAuth } from '@lib/admin-auth-check';
import AdminErrorBoundary from '@components/admin/AdminErrorBoundary.astro';

const auth = await checkAdminAuth(Astro.cookies);

if (!auth.isAuthenticated) {
  return Astro.redirect('/auth/login?redirect=/admin');
}

// Prefetch common admin data
const [settings, stats, notifications] = await Promise.all([
  getAdminSettings().catch(() => null),
  getAdminStats().catch(() => null),
  getAdminNotifications(auth.user.id).catch(() => [])
]);
---

<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title} - Spicebush Admin</title>
    
    <!-- Preload critical assets -->
    <link rel="preload" href="/admin/admin.css" as="style" />
    <link rel="preload" href="/admin/admin.js" as="script" />
    
    <!-- Admin-specific styles -->
    <link rel="stylesheet" href="/admin/admin.css" />
  </head>
  <body>
    <div class="admin-wrapper">
      <!-- Admin header with user info -->
      <header class="admin-header">
        <div class="admin-logo">
          <a href="/admin">Spicebush Admin</a>
        </div>
        
        <nav class="admin-nav">
          <a href="/admin/content" class={path.includes('content') ? 'active' : ''}>
            Content
          </a>
          <a href="/admin/settings" class={path.includes('settings') ? 'active' : ''}>
            Settings
          </a>
          <a href="/admin/users" class={path.includes('users') ? 'active' : ''}>
            Users
          </a>
        </nav>
        
        <div class="admin-user">
          <span>{auth.user.email}</span>
          <button data-logout>Logout</button>
        </div>
      </header>

      <!-- Loading indicator -->
      <div class="admin-loading" data-loading hidden>
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>

      <!-- Main content with error boundary -->
      <main class="admin-main">
        <AdminErrorBoundary>
          <slot />
        </AdminErrorBoundary>
      </main>

      <!-- Toast notifications -->
      <div class="toast-container" data-toasts></div>
    </div>

    <!-- Admin JavaScript -->
    <script src="/admin/admin.js" type="module"></script>
    
    <!-- Error tracking -->
    <script>
      window.addEventListener('error', (event) => {
        console.error('Admin panel error:', event.error);
        
        // Send to error tracking service
        if (window.Sentry) {
          window.Sentry.captureException(event.error);
        }
        
        // Show user-friendly error
        showToast('An error occurred. Please refresh and try again.', 'error');
      });
      
      // Unsaved changes warning
      let hasUnsavedChanges = false;
      
      window.addEventListener('beforeunload', (event) => {
        if (hasUnsavedChanges) {
          event.preventDefault();
          event.returnValue = '';
        }
      });
    </script>
  </body>
</html>
```

### Option 2: Admin API Client with Retry Logic
```typescript
// src/lib/admin-api-client.ts
class AdminAPIClient {
  private baseURL = '/api/admin';
  private maxRetries = 3;
  private retryDelay = 1000;

  async request(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Add auth headers
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('X-CSRF-Token', await this.getCSRFToken());
    
    const token = this.getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Show loading indicator
    this.showLoading(true);

    try {
      let lastError;
      
      // Retry logic
      for (let i = 0; i < this.maxRetries; i++) {
        try {
          const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'same-origin'
          });

          if (!response.ok) {
            throw new APIError(
              `API Error: ${response.status}`,
              response.status,
              await response.text()
            );
          }

          const data = await response.json();
          this.showLoading(false);
          return data;
          
        } catch (error) {
          lastError = error;
          
          // Don't retry on client errors
          if (error instanceof APIError && error.status < 500) {
            throw error;
          }
          
          // Wait before retry
          if (i < this.maxRetries - 1) {
            await new Promise(resolve => 
              setTimeout(resolve, this.retryDelay * Math.pow(2, i))
            );
          }
        }
      }
      
      throw lastError;
      
    } catch (error) {
      this.showLoading(false);
      this.handleError(error);
      throw error;
    }
  }

  async saveContent(
    type: string, 
    id: string, 
    data: any,
    options: SaveOptions = {}
  ): Promise<any> {
    // Validate data before sending
    const validation = this.validateContent(type, data);
    if (!validation.valid) {
      throw new ValidationError(validation.errors);
    }

    // Optimistic update
    if (options.optimistic) {
      this.updateLocalCache(type, id, data);
    }

    try {
      const result = await this.request(`/content/${type}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });

      // Show success message
      this.showToast('Content saved successfully', 'success');
      
      // Clear unsaved changes flag
      window.hasUnsavedChanges = false;
      
      return result;
      
    } catch (error) {
      // Revert optimistic update
      if (options.optimistic) {
        this.revertLocalCache(type, id);
      }
      
      throw error;
    }
  }

  private handleError(error: any) {
    console.error('Admin API Error:', error);

    let message = 'An error occurred. Please try again.';
    
    if (error instanceof APIError) {
      switch (error.status) {
        case 401:
          message = 'Your session has expired. Please log in again.';
          setTimeout(() => window.location.href = '/auth/login', 2000);
          break;
        case 403:
          message = 'You do not have permission to perform this action.';
          break;
        case 404:
          message = 'The requested resource was not found.';
          break;
        case 422:
          message = 'Please check your input and try again.';
          break;
        case 500:
          message = 'Server error. Our team has been notified.';
          break;
      }
    }

    this.showToast(message, 'error');
  }

  private showLoading(show: boolean) {
    const loader = document.querySelector('[data-loading]');
    if (loader) {
      loader.hidden = !show;
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'info') {
    const container = document.querySelector('[data-toasts]');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }
}

class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public response: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export const adminAPI = new AdminAPIClient();
```

### Option 3: Auto-Save and Recovery System
```typescript
// src/lib/admin-autosave.ts
class AutoSaveManager {
  private saveQueue = new Map<string, any>();
  private saveInterval = 30000; // 30 seconds
  private localStorageKey = 'admin-autosave';
  private saveTimer?: number;

  constructor() {
    this.startAutoSave();
    this.restoreFromLocalStorage();
  }

  trackForm(formId: string, getData: () => any) {
    const form = document.getElementById(formId);
    if (!form) return;

    // Track changes
    form.addEventListener('input', () => {
      const data = getData();
      this.queueSave(formId, data);
      window.hasUnsavedChanges = true;
    });

    // Save on blur
    form.addEventListener('focusout', () => {
      this.saveNow();
    });
  }

  queueSave(id: string, data: any) {
    this.saveQueue.set(id, {
      data,
      timestamp: Date.now()
    });

    // Save to localStorage immediately
    this.saveToLocalStorage();
  }

  private async saveNow() {
    if (this.saveQueue.size === 0) return;

    const saves = Array.from(this.saveQueue.entries()).map(
      async ([id, { data }]) => {
        try {
          await adminAPI.saveContent('draft', id, data, {
            optimistic: false
          });
          
          // Remove from queue on success
          this.saveQueue.delete(id);
          
        } catch (error) {
          console.error(`Failed to auto-save ${id}:`, error);
          // Keep in queue for retry
        }
      }
    );

    await Promise.allSettled(saves);
    this.saveToLocalStorage();
  }

  private saveToLocalStorage() {
    const data = Object.fromEntries(this.saveQueue);
    localStorage.setItem(this.localStorageKey, JSON.stringify(data));
  }

  private restoreFromLocalStorage() {
    try {
      const saved = localStorage.getItem(this.localStorageKey);
      if (!saved) return;

      const data = JSON.parse(saved);
      const now = Date.now();

      // Restore saves less than 24 hours old
      Object.entries(data).forEach(([id, item]: [string, any]) => {
        if (now - item.timestamp < 24 * 60 * 60 * 1000) {
          this.saveQueue.set(id, item);
          
          // Notify user of recovered data
          this.notifyRecoveredData(id);
        }
      });
    } catch (error) {
      console.error('Failed to restore auto-save data:', error);
    }
  }

  private notifyRecoveredData(id: string) {
    const notification = document.createElement('div');
    notification.className = 'recovery-notification';
    notification.innerHTML = `
      <p>Unsaved changes found for ${id}</p>
      <button onclick="autoSave.restore('${id}')">Restore</button>
      <button onclick="autoSave.discard('${id}')">Discard</button>
    `;
    
    document.body.appendChild(notification);
  }

  restore(id: string) {
    const saved = this.saveQueue.get(id);
    if (!saved) return;

    // Emit event for form to handle
    window.dispatchEvent(new CustomEvent('autosave:restore', {
      detail: { id, data: saved.data }
    }));
  }

  discard(id: string) {
    this.saveQueue.delete(id);
    this.saveToLocalStorage();
  }

  private startAutoSave() {
    this.saveTimer = window.setInterval(() => {
      this.saveNow();
    }, this.saveInterval);
  }

  destroy() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }
  }
}

export const autoSave = new AutoSaveManager();
```

## Testing Requirements
1. Test all admin panel sections
2. Verify data saves correctly
3. Test permission boundaries
4. Check error recovery
5. Test auto-save functionality
6. Verify preview updates
7. Load test with large datasets

## Related Issues
- Bug #015: Auth affects admin access
- Bug #002: Server errors in admin API
- Bug #019: API endpoint issues

## Additional Notes
- Consider upgrading to dedicated admin framework
- Implement comprehensive audit logging
- Add role-based permissions
- Create admin panel documentation
- Regular admin UX reviews needed
- Monitor admin panel performance