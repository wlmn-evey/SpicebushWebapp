import { describe, expect, it, vi } from 'vitest';

vi.mock('@lib/server-logger', () => ({
  logServerError: vi.fn()
}));

import { logServerError } from '@lib/server-logger';
import {
  errorResponse,
  handleApiRequest,
  parseJsonBody,
  successResponse,
  validateEmail,
  validatePhone,
  validateRequired
} from './api-utils';

describe('api-utils', () => {
  it('creates error and success JSON responses', async () => {
    const err = errorResponse('Nope', 422);
    expect(err.status).toBe(422);
    expect(err.headers.get('Content-Type')).toContain('application/json');
    await expect(err.json()).resolves.toEqual({ error: 'Nope' });

    const ok = successResponse({ success: true }, 201);
    expect(ok.status).toBe(201);
    expect(ok.headers.get('Content-Type')).toContain('application/json');
    await expect(ok.json()).resolves.toEqual({ success: true });
  });

  it('validates email, phone, and required fields', () => {
    expect(validateEmail('hello@example.com')).toBe(true);
    expect(validateEmail('bad-email')).toBe(false);

    expect(validatePhone('+1 (555) 111-2222')).toBe(true);
    expect(validatePhone('12345')).toBe(false);

    expect(validateRequired({ name: 'Ada', email: 'ada@example.com' }, ['name', 'email'])).toBeNull();
    expect(validateRequired({ name: '  ' }, ['name'])).toBe('name is required');
  });

  it('wraps handler success and failure responses consistently', async () => {
    const success = await handleApiRequest(async () => ({ id: 'abc' }));
    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toEqual({ id: 'abc' });

    const unauthorized = await handleApiRequest(async () => {
      throw new Error('Unauthorized access');
    });
    expect(unauthorized.status).toBe(401);
    await expect(unauthorized.json()).resolves.toEqual({ error: 'Unauthorized' });

    const notFound = await handleApiRequest(async () => {
      throw new Error('Not found');
    });
    expect(notFound.status).toBe(404);
    await expect(notFound.json()).resolves.toEqual({ error: 'Resource not found' });

    const generic = await handleApiRequest(async () => {
      throw new Error('boom');
    });
    expect(generic.status).toBe(500);
    await expect(generic.json()).resolves.toEqual({ error: 'Internal server error' });

    expect(logServerError).toHaveBeenCalledTimes(3);
  });

  it('parses JSON body and returns null for invalid JSON', async () => {
    const goodRequest = new Request('http://localhost/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ada' })
    });

    await expect(parseJsonBody<Record<string, string>>(goodRequest)).resolves.toEqual({ name: 'Ada' });

    const badRequest = new Request('http://localhost/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{broken json}'
    });

    await expect(parseJsonBody(badRequest)).resolves.toBeNull();
  });
});
