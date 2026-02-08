import { logServerError } from '@lib/server-logger';

// Simple error response helper
export function errorResponse(message: string, status = 400) {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Success response helper
export function successResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}

// Basic validation helpers
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  // Basic phone validation - accepts common formats
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

export function validateRequired(data: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    const value = data[field];
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${field} is required`;
    }
  }
  return null;
}

// Simple error wrapper for consistent error handling
export async function handleApiRequest<T>(
  handler: () => Promise<T>
): Promise<Response> {
  try {
    const result = await handler();
    return successResponse(result);
  } catch (error) {
    logServerError('API request failed', error);
    
    // Handle known error types
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return errorResponse('Unauthorized', 401);
      }
      if (error.message.includes('Not found')) {
        return errorResponse('Resource not found', 404);
      }
    }
    
    // Generic error
    return errorResponse('Internal server error', 500);
  }
}

// Parse JSON body with error handling
export async function parseJsonBody<T = unknown>(request: Request): Promise<T | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
