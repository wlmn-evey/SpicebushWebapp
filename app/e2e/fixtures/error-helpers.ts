import { Page } from '@playwright/test';

export interface JavaScriptError {
  message: string;
  source?: string;
  line?: number;
  col?: number;
  stack?: string;
  timestamp: string;
}

export interface NetworkError {
  method: string;
  url: string;
  status?: number;
  error?: string;
  timestamp: string;
}

export async function checkForJavaScriptErrors(page: Page): Promise<JavaScriptError[]> {
  const errors: JavaScriptError[] = [];
  
  // Listen for console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({
        message: msg.text(),
        source: msg.location().url,
        line: msg.location().lineNumber,
        col: msg.location().columnNumber,
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  // Listen for page errors
  page.on('pageerror', (error) => {
    errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  });
  
  // Inject error collector into the page
  await page.addInitScript(() => {
    window.__jsErrors = [];
    window.__originalError = window.onerror;
    
    window.onerror = function(message, source, lineno, colno, error) {
      window.__jsErrors.push({
        message: String(message),
        source,
        line: lineno,
        col: colno,
        stack: error?.stack,
        timestamp: new Date().toISOString(),
      });
      
      // Call original error handler if it exists
      if (window.__originalError) {
        return window.__originalError(message, source, lineno, colno, error);
      }
      return false;
    };
    
    // Also catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      window.__jsErrors.push({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        timestamp: new Date().toISOString(),
      });
    });
  });
  
  return errors;
}

export async function checkForNetworkErrors(page: Page): Promise<NetworkError[]> {
  const errors: NetworkError[] = [];
  
  // Listen for failed requests
  page.on('requestfailed', (request) => {
    errors.push({
      method: request.method(),
      url: request.url(),
      error: request.failure()?.errorText,
      timestamp: new Date().toISOString(),
    });
  });
  
  // Listen for 4xx and 5xx responses
  page.on('response', (response) => {
    if (response.status() >= 400) {
      errors.push({
        method: response.request().method(),
        url: response.url(),
        status: response.status(),
        error: `HTTP ${response.status()} ${response.statusText()}`,
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  return errors;
}

export async function getCollectedErrors(page: Page): Promise<JavaScriptError[]> {
  // Get errors collected by our injected script
  const collectedErrors = await page.evaluate(() => {
    return window.__jsErrors || [];
  });
  
  return collectedErrors;
}

export function formatErrorReport(jsErrors: JavaScriptError[], networkErrors: NetworkError[]): string {
  let report = '# Error Report\n\n';
  
  if (jsErrors.length > 0) {
    report += '## JavaScript Errors\n\n';
    jsErrors.forEach((error, index) => {
      report += `### Error ${index + 1}\n`;
      report += `- **Message**: ${error.message}\n`;
      if (error.source) report += `- **Source**: ${error.source}\n`;
      if (error.line) report += `- **Line**: ${error.line}\n`;
      if (error.col) report += `- **Column**: ${error.col}\n`;
      if (error.stack) report += `- **Stack**:\n\`\`\`\n${error.stack}\n\`\`\`\n`;
      report += `- **Time**: ${error.timestamp}\n\n`;
    });
  }
  
  if (networkErrors.length > 0) {
    report += '## Network Errors\n\n';
    networkErrors.forEach((error, index) => {
      report += `### Error ${index + 1}\n`;
      report += `- **Method**: ${error.method}\n`;
      report += `- **URL**: ${error.url}\n`;
      if (error.status) report += `- **Status**: ${error.status}\n`;
      if (error.error) report += `- **Error**: ${error.error}\n`;
      report += `- **Time**: ${error.timestamp}\n\n`;
    });
  }
  
  if (jsErrors.length === 0 && networkErrors.length === 0) {
    report += 'No errors detected! ✅\n';
  }
  
  return report;
}

// Helper to check if page has any broken resources
export async function checkBrokenResources(page: Page) {
  const brokenResources = {
    images: [] as string[],
    scripts: [] as string[],
    stylesheets: [] as string[],
  };
  
  // Check images
  brokenResources.images = await page.$$eval('img', images => 
    images
      .filter(img => !img.complete || img.naturalHeight === 0)
      .map(img => img.src)
  );
  
  // Check external scripts
  const scriptErrors: string[] = [];
  page.on('response', response => {
    if (response.request().resourceType() === 'script' && response.status() >= 400) {
      scriptErrors.push(response.url());
    }
  });
  
  // Check stylesheets
  const styleErrors: string[] = [];
  page.on('response', response => {
    if (response.request().resourceType() === 'stylesheet' && response.status() >= 400) {
      styleErrors.push(response.url());
    }
  });
  
  // Wait a bit for all resources to load
  await page.waitForTimeout(1000);
  
  brokenResources.scripts = scriptErrors;
  brokenResources.stylesheets = styleErrors;
  
  return brokenResources;
}

// Helper to detect infinite loops or excessive recursion
export async function detectInfiniteLoops(page: Page, timeout: number = 5000): Promise<boolean> {
  let loopDetected = false;
  
  await page.addInitScript(() => {
    let callCount = 0;
    const maxCalls = 1000;
    const callTracker = new Map<string, number>();
    
    // Track function calls
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    
    window.setTimeout = function(...args) {
      callCount++;
      const stack = new Error().stack || '';
      const key = stack.split('\n')[2] || 'unknown';
      callTracker.set(key, (callTracker.get(key) || 0) + 1);
      
      if (callCount > maxCalls || (callTracker.get(key) || 0) > 100) {
        console.error('Possible infinite loop detected in setTimeout');
        window.__infiniteLoopDetected = true;
      }
      
      return originalSetTimeout.apply(this, args);
    };
    
    window.setInterval = function(...args) {
      callCount++;
      if (callCount > maxCalls) {
        console.error('Possible infinite loop detected in setInterval');
        window.__infiniteLoopDetected = true;
      }
      return originalSetInterval.apply(this, args);
    };
  });
  
  // Wait and check
  await page.waitForTimeout(timeout);
  
  loopDetected = await page.evaluate(() => {
    return window.__infiniteLoopDetected || false;
  });
  
  return loopDetected;
}

// Declare global types for TypeScript
declare global {
  interface Window {
    __jsErrors: JavaScriptError[];
    __originalError: OnErrorEventHandler | null;
    __infiniteLoopDetected: boolean;
  }
}