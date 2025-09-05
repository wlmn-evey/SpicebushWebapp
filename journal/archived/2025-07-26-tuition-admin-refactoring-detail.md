# Tuition Admin Page Detailed Refactoring Plan

## Current State Analysis

The tuition admin page (`/src/pages/admin/tuition.astro`) is the most complex component in the codebase with a complexity score of 59. Here's what makes it so complex:

### Code Smells Identified

1. **God Object Anti-Pattern**
   - 317 lines in a single file
   - Handles authentication, data loading, form creation, validation, submission, and UI updates
   - 15+ global functions attached to window object

2. **Tight Coupling**
   - Direct Supabase calls mixed with UI logic
   - Form HTML generated as strings in JavaScript
   - Event handlers referencing specific DOM IDs

3. **Poor Separation of Concerns**
   ```javascript
   // Example of mixed concerns:
   document.addEventListener('submit', async function(e) {
     if (e.target.id === 'program-form') {
       e.preventDefault();
       const formData = new FormData(e.target);
       // 30+ lines of validation, data transformation, API calls, and UI updates
     }
   });
   ```

4. **Repetitive Code**
   - Similar form handling logic repeated for programs, rates, and settings
   - Manual form field extraction for each form type
   - Duplicate error handling patterns

## Refactoring Strategy

### Step 1: Extract Data Layer

Create `/src/lib/api/tuition-api.ts`:

```typescript
import { supabase } from '../supabase';
import type { Database } from '../types/database';

type Program = Database['public']['Tables']['tuition_programs']['Row'];
type Rate = Database['public']['Tables']['tuition_rates']['Row'];
type Setting = Database['public']['Tables']['tuition_settings']['Row'];

export class TuitionAPI {
  static async loadAllData() {
    const [programs, rates, settings] = await Promise.all([
      this.programs.list(),
      this.rates.list(),
      this.settings.list()
    ]);
    
    return {
      programs: programs.data || [],
      rates: rates.data || [],
      settings: this.processSettings(settings.data || [])
    };
  }

  static programs = {
    list: () => supabase
      .from('tuition_programs')
      .select('*')
      .order('display_order'),
    
    create: (data: Omit<Program, 'id' | 'created_at'>) => 
      supabase.from('tuition_programs').insert([data]),
    
    update: (id: string, data: Partial<Program>) =>
      supabase.from('tuition_programs').update(data).eq('id', id),
    
    delete: (id: string) =>
      supabase.from('tuition_programs').delete().eq('id', id)
  };

  static rates = {
    list: () => supabase
      .from('tuition_rates')
      .select('*')
      .order('display_order'),
    
    create: (data: Omit<Rate, 'id' | 'created_at'>) =>
      supabase.from('tuition_rates').insert([data]),
    
    update: (id: string, data: Partial<Rate>) =>
      supabase.from('tuition_rates').update(data).eq('id', id),
    
    delete: (id: string) =>
      supabase.from('tuition_rates').delete().eq('id', id)
  };

  static settings = {
    list: () => supabase.from('tuition_settings').select('*'),
    
    update: (updates: Array<{key: string, value: string}>) =>
      Promise.all(
        updates.map(({key, value}) =>
          supabase
            .from('tuition_settings')
            .upsert({setting_key: key, setting_value: value}, {onConflict: 'setting_key'})
        )
      )
  };

  private static processSettings(settings: Setting[]): Record<string, any> {
    return settings.reduce((acc, setting) => {
      try {
        acc[setting.setting_key] = JSON.parse(setting.setting_value);
      } catch {
        acc[setting.setting_key] = setting.setting_value;
      }
      return acc;
    }, {} as Record<string, any>);
  }
}
```

### Step 2: Create Form Components

Create `/src/components/admin/tuition/ProgramForm.astro`:

```astro
---
import type { Program } from '../../../lib/types/tuition';

export interface Props {
  program?: Program;
  onSave?: (data: Partial<Program>) => void;
}

const { program, onSave } = Astro.props;
const isEdit = !!program;
---

<form id="program-form" class="space-y-4">
  {isEdit && <input type="hidden" name="id" value={program.id} />}
  
  <div>
    <label for="name" class="block text-sm font-medium text-gray-700">
      Program Name
    </label>
    <input
      type="text"
      id="name"
      name="name"
      value={program?.name}
      required
      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
    />
  </div>

  <div>
    <label for="program_type" class="block text-sm font-medium text-gray-700">
      Program Type
    </label>
    <select
      id="program_type"
      name="program_type"
      required
      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
    >
      <option value="primary" selected={program?.program_type === 'primary'}>
        Primary (3-6 years)
      </option>
      <option value="elementary" selected={program?.program_type === 'elementary'}>
        Elementary (6-12 years)
      </option>
      <option value="summer" selected={program?.program_type === 'summer'}>
        Summer Program
      </option>
    </select>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label for="days_per_week" class="block text-sm font-medium text-gray-700">
        Days Per Week
      </label>
      <input
        type="number"
        id="days_per_week"
        name="days_per_week"
        min="1"
        max="5"
        value={program?.days_per_week || 5}
        required
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
      />
    </div>

    <div>
      <label for="daily_hours" class="block text-sm font-medium text-gray-700">
        Daily Hours
      </label>
      <input
        type="number"
        id="daily_hours"
        name="daily_hours"
        min="1"
        max="12"
        step="0.5"
        value={program?.daily_hours || 6}
        required
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
      />
    </div>
  </div>

  <div>
    <label for="description" class="block text-sm font-medium text-gray-700">
      Description
    </label>
    <textarea
      id="description"
      name="description"
      rows="3"
      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
    >{program?.description}</textarea>
  </div>

  <div class="flex justify-end gap-3">
    <button
      type="button"
      class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
      data-action="cancel"
    >
      Cancel
    </button>
    <button
      type="submit"
      class="px-4 py-2 text-sm font-medium text-white bg-forest-canopy rounded-md hover:bg-forest-canopy-dark"
    >
      {isEdit ? 'Update' : 'Create'} Program
    </button>
  </div>
</form>

<script>
  import { TuitionAPI } from '../../../lib/api/tuition-api';
  
  const form = document.getElementById('program-form') as HTMLFormElement;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Transform data types
    const programData = {
      name: data.name as string,
      program_type: data.program_type as string,
      days_per_week: parseInt(data.days_per_week as string),
      daily_hours: parseFloat(data.daily_hours as string),
      description: data.description as string
    };
    
    try {
      if (data.id) {
        await TuitionAPI.programs.update(data.id as string, programData);
      } else {
        await TuitionAPI.programs.create(programData);
      }
      
      // Emit custom event for parent to handle
      form.dispatchEvent(new CustomEvent('save-success', {
        bubbles: true,
        detail: { type: 'program', data: programData }
      }));
    } catch (error) {
      console.error('Error saving program:', error);
      form.dispatchEvent(new CustomEvent('save-error', {
        bubbles: true,
        detail: { error }
      }));
    }
  });
  
  // Handle cancel
  form.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
    form.dispatchEvent(new CustomEvent('cancel', { bubbles: true }));
  });
</script>
```

### Step 3: Create Modal Component

Create `/src/components/admin/tuition/EditModal.astro`:

```astro
---
export interface Props {
  id?: string;
}

const { id = 'edit-modal' } = Astro.props;
---

<div
  id={id}
  class="hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
  data-modal
>
  <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
    <div class="flex items-center justify-between pb-3 border-b border-gray-200">
      <h3 class="text-lg font-bold text-earth-brown" data-modal-title></h3>
      <button
        type="button"
        class="text-gray-400 hover:text-gray-600"
        data-modal-close
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    <div class="mt-4" data-modal-content>
      <!-- Content will be inserted here -->
    </div>
  </div>
</div>

<script>
  class Modal {
    private element: HTMLElement;
    private titleEl: HTMLElement;
    private contentEl: HTMLElement;
    
    constructor(element: HTMLElement) {
      this.element = element;
      this.titleEl = element.querySelector('[data-modal-title]')!;
      this.contentEl = element.querySelector('[data-modal-content]')!;
      
      // Setup close handlers
      element.querySelector('[data-modal-close]')?.addEventListener('click', () => this.hide());
      element.addEventListener('click', (e) => {
        if (e.target === element) this.hide();
      });
    }
    
    show(title: string, content: HTMLElement | string) {
      this.titleEl.textContent = title;
      
      if (typeof content === 'string') {
        this.contentEl.innerHTML = content;
      } else {
        this.contentEl.innerHTML = '';
        this.contentEl.appendChild(content);
      }
      
      this.element.classList.remove('hidden');
      
      // Listen for form events
      this.contentEl.addEventListener('save-success', () => this.hide());
      this.contentEl.addEventListener('cancel', () => this.hide());
    }
    
    hide() {
      this.element.classList.add('hidden');
      this.contentEl.innerHTML = '';
    }
  }
  
  // Export modal instance
  const modalElement = document.querySelector('[data-modal]') as HTMLElement;
  if (modalElement) {
    (window as any).tuitionModal = new Modal(modalElement);
  }
</script>
```

### Step 4: Simplify Main Page

Refactor `/src/pages/admin/tuition.astro`:

```astro
---
import Layout from '../../layouts/Layout.astro';
import Header from '../../components/Header.astro';
import Footer from '../../components/Footer.astro';
import TuitionQuickActions from '../../components/admin/TuitionQuickActions.astro';
import ProgramsManagement from '../../components/admin/tuition/ProgramsManagement.astro';
import TuitionRatesTable from '../../components/admin/tuition/RatesTable.astro';
import TuitionSettings from '../../components/admin/tuition/Settings.astro';
import EditModal from '../../components/admin/tuition/EditModal.astro';
import { ArrowLeft } from 'lucide-astro';
---

<Layout 
  title="Manage Tuition Rates - Admin Panel"
  description="Administrative interface for managing tuition rates, programs, and calculator settings."
>
  <Header />
  
  <main id="main-content">
    <!-- Auth Guard Component -->
    <auth-guard redirect="/auth/login" />

    <!-- Header Section -->
    <section class="bg-gradient-to-br from-sunlight-gold to-orange-600 py-12">
      <div class="container mx-auto px-4">
        <div class="max-w-6xl mx-auto">
          <div class="mb-6">
            <a href="/admin" class="inline-flex items-center text-orange-200 hover:text-white transition-colors group">
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              <span class="text-sm font-medium">Back to Admin Dashboard</span>
            </a>
          </div>
          
          <div>
            <h1 class="text-3xl lg:text-4xl font-heading font-bold text-white mb-4 tracking-tight">
              Manage Tuition System
            </h1>
            <p class="text-orange-100 text-lg max-w-3xl">
              Update tuition rates, programs, and calculator settings.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Management Interface -->
    <section class="py-12 bg-white">
      <div class="container mx-auto px-4 max-w-7xl">
        <div data-tuition-manager>
          <TuitionQuickActions />
          <ProgramsManagement />
          <TuitionRatesTable />
          <TuitionSettings />
        </div>
      </div>
    </section>

    <!-- Modal -->
    <EditModal />
  </main>
  
  <Footer />
</Layout>

<script>
  // Simple auth guard web component
  class AuthGuard extends HTMLElement {
    async connectedCallback() {
      const { auth } = await import('../../lib/supabase');
      const user = await auth.getCurrentUser();
      
      if (!user) {
        window.location.href = this.getAttribute('redirect') || '/';
      }
    }
  }
  
  customElements.define('auth-guard', AuthGuard);
</script>
```

## Benefits of This Refactoring

### 1. Reduced Complexity
- Main page: 317 lines → ~100 lines
- Complexity score: 59 → ~10
- Each component focuses on a single responsibility

### 2. Better Maintainability
- Clear file structure
- Type safety with TypeScript
- Reusable components
- Testable units

### 3. Improved Developer Experience
- Easy to find and modify specific functionality
- Clear data flow
- No global namespace pollution
- Modern patterns (custom elements, events)

### 4. Performance Improvements
- Smaller initial bundle (code splitting)
- Components load only when needed
- Better caching strategies
- Reduced re-renders

### 5. Scalability
- Easy to add new form types
- Consistent patterns for CRUD operations
- Clear extension points
- Modular architecture

## Migration Strategy

1. **Phase 1**: Create new components alongside existing code
2. **Phase 2**: Test new components in isolation
3. **Phase 3**: Switch one section at a time
4. **Phase 4**: Remove old code once verified
5. **Phase 5**: Optimize and polish

This approach ensures zero downtime and allows for gradual migration with rollback capability at each step.