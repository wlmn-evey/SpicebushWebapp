import { afterEach, describe, expect, it, vi } from 'vitest';
import { logServerError, logServerInfo, logServerWarn } from './server-logger';

const parseLoggedPayload = (writeArg: unknown): Record<string, unknown> => {
  const raw = String(writeArg).trim();
  return JSON.parse(raw) as Record<string, unknown>;
};

describe('server-logger', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it('writes structured info logs to stdout with context sanitization', () => {
    process.env.NODE_ENV = 'development';

    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true as unknown as boolean);

    const longValue = 'a'.repeat(500);
    logServerInfo('Info message', {
      password: 'hidden',
      api_token: 'also hidden',
      longValue,
      nested: {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: 'too deep'
              }
            }
          }
        }
      },
      list: Array.from({ length: 25 }, (_, index) => index),
      flag: true,
      count: 12
    });

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const payload = parseLoggedPayload(stdoutSpy.mock.calls[0]?.[0]);

    expect(payload.level).toBe('info');
    expect(payload.message).toBe('Info message');
    expect(typeof payload.timestamp).toBe('string');

    const context = payload.context as Record<string, unknown>;
    expect(context.password).toBe('[redacted]');
    expect(context.api_token).toBe('[redacted]');
    expect(String(context.longValue)).toContain('...[truncated]');
    expect((context.list as unknown[]).length).toBe(20);
    expect(context.flag).toBe(true);
    expect(context.count).toBe(12);

    const nested = context.nested as Record<string, unknown>;
    const level1 = nested.level1 as Record<string, unknown>;
    const level2 = level1.level2 as Record<string, unknown>;
    const level3 = level2.level3 as Record<string, unknown>;
    expect(level3.level4).toBe('[truncated]');
  });

  it('writes warn logs and omits stack traces in production', () => {
    process.env.NODE_ENV = 'production';

    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true as unknown as boolean);

    logServerWarn('Warn message', {
      error: new Error('No stack in production')
    });

    const payload = parseLoggedPayload(stdoutSpy.mock.calls[0]?.[0]);
    expect(payload.level).toBe('warn');

    const context = payload.context as Record<string, unknown>;
    const error = context.error as Record<string, unknown>;
    expect(error.name).toBe('Error');
    expect(error.message).toBe('No stack in production');
    expect(error.stack).toBeUndefined();
  });

  it('writes error logs to stderr and merges error with extra context', () => {
    const stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true as unknown as boolean);

    logServerError('Error message', new Error('Boom'), {
      requestId: 'req_123',
      authorization: 'Bearer secret'
    });

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    const payload = parseLoggedPayload(stderrSpy.mock.calls[0]?.[0]);

    expect(payload.level).toBe('error');
    expect(payload.message).toBe('Error message');

    const context = payload.context as Record<string, unknown>;
    const error = context.error as Record<string, unknown>;
    expect(error.message).toBe('Boom');
    expect(context.requestId).toBe('req_123');
    expect(context.authorization).toBe('[redacted]');
  });

  it('handles logs without context payload', () => {
    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true as unknown as boolean);

    logServerInfo('No context');

    const payload = parseLoggedPayload(stdoutSpy.mock.calls[0]?.[0]);
    expect(payload.level).toBe('info');
    expect(payload.message).toBe('No context');
    expect(payload.context).toBeUndefined();
  });
});
