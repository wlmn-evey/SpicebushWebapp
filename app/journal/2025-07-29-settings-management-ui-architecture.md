# Settings Management UI Architecture

## Date: 2025-07-29

## Current Analysis

### Existing Infrastructure
- FormField component with error handling and accessibility features
- TextInput and ToggleSwitch components with consistent styling
- Validation system with validators and form validation utilities
- Session management with secure token handling and audit logging
- Admin authentication system with proper role checking
- Existing admin settings page with tabbed interface (general, API keys, security, etc.)

### Current Settings Database Structure
Based on content files, the following settings exist:
- coming_soon_enabled (boolean)
- coming_soon_launch_date (date)
- coming_soon_message (text)
- coming_soon_mode (boolean - legacy?)
- coming_soon_newsletter (boolean)
- current_school_year (string)
- sibling_discount_rate (decimal)
- upfront_discount_rate (decimal)
- annual_increase_rate (decimal)
- site_message (text)

### Key Requirements Analysis
1. Use existing FormField components and validation system ✓
2. Group related settings logically (need to design grouping)
3. Provide clear labels and help text for school staff
4. Handle different data types (boolean, decimal, date, text) ✓
5. Show current values and allow updates
6. Provide immediate feedback on save
7. Use secure session management and audit logging ✓

## Architectural Design

### 1. UI Grouping Strategy

#### Group 1: Coming Soon Configuration
- coming_soon_enabled (boolean) - Master toggle
- coming_soon_mode (boolean) - Legacy mode toggle (deprecated?)
- coming_soon_launch_date (date) - Expected launch date
- coming_soon_message (text) - Custom message for visitors
- coming_soon_newsletter (boolean) - Show newsletter signup

#### Group 2: Academic Settings
- current_school_year (string) - Academic year identifier

#### Group 3: Tuition & Financial Settings  
- sibling_discount_rate (decimal) - Discount percentage per additional sibling
- upfront_discount_rate (decimal) - Discount for paying annually upfront
- annual_increase_rate (decimal) - Yearly rate increase percentage

#### Group 4: Site Communications
- site_message (text) - Global site message/announcement

### 2. Form Handling Approach

#### Data Flow Architecture
```
Settings UI Form → Validation → API Endpoint → Database Update → Audit Log → UI Feedback
```

#### Form State Management
- Load current values on component mount
- Client-side validation using existing validation system
- Optimistic UI updates with rollback on error
- Real-time validation feedback
- Success/error toast notifications

#### Field Types Mapping
- Boolean: ToggleSwitch component
- Decimal: TextInput with type="number" and step="0.01"
- Date: TextInput with type="date"
- Text: TextInput for short text, TextArea for longer content
- String: TextInput with type="text"

### 3. API Endpoint Design

#### Endpoint: `/api/admin/settings`

##### GET Request
```typescript
Response: {
  success: boolean;
  data: {
    [key: string]: {
      value: any;
      type: 'boolean' | 'decimal' | 'date' | 'text' | 'string';
      updated_at: string;
      updated_by: string;
    }
  };
  error?: string;
}
```

##### POST Request (Update Settings)
```typescript
Request: {
  settings: {
    [key: string]: {
      value: any;
      type: 'boolean' | 'decimal' | 'date' | 'text' | 'string';
    }
  }
}

Response: {
  success: boolean;
  data?: {
    updated: string[];
    audit_id: string;
  };
  errors?: {
    [key: string]: string;
  };
}
```

### 4. Validation Schema

#### Schema Definition
```typescript
const settingsValidationSchema = {
  coming_soon_enabled: [validators.required],
  coming_soon_launch_date: [
    validators.required,
    validators.pattern(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format')
  ],
  coming_soon_message: [
    validators.maxLength(500)
  ],
  current_school_year: [
    validators.required,
    validators.pattern(/^\d{4}-\d{4}$/, 'Must be in YYYY-YYYY format')
  ],
  sibling_discount_rate: [
    validators.required,
    validators.pattern(/^0\.\d{1,2}$/, 'Must be decimal between 0.01 and 0.99')
  ],
  upfront_discount_rate: [
    validators.required,
    validators.pattern(/^0\.\d{1,2}$/, 'Must be decimal between 0.01 and 0.99')
  ],
  annual_increase_rate: [
    validators.required,
    validators.pattern(/^0\.\d{1,2}$/, 'Must be decimal between 0.01 and 0.99')
  ],
  site_message: [
    validators.maxLength(1000)
  ]
};
```

#### Field Help Text
- coming_soon_enabled: "Enable maintenance mode to show coming soon page to visitors"
- coming_soon_launch_date: "Expected launch date to display (format: YYYY-MM-DD)"
- coming_soon_message: "Custom message shown to visitors during maintenance"
- current_school_year: "Academic year identifier (format: 2024-2025)"
- sibling_discount_rate: "Discount percentage per additional sibling (0.10 = 10%)"
- upfront_discount_rate: "Discount for annual payment (0.05 = 5%)"
- annual_increase_rate: "Yearly tuition increase rate (0.03 = 3%)"
- site_message: "Global announcement message shown across the site"

### 5. Error Handling Strategy

#### Client-Side Error Handling
- Real-time field validation with immediate feedback
- Form-level validation before submission
- Network error handling with retry mechanisms
- Optimistic updates with rollback capability

#### Server-Side Error Handling
- Input sanitization and validation
- Database transaction safety
- Detailed error logging
- User-friendly error messages

#### Error Categories
1. **Validation Errors**: Field-specific validation failures
2. **Network Errors**: Connection or timeout issues
3. **Authorization Errors**: Session expired or insufficient permissions
4. **Database Errors**: Constraint violations or connection issues
5. **System Errors**: Unexpected server errors

#### Error User Experience
- Field-level errors shown inline with red styling
- Form-level errors shown in alert banner
- Network errors show retry option
- Success feedback with green confirmation message
- Loading states during save operations

## Next Steps

1. Create new settings management UI component
2. Implement API endpoint for settings CRUD operations
3. Add settings-specific validation rules
4. Integrate with existing audit logging system
5. Add comprehensive error handling and user feedback
6. Implement optimistic UI updates
7. Add comprehensive testing suite

## Integration Points

- Uses existing FormField, TextInput, ToggleSwitch components
- Integrates with session management and admin auth system
- Uses existing validation framework
- Leverages audit logging system for change tracking
- Follows existing admin panel UI patterns and styling