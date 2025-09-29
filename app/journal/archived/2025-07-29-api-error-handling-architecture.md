# API Error Handling Architecture - Analysis and Design

## Current State Analysis

### Identified Problems

1. **Inconsistent Error Response Formats**
   - Some endpoints return `{ error: string }`
   - Others return `{ success: boolean, error?: string }`
   - No standardized error codes or types

2. **Minimal Validation**
   - Basic manual validation (email regex, required fields)
   - No schema validation library
   - Validation errors not clearly distinguished from other errors

3. **Generic Error Messages**
   - Most errors return "Internal server error" (500)
   - Loss of context for debugging
   - Poor user experience

4. **Scattered Error Handling**
   - Try-catch blocks in each endpoint
   - No centralized error processing
   - Inconsistent logging

### Existing Patterns Found

1. **Error Logger Utility** (`src/lib/error-logger.ts`)
   - Basic in-memory logging
   - Console output in development
   - Ready for production service integration

2. **Validation Examples**
   - `schedule-tour.ts`: Email regex, required fields
   - `media-storage.ts`: File type/size validation
   - `donations/create-payment-intent.ts`: Amount validation

3. **Auth Error Handling**
   - 401 for unauthenticated
   - 403 for unauthorized (non-admin)
   - Consistent pattern across auth endpoints

## Proposed Error Handling Architecture

### 1. Standardized Error Response Format

```typescript
interface ApiError {
  error: {
    code: string;          // Machine-readable error code
    message: string;       // Human-readable message
    field?: string;        // For validation errors
    details?: any;         // Additional context
  };
  timestamp: string;
  requestId?: string;      // For tracking
}

interface ApiSuccess<T = any> {
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}
```

### 2. Error Types and Codes

```typescript
enum ErrorCode {
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Auth errors (401/403)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Resource errors (404)
  NOT_FOUND = 'NOT_FOUND',
  
  // Client errors (400)
  BAD_REQUEST = 'BAD_REQUEST',
  
  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}
```

### 3. Middleware Architecture

```typescript
// Error handling middleware
function withErrorHandler(handler: APIRoute): APIRoute {
  return async (context) => {
    try {
      return await handler(context);
    } catch (error) {
      return handleError(error);
    }
  };
}

// Validation middleware
function withValidation<T>(schema: Schema<T>): Middleware {
  return async (context, next) => {
    const validation = await validateRequest(context.request, schema);
    if (!validation.success) {
      return validationError(validation.errors);
    }
    context.validated = validation.data;
    return next();
  };
}
```

### 4. Validation Approach

Since no validation library is installed, we'll start with a lightweight custom solution:

```typescript
// Simple schema validation
interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'array' | 'object';
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

interface Schema {
  [field: string]: ValidationRule;
}
```

### 5. Implementation Plan

#### Phase 1: Core Infrastructure (Minimal, Immediate)
1. Create error response utilities
2. Create validation utilities
3. Create middleware wrapper functions
4. Update error logger integration

#### Phase 2: Apply to Existing Endpoints
1. Wrap existing endpoints with error handler
2. Add validation schemas to each endpoint
3. Standardize response formats
4. Update error messages

#### Phase 3: Documentation and Testing
1. Document error codes and meanings
2. Add error handling tests
3. Create API documentation

## Benefits

1. **Consistent API Contract** - Frontend knows exactly what to expect
2. **Better Debugging** - Error codes and context help identify issues
3. **Improved UX** - Clear, actionable error messages
4. **Maintainability** - Centralized error handling logic
5. **Production Ready** - Proper error logging and monitoring hooks

## Migration Strategy

1. Start with new error utilities (non-breaking)
2. Gradually update endpoints one by one
3. Frontend can handle both old and new formats during transition
4. Complete migration before production launch