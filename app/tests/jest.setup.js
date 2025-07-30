/**
 * Jest Setup Configuration
 * Global setup for all Jest tests
 */

import fetch from 'node-fetch';

// Make fetch available globally for tests
if (!globalThis.fetch) {
  globalThis.fetch = fetch;
}

// Increase timeout for network operations
jest.setTimeout(30000);

// Mock console.warn and console.error to keep test output clean
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (message, ...args) => {
  // Only show warnings that aren't expected test warnings
  if (typeof message === 'string' && !message.includes('Could not fetch original settings')) {
    originalWarn(message, ...args);
  }
};

console.error = (message, ...args) => {
  // Only show errors that aren't expected test errors
  if (typeof message === 'string' && !message.includes('Could not restore original settings')) {
    originalError(message, ...args);
  }
};