/**
 * Path Alias Resolution Test
 * 
 * This test verifies that all configured path aliases work correctly
 * in the local development environment after the Docker build improvements.
 * 
 * Tests the following aliases:
 * - @lib
 * - @components
 * - @layouts
 * - @utils
 */

import { describe, it, expect } from 'vitest';

// Test imports using path aliases
import { safeParseDate } from '@lib/date-utils';
import { testHelper, TEST_CONSTANT } from '@utils/test-helper';
import { componentHelper, COMPONENT_TEST } from '@components/test-component-helper';
import { layoutHelper, LAYOUT_TEST } from '@layouts/test-layout-helper';

// Import type definitions to verify TypeScript path resolution
import type { Photo } from '@/types/photo';

describe('Path Alias Resolution', () => {
  it('should resolve @lib alias correctly', () => {
    // Test that we can import and use a function from @lib
    const testDate = new Date('2025-07-29');
    const result = safeParseDate(testDate);
    
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe(testDate.toISOString());
  });

  it('should resolve @utils alias correctly', () => {
    // Test that we can import and use functions/constants from @utils
    const message = 'Testing path aliases';
    const result = testHelper(message);
    
    expect(result).toBe(`Test helper: ${message}`);
    expect(TEST_CONSTANT).toBe('Path alias @utils is working correctly');
  });

  it('should resolve @ alias for types', () => {
    // Test that TypeScript types are resolved correctly
    const photo: Partial<Photo> = {
      id: 'test-photo',
      title: 'Test Photo',
      category: 'classroom'
    };
    
    expect(photo.id).toBe('test-photo');
    expect(photo.category).toBe('classroom');
  });

  it('should handle invalid date parsing from @lib', () => {
    // Additional test to verify error handling works correctly
    const invalidDate = safeParseDate('invalid-date');
    expect(invalidDate).toBeNull();
  });
});

/**
 * Component and Layout Path Resolution Test
 */
describe('Component and Layout Alias Resolution', () => {
  it('should resolve @components alias correctly', () => {
    // Test that we can import and use functions/constants from @components
    const result = componentHelper();
    
    expect(result).toBe('Component helper loaded from @components');
    expect(COMPONENT_TEST).toBe('Path alias @components is working');
  });

  it('should resolve @layouts alias correctly', () => {
    // Test that we can import and use functions/constants from @layouts
    const result = layoutHelper();
    
    expect(result).toBe('Layout helper loaded from @layouts');
    expect(LAYOUT_TEST).toBe('Path alias @layouts is working');
  });
});

/**
 * Comprehensive Path Alias Test
 * 
 * This test verifies that all aliases are properly configured
 * and can be used in combination.
 */
describe('Combined Path Alias Usage', () => {
  it('should work with multiple aliases in the same test', () => {
    // Use multiple aliases to ensure no conflicts
    const dateResult = safeParseDate(new Date());
    const utilResult = testHelper('combined test');
    
    expect(dateResult).toBeInstanceOf(Date);
    expect(utilResult).toContain('combined test');
  });

  it('should maintain correct module isolation', () => {
    // Verify that imports from different aliases don't interfere
    const date1 = safeParseDate('2025-01-01T00:00:00.000Z');
    const date2 = safeParseDate('2025-12-31T00:00:00.000Z');
    
    expect(date1).not.toBe(date2);
    expect(date1).toBeInstanceOf(Date);
    expect(date2).toBeInstanceOf(Date);
    
    // Verify the dates are different
    if (date1 && date2) {
      expect(date1.getTime()).not.toBe(date2.getTime());
    }
  });
});