---
id: 019
title: "API Endpoint Error Handling"
severity: medium
status: open
category: functionality
affected_pages: ["all pages using API calls"]
related_bugs: [002, 016]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 019: API Endpoint Error Handling

## Description
API endpoints lack proper error handling, validation, and consistent response formats. This causes unclear error messages for users and makes debugging difficult. Some endpoints return raw error stacks in production.

## Steps to Reproduce
1. Make API request with invalid data
2. Trigger various error conditions
3. Observe inconsistent error responses
4. See stack traces in production

## Expected Behavior
- Consistent error response format
- Meaningful error messages
- Proper status codes
- No sensitive data exposed
- Request validation

## Actual Behavior
- Different error formats per endpoint
- Generic 500 errors
- Stack traces exposed
- Missing input validation
- Unclear error messages

## API Error Analysis
```
Endpoint Issues Found:

1. /api/admin/content
   - No input validation
   - Returns raw database errors
   - Missing authentication checks
   - No rate limiting

2. /api/contact
   - Email validation insufficient
   - No CSRF protection
   - Success/error format differs
   - No spam protection

3. /api/tour-schedule
   - Date validation missing
   - Timezone issues
   - No conflict checking
   - Poor error messages

Common Problems:
- No standardized error format
- Missing try-catch blocks
- Synchronous error handling
- No request logging
- Exposed internal details
```

## Affected Files
- `/src/pages/api/*.ts` - All API endpoints
- API client utilities
- Form submission handlers

## Suggested Fixes

### Option 1: Standardized Error Handler
```typescript
// src/middleware/api-error-handler.ts
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function createErrorResponse(error: any): Response {
  console.error('API Error:', error);

  // Default error
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details = undefined;

  if (error instanceof APIError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || code;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    statusCode = 422;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = error.errors;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Authentication required';
    code = 'UNAUTHORIZED';
  }

  // Never expose stack traces in production
  const response = {
    error: {
      message,
      code,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
      ...(details && { details })
    },
    timestamp: new Date().toISOString(),
    path: error.path
  };

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// Wrapper for API routes
export function withErrorHandler(
  handler: (req: Request) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    try {
      return await handler(request);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}
```

### Option 2: Input Validation Middleware
```typescript
// src/middleware/validate-request.ts
import { z } from 'zod';

export function validateRequest(schema: z.ZodSchema) {
  return async (request: Request): Promise<any> => {
    try {
      const contentType = request.headers.get('content-type');
      
      let data;
      if (contentType?.includes('application/json')) {
        data = await request.json();
      } else if (contentType?.includes('multipart/form-data')) {
        const formData = await request.formData();
        data = Object.fromEntries(formData);
      } else {
        throw new APIError('Unsupported content type', 415);
      }

      const validated = await schema.parseAsync(data);
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new APIError(
          'Validation failed',
          422,
          'VALIDATION_ERROR',
          error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        );
      }
      throw error;
    }
  };
}

// Usage example
const ContactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  message: z.string().min(10).max(1000),
  phone: z.string().optional()
});

export const POST = withErrorHandler(async (request) => {
  const data = await validateRequest(ContactSchema)(request);
  
  // Process valid data
  await sendContactEmail(data);
  
  return new Response(JSON.stringify({
    success: true,
    message: 'Message sent successfully'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### Option 3: API Response Helpers
```typescript
// src/utils/api-responses.ts
export function successResponse(
  data: any, 
  meta?: any,
  status: number = 200
): Response {
  return new Response(JSON.stringify({
    success: true,
    data,
    ...(meta && { meta }),
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}

export function errorResponse(
  message: string,
  status: number = 400,
  details?: any
): Response {
  return new Response(JSON.stringify({
    success: false,
    error: {
      message,
      ...(details && { details })
    },
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

export function validationErrorResponse(
  errors: Record<string, string>
): Response {
  return errorResponse(
    'Validation failed',
    422,
    { validation_errors: errors }
  );
}
```

## Testing Requirements
1. Test all error scenarios
2. Verify no stack traces in production
3. Check consistent error formats
4. Test validation rules
5. Verify proper status codes
6. Test rate limiting
7. Check error logging

## Related Issues
- Bug #002: Server 500 errors
- Bug #016: Admin API failures

## Additional Notes
- Implement API documentation
- Add request/response logging
- Consider API versioning
- Add rate limiting
- Monitor API performance
- Regular security audits needed