import { afterEach, describe, expect, it, vi } from 'vitest';

const loadLogger = async (nodeEnv: 'development' | 'production') => {
  vi.resetModules();
  process.env.NODE_ENV = nodeEnv;

  const logServerErrorMock = vi.fn();
  vi.doMock('@lib/server-logger', () => ({
    logServerError: logServerErrorMock
  }));

  const module = await import('./error-logger');
  return {
    ...module,
    logServerErrorMock
  };
};

describe('error-logger', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('logs through server logger in development and stores recent logs', async () => {
    const { logError, errorLogger, logServerErrorMock } = await loadLogger('development');

    const error = new Error('Something failed');
    logError('contact-form', error, { requestId: 'req_123' });

    expect(logServerErrorMock).toHaveBeenCalledWith('[contact-form] Error', error, {
      requestId: 'req_123'
    });

    const recent = errorLogger.getRecentLogs(1);
    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({
      component: 'contact-form',
      error: 'Something failed',
      context: { requestId: 'req_123' }
    });
    expect(typeof recent[0]?.timestamp).toBe('string');
  });

  it('does not forward logs to server logger in production', async () => {
    const { logError, errorLogger, logServerErrorMock } = await loadLogger('production');

    logError('payments', 'plain error text');

    expect(logServerErrorMock).not.toHaveBeenCalled();

    const recent = errorLogger.getRecentLogs(1);
    expect(recent[0]).toMatchObject({
      component: 'payments',
      error: 'plain error text'
    });
    expect(recent[0]?.stack).toBeUndefined();
  });

  it('keeps only the most recent 100 logs and supports clear()', async () => {
    const { logError, errorLogger } = await loadLogger('production');

    for (let index = 0; index < 105; index += 1) {
      logError('worker', `error-${index}`);
    }

    const all = errorLogger.getRecentLogs(200);
    expect(all).toHaveLength(100);
    expect(all[0]?.error).toBe('error-5');
    expect(all[99]?.error).toBe('error-104');

    errorLogger.clear();
    expect(errorLogger.getRecentLogs(10)).toEqual([]);
  });
});
