import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIRoute } from 'astro';
import { POST, GET } from '../../pages/api/newsletter/subscribe';

// Mock dependencies
vi.mock('@lib/api-utils', () => ({
  errorResponse: vi.fn((message: string, status: number) => 
    new Response(JSON.stringify({ error: message }), { 
      status, 
      headers: { 'Content-Type': 'application/json' } 
    })
  )
}));

vi.mock('@lib/form-validation', () => ({
  validators: {
    email: vi.fn((email: string) => {
      if (!email) return 'Email is required';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email) ? null : 'Please enter a valid email address';
    })
  }
}));

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  insert: vi.fn(),
  update: vi.fn()
};

vi.mock('@lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      mockSupabase.from(table);
      if (table === 'newsletter_subscribers') {
        return {
          select: () => {
            mockSupabase.select();
            return {
              eq: (field: string, value: any) => {
                mockSupabase.eq(field, value);
                return {
                  single: () => {
                    mockSupabase.single();
                    return Promise.resolve({ data: null, error: null });
                  }
                };
              }
            };
          },
          insert: (data: any) => {
            mockSupabase.insert(data);
            return {
              select: () => {
                mockSupabase.select();
                return {
                  single: () => {
                    mockSupabase.single();
                    return Promise.resolve({
                      data: {
                        id: '123',
                        email: data.email,
                        subscription_type: data.subscription_type || 'general',
                        subscription_status: 'active',
                        created_at: new Date().toISOString()
                      },
                      error: null
                    });
                  }
                };
              }
            };
          },
          update: (data: any) => {
            mockSupabase.update(data);
            return {
              eq: (field: string, value: any) => {
                mockSupabase.eq(field, value);
                return {
                  select: () => {
                    mockSupabase.select();
                    return {
                      single: () => {
                        mockSupabase.single();
                        return Promise.resolve({
                          data: {
                            id: '123',
                            email: value,
                            subscription_status: 'active',
                            updated_at: data.updated_at
                          },
                          error: null
                        });
                      }
                    };
                  }
                };
              }
            };
          }
        };
      } else if (table === 'newsletter_signup_logs') {
        return {
          insert: (data: any) => {
            mockSupabase.insert(data);
            return Promise.resolve({ data, error: null });
          }
        };
      }
      return {};
    }
  }
}));

describe('Newsletter Subscribe API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/newsletter/subscribe', () => {
    it('should successfully subscribe a new email', async () => {
      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '127.0.0.1'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          subscription_type: 'general',
          signup_source: 'website'
        })
      });

      const response = await POST({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Thank you for subscribing to our newsletter!');
      expect(result.subscriber.email).toBe('test@example.com');
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        subscription_type: 'general',
        signup_source: 'website'
      }));
    });

    it('should reject invalid email addresses', async () => {
      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email'
        })
      });

      const response = await POST({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Please enter a valid email address');
    });

    it('should handle existing active subscriber', async () => {
      // Mock existing subscriber
      const existingSubscriber = {
        id: '123',
        email: 'existing@example.com',
        subscription_status: 'active'
      };

      vi.mocked(mockSupabase.single).mockResolvedValueOnce({
        data: existingSubscriber,
        error: null
      });

      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@example.com'
        })
      });

      const response = await POST({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toBe('You are already subscribed to our newsletter!');
    });

    it('should reactivate unsubscribed user', async () => {
      // Mock unsubscribed user
      const unsubscribedUser = {
        id: '123',
        email: 'unsubbed@example.com',
        subscription_status: 'unsubscribed'
      };

      vi.mocked(mockSupabase.single).mockResolvedValueOnce({
        data: unsubscribedUser,
        error: null
      });

      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'unsubbed@example.com'
        })
      });

      const response = await POST({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Welcome back! You have been resubscribed to our newsletter.');
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        subscription_status: 'active',
        unsubscribed_at: null
      }));
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(mockSupabase.single).mockRejectedValueOnce(new Error('Database error'));

      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com'
        })
      });

      const response = await POST({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Failed to process subscription');
    });

    it('should log signup attempts', async () => {
      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-agent': 'Test Browser',
          'x-forwarded-for': '192.168.1.1'
        },
        body: JSON.stringify({
          email: 'test@example.com'
        })
      });

      await POST({ request } as any);

      expect(mockSupabase.from).toHaveBeenCalledWith('newsletter_signup_logs');
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        email: 'test@example.com',
        signup_successful: true,
        ip_address: '192.168.1.1',
        user_agent: 'Test Browser'
      }));
    });

    it('should normalize email to lowercase', async () => {
      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'TeSt@ExAmPlE.com'
        })
      });

      await POST({ request } as any);

      expect(mockSupabase.eq).toHaveBeenCalledWith('email', 'test@example.com');
    });

    it('should handle missing optional fields', async () => {
      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'minimal@example.com'
        })
      });

      const response = await POST({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        email: 'minimal@example.com',
        first_name: null,
        last_name: null,
        subscription_type: 'general',
        signup_source: 'website'
      }));
    });

    it('should trim whitespace from input fields', async () => {
      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '  test@example.com  ',
          first_name: '  John  ',
          last_name: '  Doe  '
        })
      });

      await POST({ request } as any);

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe'
      }));
    });

    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      const response = await POST({ request } as any);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Failed to process subscription');
    });
  });

  describe('GET /api/newsletter/subscribe', () => {
    it('should return generic message for email status check', async () => {
      const url = new URL('http://localhost/api/newsletter/subscribe?email=test@example.com');
      const response = await GET({ url } as any);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.message).toBe('Please check your email for subscription status');
    });

    it('should require email parameter', async () => {
      const url = new URL('http://localhost/api/newsletter/subscribe');
      const response = await GET({ url } as any);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Email parameter required');
    });

    it('should handle errors gracefully', async () => {
      // Mock URL parsing error
      const url = { searchParams: { get: () => { throw new Error('URL parse error'); } } };
      const response = await GET({ url } as any);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Failed to check subscription status');
    });
  });
});