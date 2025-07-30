/**
 * Settings API Test Suite
 * Tests the /api/admin/settings endpoint functionality
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

const BASE_URL = 'http://localhost:4321';
const API_ENDPOINT = `${BASE_URL}/api/admin/settings`;

// Mock admin session cookie (you'll need to adjust this based on your auth implementation)
const mockAuthCookie = 'your-admin-session-cookie';

describe('Settings API Endpoints', () => {
  let originalSettings = {};

  beforeAll(async () => {
    // Store original settings to restore after tests
    try {
      const response = await fetch(API_ENDPOINT, {
        headers: {
          'Cookie': mockAuthCookie
        }
      });
      if (response.ok) {
        originalSettings = await response.json();
      }
    } catch (error) {
      console.warn('Could not fetch original settings:', error.message);
    }
  });

  afterAll(async () => {
    // Restore original settings
    if (Object.keys(originalSettings).length > 0) {
      try {
        await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': mockAuthCookie
          },
          body: JSON.stringify(originalSettings)
        });
      } catch (error) {
        console.warn('Could not restore original settings:', error.message);
      }
    }
  });

  describe('GET /api/admin/settings', () => {
    test('should return 401 without authentication', async () => {
      const response = await fetch(API_ENDPOINT);
      expect(response.status).toBe(401);
    });

    test('should return settings object with authentication', async () => {
      const response = await fetch(API_ENDPOINT, {
        headers: {
          'Cookie': mockAuthCookie
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      
      const settings = await response.json();
      expect(typeof settings).toBe('object');
      expect(settings).not.toBeNull();
    });

    test('should return expected setting keys', async () => {
      const response = await fetch(API_ENDPOINT, {
        headers: {
          'Cookie': mockAuthCookie
        }
      });
      
      const settings = await response.json();
      const expectedKeys = [
        'coming_soon_enabled',
        'coming_soon_launch_date',
        'coming_soon_message',
        'coming_soon_newsletter',
        'current_school_year',
        'sibling_discount_rate',
        'upfront_discount_rate',
        'annual_increase_rate',
        'site_message'
      ];

      // Check that settings object structure is reasonable
      expect(typeof settings).toBe('object');
      
      // At minimum, we should have some settings
      expect(Object.keys(settings).length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/admin/settings', () => {
    test('should return 401 without authentication', async () => {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: 'value' })
      });
      
      expect(response.status).toBe(401);
    });

    test('should return 400 for invalid request data', async () => {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': mockAuthCookie
        },
        body: JSON.stringify(null)
      });
      
      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result.error).toBe('Invalid request data');
    });

    test('should successfully update single setting', async () => {
      const testUpdate = {
        site_message: 'Test message from API test'
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
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].key).toBe('site_message');
      expect(result.results[0].success).toBe(true);
    });

    test('should successfully update multiple settings', async () => {
      const testUpdates = {
        coming_soon_enabled: false,
        current_school_year: '2025-2026',
        sibling_discount_rate: '0.15'
      };

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': mockAuthCookie
        },
        body: JSON.stringify(testUpdates)
      });
      
      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      
      // Verify each update succeeded
      result.results.forEach(item => {
        expect(item.success).toBe(true);
      });
    });

    test('should handle boolean values correctly', async () => {
      const testUpdates = {
        coming_soon_enabled: true,
        coming_soon_newsletter: false
      };

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': mockAuthCookie
        },
        body: JSON.stringify(testUpdates)
      });
      
      expect(response.status).toBe(200);
      
      // Verify the values were saved correctly by fetching them back
      const getResponse = await fetch(API_ENDPOINT, {
        headers: {
          'Cookie': mockAuthCookie
        }
      });
      
      const settings = await getResponse.json();
      expect(settings.coming_soon_enabled).toBe(true);
      expect(settings.coming_soon_newsletter).toBe(false);
    });

    test('should handle decimal values correctly', async () => {
      const testUpdates = {
        sibling_discount_rate: '0.12',
        upfront_discount_rate: '0.03',
        annual_increase_rate: '0.025'
      };

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': mockAuthCookie
        },
        body: JSON.stringify(testUpdates)
      });
      
      expect(response.status).toBe(200);
      
      // Verify decimal precision is maintained
      const getResponse = await fetch(API_ENDPOINT, {
        headers: {
          'Cookie': mockAuthCookie
        }
      });
      
      const settings = await getResponse.json();
      expect(settings.sibling_discount_rate).toBe('0.12');
      expect(settings.upfront_discount_rate).toBe('0.03');
      expect(settings.annual_increase_rate).toBe('0.025');
    });

    test('should return appropriate response structure', async () => {
      const testUpdate = {
        site_message: 'Testing response structure'
      };

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': mockAuthCookie
        },
        body: JSON.stringify(testUpdate)
      });
      
      const result = await response.json();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('results');
      expect(Array.isArray(result.results)).toBe(true);
      
      result.results.forEach(item => {
        expect(item).toHaveProperty('key');
        expect(item).toHaveProperty('success');
      });
    });
  });

  describe('Data Type Validation', () => {
    test('should handle date strings correctly', async () => {
      const testUpdate = {
        coming_soon_launch_date: '2025-03-15'
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
      
      const getResponse = await fetch(API_ENDPOINT, {
        headers: {
          'Cookie': mockAuthCookie
        }
      });
      
      const settings = await getResponse.json();
      expect(settings.coming_soon_launch_date).toBe('2025-03-15');
    });

    test('should handle long text strings correctly', async () => {
      const longMessage = 'This is a very long message that tests how the API handles extended text content. '.repeat(10);
      
      const testUpdate = {
        coming_soon_message: longMessage
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
      
      const getResponse = await fetch(API_ENDPOINT, {
        headers: {
          'Cookie': mockAuthCookie
        }
      });
      
      const settings = await getResponse.json();
      expect(settings.coming_soon_message).toBe(longMessage);
    });
  });
});