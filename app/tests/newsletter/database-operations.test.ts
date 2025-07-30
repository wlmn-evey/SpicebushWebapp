/**
 * Newsletter Database Operations Tests
 * Tests for newsletter-related database functions in content-db-direct.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Client } from 'pg';

// Mock the PostgreSQL client
vi.mock('pg', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    query: vi.fn(),
    end: vi.fn().mockResolvedValue(undefined)
  }))
}));

// Mock the error logger
vi.mock('@lib/error-logger', () => ({
  logError: vi.fn()
}));

// Import the functions to test
const dbModule = await import('../../src/lib/content-db-direct');

describe('Newsletter Database Operations', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mocked client instance
    mockClient = new Client();
    // Replace the module's client with our mock
    (dbModule as any).client = mockClient;
  });

  describe('subscribeToNewsletter', () => {
    it('should successfully subscribe a new user', async () => {
      // Mock query responses
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing subscriber
        .mockResolvedValueOnce({ 
          rows: [{
            id: 1,
            email: 'new@example.com',
            first_name: 'John',
            last_name: 'Doe',
            subscription_type: 'general',
            subscription_status: 'active',
            created_at: new Date(),
            updated_at: new Date()
          }],
          rowCount: 1
        }); // Insert new subscriber

      const result = await dbModule.subscribeToNewsletter({
        email: 'new@example.com',
        first_name: 'John',
        last_name: 'Doe',
        subscription_type: 'general',
        signup_source: 'website',
        signup_page: '/home'
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Successfully subscribed to newsletter!');
      expect(result.subscriber?.email).toBe('new@example.com');

      // Verify queries
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM newsletter_subscribers WHERE email = $1',
        ['new@example.com']
      );
    });

    it('should handle existing active subscriber', async () => {
      mockClient.query.mockResolvedValueOnce({ 
        rows: [{
          email: 'existing@example.com',
          subscription_status: 'active'
        }]
      });

      const result = await dbModule.subscribeToNewsletter({
        email: 'existing@example.com'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('You are already subscribed to our newsletter!');
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    it('should resubscribe unsubscribed users', async () => {
      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{
            email: 'unsubbed@example.com',
            subscription_status: 'unsubscribed'
          }]
        }) // Check existing
        .mockResolvedValueOnce({ 
          rows: [{
            email: 'unsubbed@example.com',
            subscription_status: 'active'
          }],
          rowCount: 1
        }); // Update to active

      const result = await dbModule.subscribeToNewsletter({
        email: 'unsubbed@example.com'
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Welcome back! You have been resubscribed to our newsletter.');
      
      // Verify update query
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE newsletter_subscribers'),
        expect.arrayContaining(['unsubbed@example.com'])
      );
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await dbModule.subscribeToNewsletter({
        email: 'error@example.com'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Sorry, there was an error subscribing you to our newsletter. Please try again.');
    });

    it('should normalize email to lowercase', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ 
          rows: [{ email: 'test@example.com' }],
          rowCount: 1
        });

      await dbModule.subscribeToNewsletter({
        email: 'TEST@EXAMPLE.COM'
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        ['test@example.com']
      );
    });
  });

  describe('unsubscribeFromNewsletter', () => {
    it('should successfully unsubscribe an active user', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await dbModule.unsubscribeFromNewsletter('unsub@example.com');

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE newsletter_subscribers'),
        ['unsub@example.com']
      );
    });

    it('should return false for non-existent email', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 0 });

      const result = await dbModule.unsubscribeFromNewsletter('notfound@example.com');

      expect(result).toBe(false);
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Update failed'));

      const result = await dbModule.unsubscribeFromNewsletter('error@example.com');

      expect(result).toBe(false);
    });
  });

  describe('getNewsletterSubscribers', () => {
    const mockSubscribers = [
      {
        email: 'sub1@example.com',
        subscription_status: 'active',
        subscription_type: 'general'
      },
      {
        email: 'sub2@example.com',
        subscription_status: 'active',
        subscription_type: 'parents'
      }
    ];

    it('should return all subscribers without filters', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: mockSubscribers });

      const result = await dbModule.getNewsletterSubscribers();

      expect(result).toEqual(mockSubscribers);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM newsletter_subscribers'),
        []
      );
    });

    it('should apply status filter', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: mockSubscribers });

      const result = await dbModule.getNewsletterSubscribers({ status: 'active' });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('subscription_status = $1'),
        ['active']
      );
    });

    it('should apply type filter', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [mockSubscribers[1]] });

      const result = await dbModule.getNewsletterSubscribers({ 
        status: 'active', 
        type: 'parents' 
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('subscription_type = $2'),
        ['active', 'parents']
      );
    });

    it('should apply pagination', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: mockSubscribers });

      const result = await dbModule.getNewsletterSubscribers({ 
        limit: 10, 
        offset: 20 
      });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [10, 20]
      );
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Query failed'));

      const result = await dbModule.getNewsletterSubscribers();

      expect(result).toEqual([]);
    });
  });

  describe('getNewsletterStats', () => {
    it('should return complete statistics', async () => {
      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{
            total: '150',
            active: '120',
            unsubscribed: '30',
            recent: '15'
          }]
        }) // Overall stats
        .mockResolvedValueOnce({ 
          rows: [
            { subscription_type: 'general', count: '80' },
            { subscription_type: 'parents', count: '40' }
          ]
        }); // Type breakdown

      const result = await dbModule.getNewsletterStats();

      expect(result).toEqual({
        total_subscribers: 150,
        active_subscribers: 120,
        unsubscribed_count: 30,
        recent_signups: 15,
        types_breakdown: {
          general: 80,
          parents: 40
        }
      });

      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    it('should handle empty statistics', async () => {
      mockClient.query
        .mockResolvedValueOnce({ 
          rows: [{
            total: '0',
            active: '0',
            unsubscribed: '0',
            recent: '0'
          }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await dbModule.getNewsletterStats();

      expect(result.total_subscribers).toBe(0);
      expect(result.types_breakdown).toEqual({});
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Stats query failed'));

      const result = await dbModule.getNewsletterStats();

      expect(result).toEqual({
        total_subscribers: 0,
        active_subscribers: 0,
        unsubscribed_count: 0,
        recent_signups: 0,
        types_breakdown: {}
      });
    });
  });

  describe('logNewsletterSignup', () => {
    it('should log successful signup attempt', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await dbModule.logNewsletterSignup(
        'log@example.com',
        true,
        undefined,
        {
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          signup_page: '/home'
        }
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO newsletter_signup_logs'),
        [
          'log@example.com',
          true,
          null,
          '192.168.1.1',
          'Mozilla/5.0',
          '/home'
        ]
      );
    });

    it('should log failed signup attempt with error', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      await dbModule.logNewsletterSignup(
        'fail@example.com',
        false,
        'Email already exists'
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO newsletter_signup_logs'),
        expect.arrayContaining([
          'fail@example.com',
          false,
          'Email already exists'
        ])
      );
    });

    it('should handle logging errors silently', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Insert failed'));

      // Should not throw
      await expect(
        dbModule.logNewsletterSignup('error@example.com', true)
      ).resolves.not.toThrow();
    });
  });
});