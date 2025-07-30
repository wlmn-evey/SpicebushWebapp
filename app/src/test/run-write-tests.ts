#!/usr/bin/env node

/**
 * Test runner for content-db-direct write functions
 * 
 * Usage:
 *   npm test -- src/test/lib/content-db-direct.test.ts
 *   npm test -- src/test/integration/content-db-write.test.ts
 *   npm test -- src/test/performance/content-db-write.perf.test.ts
 * 
 * Or run all write-related tests:
 *   npm test -- --grep "updateContent|deleteContent|updateSetting"
 */

console.log(`
==============================================
Content DB Write Functions - Test Suite
==============================================

Available test files:

1. Unit Tests (Mocked):
   src/test/lib/content-db-direct.test.ts
   - Tests all write functions with mocked database
   - Tests error handling and edge cases
   - Tests upsert behavior

2. Integration Tests (Real DB):
   src/test/integration/content-db-write.test.ts
   - Tests admin panel integration scenarios
   - Tests real database operations
   - Tests data integrity and workflows

3. Performance Tests:
   src/test/performance/content-db-write.perf.test.ts
   - Benchmarks write operations
   - Tests concurrent operations
   - Tests memory efficiency

To run specific tests:
  npm test -- <test-file-path>

To run tests with coverage:
  npm test -- --coverage <test-file-path>

To run tests in watch mode:
  npm test -- --watch <test-file-path>

Environment Variables Required:
  DB_READONLY_HOST (default: localhost)
  DB_READONLY_PORT (default: 54322)
  DB_READONLY_DATABASE (default: postgres)
  DB_READONLY_USER (required)
  DB_READONLY_PASSWORD (required)
`);