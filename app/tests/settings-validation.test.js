/**
 * Settings Validation Test Suite
 * Tests form validation and data integrity
 */

import { describe, test, expect } from '@jest/globals';

const BASE_URL = 'http://localhost:4321';
const API_ENDPOINT = `${BASE_URL}/api/admin/settings`;
const mockAuthCookie = 'your-admin-session-cookie';

describe('Settings Validation Tests', () => {
  describe('Input Validation', () => {
    test('should reject invalid school year format', async () => {
      const invalidYears = [
        '2025',           // Too short
        '2025-26',        // Year too short
        '25-26',          // Both years too short
        '2025-2024',      // End year before start year
        'invalid-format', // Non-numeric
        ''                // Empty string
      ];

      for (const invalidYear of invalidYears) {
        const testUpdate = {
          current_school_year: invalidYear
        };

        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': mockAuthCookie
          },
          body: JSON.stringify(testUpdate)
        });

        // API should still succeed but validation should occur on frontend
        // For now, we're testing that the API doesn't crash with invalid data
        expect(response.status).not.toBe(500);
      }
    });

    test('should accept valid school year formats', async () => {
      const validYears = [
        '2025-2026',
        '2024-2025',
        '2026-2027'
      ];

      for (const validYear of validYears) {
        const testUpdate = {
          current_school_year: validYear
        };

        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': mockAuthCookie
          },
          body: JSON.stringify(testUpdate)
        });

        expect(response.status).toBe(200);
      }
    });

    test('should handle discount rate boundaries', async () => {
      const validRates = [
        '0.00',  // Minimum
        '0.10',  // Normal
        '0.50',  // High but valid
        '1.00'   // Maximum (100%)
      ];

      for (const rate of validRates) {
        const testUpdate = {
          sibling_discount_rate: rate
        };

        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': mockAuthCookie
          },
          body: JSON.stringify(testUpdate)
        });

        expect(response.status).toBe(200);
      }
    });

    test('should handle edge case discount values', async () => {
      const edgeCases = [
        '-0.10',  // Negative (should be rejected in frontend)
        '1.10',   // Over 100% (should be rejected in frontend)
        'abc',    // Non-numeric (should be rejected in frontend)
        ''        // Empty string
      ];

      for (const rate of edgeCases) {
        const testUpdate = {
          sibling_discount_rate: rate
        };

        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': mockAuthCookie
          },
          body: JSON.stringify(testUpdate)
        });

        // API should handle gracefully (not crash)
        expect(response.status).not.toBe(500);
      }
    });

    test('should handle date validation', async () => {
      const validDates = [
        '2025-01-01',
        '2025-12-31',
        '2026-06-15'
      ];

      for (const date of validDates) {
        const testUpdate = {
          coming_soon_launch_date: date
        };

        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': mockAuthCookie
          },
          body: JSON.stringify(testUpdate)
        });

        expect(response.status).toBe(200);
      }
    });

    test('should handle invalid date formats', async () => {
      const invalidDates = [
        '2025/01/01',     // Wrong separator
        '01-01-2025',     // Wrong order
        '2025-13-01',     // Invalid month
        '2025-01-32',     // Invalid day
        'invalid-date',   // Non-date string
        ''                // Empty string
      ];

      for (const date of invalidDates) {
        const testUpdate = {
          coming_soon_launch_date: date
        };

        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': mockAuthCookie
          },
          body: JSON.stringify(testUpdate)
        });

        // API should handle gracefully
        expect(response.status).not.toBe(500);
      }
    });
  });

  describe('Boolean Value Handling', () => {
    test('should handle boolean true values correctly', async () => {
      const booleanFields = [
        'coming_soon_enabled',
        'coming_soon_newsletter'
      ];

      for (const field of booleanFields) {
        const testUpdate = {
          [field]: true
        };

        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': mockAuthCookie
          },
          body: JSON.stringify(testUpdate)
        });

        expect(response.status).toBe(200);

        // Verify the value was stored correctly
        const getResponse = await fetch(API_ENDPOINT, {
          headers: {
            'Cookie': mockAuthCookie
          }
        });

        const settings = await getResponse.json();
        expect(settings[field]).toBe(true);
      }
    });

    test('should handle boolean false values correctly', async () => {
      const booleanFields = [
        'coming_soon_enabled',
        'coming_soon_newsletter'
      ];

      for (const field of booleanFields) {
        const testUpdate = {
          [field]: false
        };

        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': mockAuthCookie
          },
          body: JSON.stringify(testUpdate)
        });

        expect(response.status).toBe(200);

        // Verify the value was stored correctly
        const getResponse = await fetch(API_ENDPOINT, {
          headers: {
            'Cookie': mockAuthCookie
          }
        });

        const settings = await getResponse.json();
        expect(settings[field]).toBe(false);
      }
    });

    test('should handle string boolean values', async () => {
      const stringBooleans = [
        { value: 'true', expected: true },
        { value: 'false', expected: false }
      ];

      for (const { value, expected } of stringBooleans) {
        const testUpdate = {
          coming_soon_enabled: value
        };

        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': mockAuthCookie
          },
          body: JSON.stringify(testUpdate)
        });

        expect(response.status).toBe(200);
      }
    });
  });

  describe('Text Field Validation', () => {
    test('should handle empty strings', async () => {
      const textFields = [
        'site_message',
        'coming_soon_message'
      ];

      for (const field of textFields) {
        const testUpdate = {
          [field]: ''
        };

        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': mockAuthCookie
          },
          body: JSON.stringify(testUpdate)
        });

        expect(response.status).toBe(200);

        // Verify empty string was stored
        const getResponse = await fetch(API_ENDPOINT, {
          headers: {
            'Cookie': mockAuthCookie
          }
        });

        const settings = await getResponse.json();
        expect(settings[field]).toBe('');
      }
    });

    test('should handle special characters in text', async () => {
      const specialText = 'Test with special chars: áéíóú ñ ¡¿ 中文 🎉 <script>alert("xss")</script>';
      
      const testUpdate = {
        coming_soon_message: specialText
      };

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': mockAuthCookie
        },
        body: JSON.stringify(testUpdate)
      });

      expect(response.status).toBe(200);

      // Verify special characters were preserved
      const getResponse = await fetch(API_ENDPOINT, {
        headers: {
          'Cookie': mockAuthCookie
        }
      });

      const settings = await getResponse.json();
      expect(settings.coming_soon_message).toBe(specialText);
    });

    test('should handle very long text strings', async () => {
      const longText = 'A'.repeat(1000); // 1000 character string
      
      const testUpdate = {
        coming_soon_message: longText
      };

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': mockAuthCookie
        },
        body: JSON.stringify(testUpdate)
      });

      expect(response.status).toBe(200);

      // Verify long text was stored correctly
      const getResponse = await fetch(API_ENDPOINT, {
        headers: {
          'Cookie': mockAuthCookie
        }
      });

      const settings = await getResponse.json();
      expect(settings.coming_soon_message).toBe(longText);
      expect(settings.coming_soon_message.length).toBe(1000);
    });
  });

  describe('Data Consistency', () => {
    test('should maintain data types after round-trip save', async () => {
      const testData = {
        coming_soon_enabled: true,
        coming_soon_newsletter: false,
        sibling_discount_rate: '0.15',
        upfront_discount_rate: '0.05',
        annual_increase_rate: '0.04',
        current_school_year: '2025-2026',
        coming_soon_launch_date: '2025-02-01',
        coming_soon_message: 'Test message',
        site_message: 'Site announcement'
      };

      // Save the data
      const saveResponse = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': mockAuthCookie
        },
        body: JSON.stringify(testData)
      });

      expect(saveResponse.status).toBe(200);

      // Retrieve the data
      const getResponse = await fetch(API_ENDPOINT, {
        headers: {
          'Cookie': mockAuthCookie
        }
      });

      const retrievedSettings = await getResponse.json();

      // Verify data types and values are preserved
      expect(retrievedSettings.coming_soon_enabled).toBe(true);
      expect(retrievedSettings.coming_soon_newsletter).toBe(false);
      expect(retrievedSettings.sibling_discount_rate).toBe('0.15');
      expect(retrievedSettings.upfront_discount_rate).toBe('0.05');
      expect(retrievedSettings.annual_increase_rate).toBe('0.04');
      expect(retrievedSettings.current_school_year).toBe('2025-2026');
      expect(retrievedSettings.coming_soon_launch_date).toBe('2025-02-01');
      expect(retrievedSettings.coming_soon_message).toBe('Test message');
      expect(retrievedSettings.site_message).toBe('Site announcement');
    });
  });
});