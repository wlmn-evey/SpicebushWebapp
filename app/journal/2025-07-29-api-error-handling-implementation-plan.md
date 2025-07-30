# API Error Handling Implementation Plan

## Minimal, Effective Solution

### Step 1: Create Core Error Utilities

**File: `src/lib/api-errors.ts`**
```typescript
// Standardized error codes
export enum ErrorCode {
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_EMAIL = 'INVALID_EMAIL',
  
  // Auth
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Resources
  NOT_FOUND = 'NOT_FOUND',
  
  // Server
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR'
}

// Error response builder
export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  details?: any
): Response {
  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString()
      }
    }),
    { 
      status, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Success response builder
export function successResponse<T>(data: T, status = 200): Response {
  return new Response(
    JSON.stringify({ data }),
    { 
      status, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Common error handlers
export function validationError(field: string, message: string) {
  return errorResponse(
    ErrorCode.VALIDATION_ERROR,
    message,
    400,
    { field }
  );
}

export function unauthorizedError(message = 'Authentication required') {
  return errorResponse(ErrorCode.UNAUTHORIZED, message, 401);
}

export function forbiddenError(message = 'Access denied') {
  return errorResponse(ErrorCode.FORBIDDEN, message, 403);
}

export function notFoundError(resource: string) {
  return errorResponse(
    ErrorCode.NOT_FOUND,
    `${resource} not found`,
    404
  );
}

export function internalError(error: unknown) {
  // Log the actual error
  console.error('Internal error:', error);
  
  // Return generic message to client
  return errorResponse(
    ErrorCode.INTERNAL_ERROR,
    'An unexpected error occurred',
    500
  );
}
```

### Step 2: Create Validation Utilities

**File: `src/lib/api-validation.ts`**
```typescript
// Simple validation rules
export const validators = {
  required: (value: any) => 
    value !== undefined && value !== null && value !== '',
    
  email: (value: string) => 
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    
  minLength: (min: number) => (value: string) => 
    value.length >= min,
    
  maxLength: (max: number) => (value: string) => 
    value.length <= max,
    
  min: (min: number) => (value: number) => 
    value >= min,
    
  max: (max: number) => (value: number) => 
    value <= max,
    
  pattern: (regex: RegExp) => (value: string) => 
    regex.test(value)
};

// Validation result
interface ValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
}

// Validate request body against rules
export async function validateBody(
  request: Request,
  rules: Record<string, Array<[validator: Function, message: string]>>
): Promise<ValidationResult> {
  const errors: { field: string; message: string }[] = [];
  
  let body: any;
  try {
    body = await request.json();
  } catch {
    errors.push({ field: 'body', message: 'Invalid JSON' });
    return { valid: false, errors };
  }
  
  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = body[field];
    
    for (const [validator, message] of fieldRules) {
      if (!validator(value)) {
        errors.push({ field, message });
        break; // Stop at first error for this field
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Step 3: Create Error Handling Wrapper

**File: `src/lib/api-middleware.ts`**
```typescript
import type { APIRoute } from 'astro';
import { internalError } from './api-errors';
import { errorLogger } from './error-logger';

// Wrap API routes with error handling
export function withErrorHandling(
  handler: APIRoute,
  component: string
): APIRoute {
  return async (context) => {
    try {
      return await handler(context);
    } catch (error) {
      // Log error with context
      errorLogger.log(component, error, {
        url: context.url.toString(),
        method: context.request.method
      });
      
      // Return standardized error response
      return internalError(error);
    }
  };
}

// Compose multiple middleware
export function compose(...middleware: APIRoute[]): APIRoute {
  return async (context) => {
    let result: Response | undefined;
    
    for (const mw of middleware) {
      result = await mw(context);
      if (result) return result;
    }
    
    throw new Error('No middleware returned a response');
  };
}
```

### Step 4: Update Existing Endpoints

Example transformation for `schedule-tour.ts`:

```typescript
import type { APIRoute } from 'astro';
import { withErrorHandling } from '@lib/api-middleware';
import { validateBody, validators } from '@lib/api-validation';
import { validationError, successResponse } from '@lib/api-errors';
import nodemailer from 'nodemailer';

const handler: APIRoute = async ({ request }) => {
  // Validation rules
  const validation = await validateBody(request, {
    parentName: [
      [validators.required, 'Parent name is required'],
      [validators.minLength(2), 'Name must be at least 2 characters']
    ],
    email: [
      [validators.required, 'Email is required'],
      [validators.email, 'Invalid email address']
    ],
    phone: [
      [validators.required, 'Phone number is required'],
      [validators.minLength(10), 'Invalid phone number']
    ],
    childAge: [
      [validators.required, 'Child age is required']
    ]
  });
  
  if (!validation.valid) {
    const first = validation.errors[0];
    return validationError(first.field, first.message);
  }
  
  const data = await request.json();
  const { parentName, email, phone, childAge, preferredTimes, questions, schoolEmail } = data;
  
  // Email sending logic remains the same...
  // ... 
  
  return successResponse({
    message: 'Tour request submitted successfully'
  });
};

export const POST = withErrorHandling(handler, 'schedule-tour');
```

### Step 5: Priority Endpoints to Update

1. **Critical User-Facing**:
   - `/api/schedule-tour` - Tour scheduling
   - `/api/donations/create-payment-intent` - Payment processing
   
2. **Admin Functions**:
   - `/api/cms/entries` - Content management
   - `/api/media/upload` - File uploads
   - `/api/auth/check` - Authentication

3. **Support Endpoints**:
   - `/api/cms/settings/[key]` - Settings management
   - `/api/storage/stats` - Storage statistics

## Implementation Timeline

1. **Hour 1**: Create core utilities (api-errors.ts, api-validation.ts, api-middleware.ts)
2. **Hour 2**: Update critical user-facing endpoints
3. **Hour 3**: Update admin endpoints
4. **Hour 4**: Test and document changes

## Testing Strategy

1. Create test file for error utilities
2. Test each endpoint with:
   - Valid requests
   - Missing fields
   - Invalid formats
   - Server errors (mock failures)
3. Verify error logger captures all errors
4. Check frontend handles new format

## Success Criteria

- All API endpoints return consistent error format
- Validation errors provide clear field-specific messages
- Server errors are logged but don't leak details
- Frontend can parse and display errors properly
- No breaking changes to existing functionality