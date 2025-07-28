// Tuition Form Templates and Utilities
// Extracted from tuition.astro to reduce complexity

interface Program {
  id: string;
  name: string;
  program_type: string;
  days_per_week: number;
  daily_hours: number;
  description?: string;
}

interface TuitionRate {
  id: string;
  rate_label: string;
  program_id: string;
  tuition_price: number;
  extended_care_price?: number;
  income_threshold_family_2?: number;
  income_threshold_family_3?: number;
  income_threshold_family_4?: number;
  income_threshold_family_5?: number;
  income_threshold_family_6?: number;
  income_threshold_family_7?: number;
  income_threshold_family_8_plus?: number;
  income_threshold_type: string;
  extended_care_available: boolean;
  is_constant_rate: boolean;
  school_year: string;
  active: boolean;
  display_order: number;
}

export function createProgramForm(program: Program | null = null): string {
  return `
    <form id="program-form" class="space-y-4">
      <input type="hidden" id="program-id" value="${program?.id || ''}" />
      <div>
        <label class="block text-sm font-medium text-earth-brown mb-2">Program Name</label>
        <input type="text" id="program-name" value="${program?.name || ''}" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-moss-green focus:border-transparent" />
      </div>
      <div>
        <label class="block text-sm font-medium text-earth-brown mb-2">Program Type</label>
        <select id="program-type" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-moss-green focus:border-transparent">
          <option value="Full Day" ${program?.program_type === 'Full Day' ? 'selected' : ''}>Full Day</option>
          <option value="Half Day" ${program?.program_type === 'Half Day' ? 'selected' : ''}>Half Day</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-earth-brown mb-2">Days per Week</label>
        <input type="number" id="program-days" value="${program?.days_per_week || 5}" min="1" max="7" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-moss-green focus:border-transparent" />
      </div>
      <div>
        <label class="block text-sm font-medium text-earth-brown mb-2">Daily Hours</label>
        <input type="number" id="program-hours" value="${program?.daily_hours || 6.5}" step="0.5" min="1" max="12" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-moss-green focus:border-transparent" />
      </div>
      <div>
        <label class="block text-sm font-medium text-earth-brown mb-2">Description</label>
        <textarea id="program-description" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-moss-green focus:border-transparent">${program?.description || ''}</textarea>
      </div>
      <div class="flex justify-end space-x-3">
        <button type="button" onclick="hideEditModal()" class="px-4 py-2 border border-gray-300 text-earth-brown rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="submit" class="px-4 py-2 bg-moss-green text-white rounded-lg hover:bg-green-700">Save Program</button>
      </div>
    </form>
  `;
}

export function createRateForm(rate: TuitionRate | null = null, programs: Program[] = []): string {
  const programOptions = programs.map(p => 
    `<option value="${p.id}" ${rate?.program_id === p.id ? 'selected' : ''}>${p.name}</option>`
  ).join('');

  return `
    <form id="rate-form" class="space-y-4">
      <input type="hidden" id="rate-id" value="${rate?.id || ''}" />
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-earth-brown mb-2">Rate Label</label>
          <input type="text" id="rate-label" value="${rate?.rate_label || ''}" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-canopy focus:border-transparent" />
        </div>
        <div>
          <label class="block text-sm font-medium text-earth-brown mb-2">Program</label>
          <select id="rate-program" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-canopy focus:border-transparent">
            <option value="">Select Program</option>
            ${programOptions}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-earth-brown mb-2">Tuition Price ($)</label>
          <input type="number" id="rate-price" value="${rate?.tuition_price || ''}" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-canopy focus:border-transparent" />
        </div>
        <div>
          <label class="block text-sm font-medium text-earth-brown mb-2">Extended Care Price ($)</label>
          <input type="number" id="rate-extended-price" value="${rate?.extended_care_price || 0}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-canopy focus:border-transparent" />
        </div>
      </div>
      
      <div>
        <h4 class="text-md font-semibold text-earth-brown mb-3">Income Thresholds by Family Size</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          ${[2, 3, 4, 5, 6, 7].map(size => `
            <div>
              <label class="block text-sm font-medium text-earth-brown mb-2">Family Size ${size} ($)</label>
              <input type="number" id="rate-threshold-${size}" value="${rate?.[`income_threshold_family_${size}` as keyof TuitionRate] || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-canopy focus:border-transparent" />
            </div>
          `).join('')}
          <div>
            <label class="block text-sm font-medium text-earth-brown mb-2">Family Size 8+ ($)</label>
            <input type="number" id="rate-threshold-8" value="${rate?.income_threshold_family_8_plus || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-canopy focus:border-transparent" />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-earth-brown mb-2">Threshold Type</label>
          <select id="rate-threshold-type" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-canopy focus:border-transparent">
            <option value="Greater Than or Equal To" ${rate?.income_threshold_type === 'Greater Than or Equal To' ? 'selected' : ''}>Greater Than or Equal To</option>
            <option value="Less Than" ${rate?.income_threshold_type === 'Less Than' ? 'selected' : ''}>Less Than</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-earth-brown mb-2">School Year</label>
          <input type="text" id="rate-school-year" value="${rate?.school_year || '2025-2026'}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-canopy focus:border-transparent" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-earth-brown mb-2">Display Order</label>
          <input type="number" id="rate-display-order" value="${rate?.display_order || 0}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-forest-canopy focus:border-transparent" />
        </div>
      </div>

      <div class="flex items-center space-x-4">
        <label class="flex items-center">
          <input type="checkbox" id="rate-extended-available" ${rate?.extended_care_available ? 'checked' : ''} class="mr-2" />
          <span class="text-sm text-earth-brown">Extended Care Available</span>
        </label>
        <label class="flex items-center">
          <input type="checkbox" id="rate-constant" ${rate?.is_constant_rate ? 'checked' : ''} class="mr-2" />
          <span class="text-sm text-earth-brown">Constant Rate (No Income Threshold)</span>
        </label>
        <label class="flex items-center">
          <input type="checkbox" id="rate-active" ${rate?.active !== false ? 'checked' : ''} class="mr-2" />
          <span class="text-sm text-earth-brown">Active</span>
        </label>
      </div>

      <div class="flex justify-end space-x-3">
        <button type="button" onclick="hideEditModal()" class="px-4 py-2 border border-gray-300 text-earth-brown rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="submit" class="px-4 py-2 bg-forest-canopy text-white rounded-lg hover:bg-green-700">Save Rate</button>
      </div>
    </form>
  `;
}

export function renderPrograms(programs: any[]): void {
  const container = document.getElementById('programs-list');
  if (!container) return;
  
  container.innerHTML = '';

  programs.forEach(program => {
    const div = document.createElement('div');
    div.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg';
    div.innerHTML = `
      <div>
        <h4 class="font-semibold text-earth-brown">${program.name}</h4>
        <p class="text-sm text-gray-600">${program.program_type} • ${program.days_per_week} days/week</p>
      </div>
      <div class="flex space-x-2">
        <button onclick="editProgram('${program.id}')" class="text-blue-600 hover:text-blue-800">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.828-2.828z"></path></svg>
        </button>
        <button onclick="deleteProgram('${program.id}')" class="text-red-600 hover:text-red-800">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 102 0v-1a1 1 0 10-2 0v1zm4 0a1 1 0 102 0v-1a1 1 0 10-2 0v1z" clip-rule="evenodd"></path></svg>
        </button>
      </div>
    `;
    container.appendChild(div);
  });
}

export function renderRates(rates: any[], programs: any[]): void {
  const tbody = document.getElementById('rates-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  rates.forEach(rate => {
    const program = programs.find(p => p.id === rate.program_id);
    const row = tbody.insertRow();
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-earth-brown">${rate.rate_label}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-earth-brown">${program?.name || 'Unknown'}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-earth-brown">$${rate.tuition_price?.toLocaleString()}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-earth-brown">
        ${rate.income_threshold_family_4 ? 
          `${rate.income_threshold_type === 'Less Than' ? '<' : '≥'} $${rate.income_threshold_family_4.toLocaleString()}` : 
          'N/A'
        }
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-earth-brown">
        ${rate.extended_care_available ? 
          `$${rate.extended_care_price || 0}` : 
          'No'
        }
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-earth-brown">
        <div class="flex space-x-2">
          <button onclick="editRate('${rate.id}')" class="text-blue-600 hover:text-blue-800">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.828-2.828z"></path></svg>
          </button>
          <button onclick="deleteRate('${rate.id}')" class="text-red-600 hover:text-red-800">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 102 0v-1a1 1 0 10-2 0v1zm4 0a1 1 0 102 0v-1a1 1 0 10-2 0v1z" clip-rule="evenodd"></path></svg>
          </button>
        </div>
      </td>
    `;
  });
}

export function populateSettings(settings: Record<string, any>): void {
  const schoolYearInput = document.getElementById('school-year') as HTMLInputElement;
  const upfrontDiscountInput = document.getElementById('upfront-discount') as HTMLInputElement;
  const siblingDiscountInput = document.getElementById('sibling-discount') as HTMLInputElement;
  const annualIncreaseInput = document.getElementById('annual-increase') as HTMLInputElement;

  if (schoolYearInput) schoolYearInput.value = settings.current_school_year || '2025-2026';
  if (upfrontDiscountInput) upfrontDiscountInput.value = (settings.upfront_discount_rate * 100) || 5;
  if (siblingDiscountInput) siblingDiscountInput.value = (settings.sibling_discount_rate * 100) || 10;
  if (annualIncreaseInput) annualIncreaseInput.value = (settings.annual_increase_rate * 100) || 4;
}