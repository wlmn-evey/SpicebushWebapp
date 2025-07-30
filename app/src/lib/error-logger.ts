/**
 * Simple error logging utility for debugging server-side errors
 * In production, this should be replaced with a proper logging service
 */

interface ErrorLogEntry {
  timestamp: string;
  component: string;
  error: string;
  stack?: string;
  context?: Record<string, any>;
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 100; // Keep only recent logs in memory

  log(component: string, error: Error | unknown, context?: Record<string, any>) {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      component,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context
    };

    // In development, log to console
    if (import.meta.env.DEV) {
      console.error(`[${component}] Error:`, error);
      if (context) {
        console.error('Context:', context);
      }
    }

    // Store in memory (in production, send to logging service)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // In production, you would send to a service like:
    // - Sentry
    // - LogRocket
    // - Custom logging endpoint
  }

  getRecentLogs(count = 10): ErrorLogEntry[] {
    return this.logs.slice(-count);
  }

  clear() {
    this.logs = [];
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();

// Helper function for easy logging
export function logError(component: string, error: Error | unknown, context?: Record<string, any>) {
  errorLogger.log(component, error, context);
}