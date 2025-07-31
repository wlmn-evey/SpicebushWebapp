/**
 * Content Verification Test Configuration
 * 
 * Centralized configuration for content verification tests.
 * Update these values when site content changes to keep tests current.
 */

export const CONTENT_VERIFICATION_CONFIG = {
  // Business Information
  BUSINESS_INFO: {
    PHONE: '(484) 202-0712',
    EMAIL: 'information@spicebushmontessori.org',
    ADDRESS: {
      STREET: '827 Concord Road',
      CITY: 'Glen Mills',
      STATE: 'PA',
      ZIP: '19342'
    },
    AGES_SERVED: '3 to 6 years',
    SCHOOL_YEAR: '2025-2026',
    EXTENDED_CARE_UNTIL: '5:30 PM',
    FOUNDED: 2021,
    SOCIAL_MEDIA: {
      FACEBOOK: 'https://www.facebook.com/SpicebushMontessori',
      INSTAGRAM: 'https://www.instagram.com/spicebushmontessori'
    }
  },

  // Staff Information Expectations
  STAFF_INFO: {
    MINIMUM_STAFF_COUNT: 2,
    REQUIRED_ROLES: ['Teacher'],
    PHOTO_PATH_PATTERN: /^\/images\/(optimized\/)?teachers\//,
    PHOTO_FORMATS: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    START_YEAR_MIN: 2021, // School founding year
    LANGUAGES: ['English']
  },

  // Hours Information
  HOURS_INFO: {
    TOTAL_DAYS: 7,
    WEEKDAYS_WITH_EXTENDED_CARE: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    TIME_FORMAT_PATTERN: /^(1?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/,
    EXTENDED_CARE_END_TIME: '5:30 PM'
  },

  // Tuition and Program Information
  TUITION_INFO: {
    CURRENT_SCHOOL_YEAR: '2025-2026',
    MINIMUM_PROGRAMS: 1,
    MINIMUM_RATES: 1,
    PROGRAM_TYPES: ['Half Day', 'Full Day'],
    RATE_LABELS: ['Tuition A', 'Tuition B', 'Tuition C', 'Tuition D'],
    PRICING_RANGES: {
      MIN_TUITION: 5000,
      MAX_TUITION: 50000,
      MIN_EXTENDED_CARE: 1000,
      MAX_EXTENDED_CARE: 15000
    }
  },

  // Content Collections Expected
  REQUIRED_COLLECTIONS: {
    'school-info': { minEntries: 1, maxEntries: 1 },
    'staff': { minEntries: 1, maxEntries: 10 },
    'hours': { minEntries: 7, maxEntries: 7 },
    'tuition': { minEntries: 2, maxEntries: 50 }
  },

  // Data Validation Patterns
  VALIDATION_PATTERNS: {
    PHONE: /^\(\d{3}\) \d{3}-\d{4}$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    URL: /^https?:\/\/.+/,
    SCHOOL_YEAR: /^\d{4}-\d{4}$/,
    TIME_12H: /^(1?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/,
    ZIP_CODE: /^\d{5}(-\d{4})?$/,
    CURRENCY: /^\$[0-9,]+(\.\d{2})?$/,
    SLUG: /^[a-z0-9-]+$/
  },

  // Test Environment Settings
  TEST_SETTINGS: {
    DATABASE_TIMEOUT: 10000,
    CONTENT_LOAD_TIMEOUT: 5000,
    RETRY_ATTEMPTS: 3,
    PARALLEL_EXECUTION: true
  },

  // Error Thresholds
  ERROR_THRESHOLDS: {
    MAX_MISSING_CONTENT_WARNINGS: 5,
    MAX_FORMAT_VIOLATIONS: 10,
    MAX_CONSISTENCY_ISSUES: 3
  },

  // Test Data Expectations
  EXPECTED_CONTENT_STRUCTURE: {
    SCHOOL_INFO_FIELDS: [
      'phone', 'email', 'address', 'agesServed', 'schoolYear', 
      'extendedCareUntil', 'socialMedia', 'founded'
    ],
    STAFF_FIELDS: [
      'name', 'role', 'photo', 'languages', 'startYear', 'order'
    ],
    HOURS_FIELDS: [
      'day', 'open_time', 'close_time', 'is_closed', 'order'
    ],
    TUITION_PROGRAM_FIELDS: [
      'type', 'name', 'program_type', 'days_per_week', 'daily_hours',
      'description', 'display_order', 'active'
    ],
    TUITION_RATE_FIELDS: [
      'type', 'rate_label', 'program_id', 'tuition_price', 'extended_care_price',
      'extended_care_available', 'school_year', 'display_order', 'active'
    ]
  }
};

// Helper functions for test configuration
export const getBusinessInfo = () => CONTENT_VERIFICATION_CONFIG.BUSINESS_INFO;
export const getStaffExpectations = () => CONTENT_VERIFICATION_CONFIG.STAFF_INFO;
export const getHoursExpectations = () => CONTENT_VERIFICATION_CONFIG.HOURS_INFO;
export const getTuitionExpectations = () => CONTENT_VERIFICATION_CONFIG.TUITION_INFO;
export const getValidationPattern = (patternName: keyof typeof CONTENT_VERIFICATION_CONFIG.VALIDATION_PATTERNS) => {
  return CONTENT_VERIFICATION_CONFIG.VALIDATION_PATTERNS[patternName];
};

// Content verification test utilities
export const validateContentStructure = (content: any, expectedFields: string[]): string[] => {
  const missingFields: string[] = [];
  const contentKeys = Object.keys(content);
  
  expectedFields.forEach(field => {
    if (!contentKeys.includes(field)) {
      missingFields.push(field);
    }
  });
  
  return missingFields;
};

export const validateFormat = (value: string, pattern: RegExp): boolean => {
  return pattern.test(value);
};

export const validatePriceRange = (price: number, type: 'tuition' | 'extended_care'): boolean => {
  const ranges = CONTENT_VERIFICATION_CONFIG.TUITION_INFO.PRICING_RANGES;
  
  if (type === 'tuition') {
    return price >= ranges.MIN_TUITION && price <= ranges.MAX_TUITION;
  } else {
    return price >= ranges.MIN_EXTENDED_CARE && price <= ranges.MAX_EXTENDED_CARE;
  }
};

export const validateCollectionSize = (collectionName: string, entryCount: number): boolean => {
  const requirements = CONTENT_VERIFICATION_CONFIG.REQUIRED_COLLECTIONS[collectionName as keyof typeof CONTENT_VERIFICATION_CONFIG.REQUIRED_COLLECTIONS];
  
  if (!requirements) return true; // No requirements defined
  
  return entryCount >= requirements.minEntries && entryCount <= requirements.maxEntries;
};

// Test reporting utilities
export interface ContentVerificationResult {
  testName: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  metadata?: Record<string, any>;
}

export const createTestResult = (
  testName: string, 
  passed: boolean, 
  errors: string[] = [], 
  warnings: string[] = [],
  metadata?: Record<string, any>
): ContentVerificationResult => ({
  testName,
  passed,
  errors,
  warnings,
  metadata
});

export const formatTestReport = (results: ContentVerificationResult[]): string => {
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  
  let report = `\n=== Content Verification Test Report ===\n`;
  report += `Total Tests: ${totalTests}\n`;
  report += `Passed: ${passedTests}\n`;
  report += `Failed: ${failedTests}\n`;
  report += `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n\n`;
  
  if (failedTests > 0) {
    report += `Failed Tests:\n`;
    results.filter(r => !r.passed).forEach(result => {
      report += `  - ${result.testName}\n`;
      result.errors.forEach(error => {
        report += `    ERROR: ${error}\n`;
      });
      result.warnings.forEach(warning => {
        report += `    WARNING: ${warning}\n`;
      });
    });
  }
  
  return report;
};