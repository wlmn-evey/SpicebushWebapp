type LogLevel = 'info' | 'warn' | 'error';

const REDACTED_KEY_PARTS = ['password', 'token', 'authorization', 'cookie', 'secret', 'apikey', 'api_key'];
const MAX_STRING_LENGTH = 400;
const MAX_DEPTH = 4;

const shouldRedact = (key: string): boolean => {
  const normalized = key.toLowerCase();
  return REDACTED_KEY_PARTS.some((part) => normalized.includes(part));
};

const sanitizeValue = (value: unknown, depth = 0): unknown => {
  if (depth > MAX_DEPTH) {
    return '[truncated]';
  }

  if (value == null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]`
      : value;
  }

  if (value instanceof Error) {
    const errorPayload: Record<string, unknown> = {
      name: value.name,
      message: value.message
    };

    if (import.meta.env.DEV && value.stack) {
      errorPayload.stack = value.stack;
    }

    return errorPayload;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = shouldRedact(key) ? '[redacted]' : sanitizeValue(nestedValue, depth + 1);
    }
    return sanitized;
  }

  return String(value);
};

const writeLine = (line: string, level: LogLevel): void => {
  if (typeof process === 'undefined') {
    return;
  }

  const stream = level === 'error' ? process.stderr : process.stdout;
  if (typeof stream?.write !== 'function') {
    return;
  }

  stream.write(`${line}\n`);
};

const emitLog = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: context ? sanitizeValue(context) : undefined
  };

  writeLine(JSON.stringify(payload), level);
};

export const logServerInfo = (message: string, context?: Record<string, unknown>): void => {
  emitLog('info', message, context);
};

export const logServerWarn = (message: string, context?: Record<string, unknown>): void => {
  emitLog('warn', message, context);
};

export const logServerError = (
  message: string,
  error: unknown,
  context?: Record<string, unknown>
): void => {
  emitLog('error', message, {
    error,
    ...context
  });
};
