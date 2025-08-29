/**
 * Email Service Integration Tests
 * 
 * Comprehensive test suite for email service functionality including:
 * - Provider configuration and fallback
 * - Magic link authentication emails
 * - Tour scheduling emails
 * - Contact form emails
 * - Error handling and recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { emailService } from '@lib/email-service';
import type { EmailMessage, EmailResult } from '@lib/email-service';

// Mock fetch for testing
global.fetch = vi.fn();

// Mock environment variables
const mockEnv = {
  UNIONE_API_KEY: 'test-unione-key',
  UNIONE_REGION: 'eu',
  EMAIL_FROM: 'noreply@spicebushmontessori.org',
  EMAIL_FROM_NAME: 'Spicebush Montessori',
  SENDGRID_API_KEY: '',
  POSTMARK_SERVER_TOKEN: '',
  RESEND_API_KEY: ''
};

// Helper to set environment variables
function setEnvVars(vars: Record<string, string>) {
  Object.entries(vars).forEach(([key, value]) => {
    process.env[key] = value;
    (import.meta as any).env[key] = value;
  });
}

// Helper to clear environment variables
function clearEnvVars() {
  Object.keys(mockEnv).forEach(key => {
    delete process.env[key];
    delete (import.meta as any).env[key];
  });
}

describe('Email Service Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearEnvVars();
  });

  afterEach(() => {
    clearEnvVars();
  });

  it('should detect when no email service is configured', async () => {
    const result = await emailService.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No email service configured');
  });

  it('should detect Unione.io configuration', () => {
    setEnvVars({ UNIONE_API_KEY: 'test-key' });
    const status = emailService.getStatus();
    expect(status.Unione).toBe(true);
  });

  it('should detect multiple provider configurations', () => {
    setEnvVars({
      UNIONE_API_KEY: 'test-unione-key',
      SENDGRID_API_KEY: 'test-sendgrid-key',
      RESEND_API_KEY: 'test-resend-key'
    });
    
    const status = emailService.getStatus();
    expect(status.Unione).toBe(true);
    expect(status.SendGrid).toBe(true);
    expect(status.Resend).toBe(true);
    expect(status.Postmark).toBe(false);
  });

  it('should use preferred provider when configured', async () => {
    setEnvVars({
      ...mockEnv,
      EMAIL_SERVICE: 'unione'
    });

    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: 'test-123' })
    } as Response);

    const result = await emailService.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>'
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('Unione');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('unione.io'),
      expect.any(Object)
    );
  });
});

describe('Unione.io Email Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnvVars(mockEnv);
  });

  afterEach(() => {
    clearEnvVars();
  });

  it('should send email successfully', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: 'test-job-123' })
    } as Response);

    const message: EmailMessage = {
      to: 'parent@example.com',
      subject: 'Welcome to Spicebush Montessori',
      html: '<h1>Welcome!</h1><p>Thank you for your interest.</p>',
      text: 'Welcome! Thank you for your interest.'
    };

    const result = await emailService.send(message);

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('test-job-123');
    expect(result.provider).toBe('Unione');

    // Verify API call
    expect(mockFetch).toHaveBeenCalledWith(
      'https://eu1.unione.io/en/transactional/api/v1/email/send.json',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: expect.stringContaining('"api_key":"test-unione-key"')
      }
    );
  });

  it('should handle multiple recipients', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: 'test-job-456' })
    } as Response);

    const result = await emailService.send({
      to: ['admin1@school.org', 'admin2@school.org'],
      subject: 'New Tour Request',
      html: '<p>New tour request received</p>'
    });

    expect(result.success).toBe(true);
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(callBody.message.recipients).toHaveLength(2);
    expect(callBody.message.recipients[0].email).toBe('admin1@school.org');
    expect(callBody.message.recipients[1].email).toBe('admin2@school.org');
  });

  it('should handle API errors gracefully', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ message: 'Invalid API key' })
    } as Response);

    const result = await emailService.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid API key');
  });

  it('should handle network errors', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await emailService.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('should use US region when configured', async () => {
    setEnvVars({ ...mockEnv, UNIONE_REGION: 'us' });
    
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: 'test-us-123' })
    } as Response);

    await emailService.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>'
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://us1.unione.io/en/transactional/api/v1/email/send.json',
      expect.any(Object)
    );
  });
});

describe('Magic Link Authentication Emails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnvVars(mockEnv);
  });

  afterEach(() => {
    clearEnvVars();
  });

  it('should send magic link email with correct format', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: 'magic-link-123' })
    } as Response);

    const magicLinkEmail: EmailMessage = {
      to: 'parent@example.com',
      subject: 'Sign in to Spicebush Montessori',
      html: `
        <h2>Sign in to Spicebush Montessori</h2>
        <p>Click the link below to sign in to your account:</p>
        <p><a href="https://spicebushmontessori.org/auth/confirm?token=abc123">Sign In</a></p>
        <p>This link will expire in 1 hour.</p>
      `,
      text: 'Sign in to Spicebush Montessori\n\nClick this link to sign in: https://spicebushmontessori.org/auth/confirm?token=abc123\n\nThis link will expire in 1 hour.'
    };

    const result = await emailService.send(magicLinkEmail);

    expect(result.success).toBe(true);
    
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(callBody.message.subject).toBe('Sign in to Spicebush Montessori');
    expect(callBody.message.body.html).toContain('auth/confirm');
    expect(callBody.message.body.plaintext).toContain('auth/confirm');
  });

  it('should handle admin magic links differently', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: 'admin-magic-123' })
    } as Response);

    const adminEmail: EmailMessage = {
      to: 'admin@spicebushmontessori.org',
      subject: 'Admin Sign In - Spicebush Montessori',
      html: '<p>Admin sign in link...</p>'
    };

    const result = await emailService.send(adminEmail);
    expect(result.success).toBe(true);
  });
});

describe('Tour Scheduling Emails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnvVars(mockEnv);
  });

  afterEach(() => {
    clearEnvVars();
  });

  it('should send tour request notification to school', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: 'tour-notify-123' })
    } as Response);

    const tourNotification: EmailMessage = {
      to: 'admissions@spicebushmontessori.org',
      subject: 'New Tour Request from Jane Smith',
      html: `
        <h2>New Tour Request</h2>
        <p><strong>Parent/Guardian Name:</strong> Jane Smith</p>
        <p><strong>Email:</strong> jane@example.com</p>
        <p><strong>Phone:</strong> (555) 123-4567</p>
        <p><strong>Child's Age:</strong> 4 years</p>
        <p><strong>Preferred Times:</strong> Weekday mornings</p>
      `,
      replyTo: 'jane@example.com'
    };

    const result = await emailService.send(tourNotification);

    expect(result.success).toBe(true);
    
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(callBody.message.reply_to).toBe('jane@example.com');
    expect(callBody.message.body.html).toContain('Jane Smith');
  });

  it('should send tour confirmation to parent', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: 'tour-confirm-123' })
    } as Response);

    const tourConfirmation: EmailMessage = {
      to: 'jane@example.com',
      subject: 'Tour Request Confirmation - Spicebush Montessori School',
      html: `
        <h2>Thank you for your interest in Spicebush Montessori School!</h2>
        <p>We've received your tour request and will contact you within 1-2 business days.</p>
      `
    };

    const result = await emailService.send(tourConfirmation);
    expect(result.success).toBe(true);
  });
});

describe('Email Provider Fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearEnvVars();
  });

  afterEach(() => {
    clearEnvVars();
  });

  it('should fallback to next provider on failure', async () => {
    // Configure multiple providers
    setEnvVars({
      UNIONE_API_KEY: 'test-unione-key',
      SENDGRID_API_KEY: 'test-sendgrid-key',
      EMAIL_SERVICE: 'unione' // Prefer Unione
    });

    const mockFetch = vi.mocked(global.fetch);
    
    // First call to Unione fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => ({ message: 'Service unavailable' })
    } as Response);

    // Mock SendGrid module not being available (fallback will fail)
    const result = await emailService.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('All email providers failed');
  });

  it('should skip already tried preferred provider in fallback', async () => {
    setEnvVars({
      UNIONE_API_KEY: 'test-unione-key',
      RESEND_API_KEY: 'test-resend-key',
      EMAIL_SERVICE: 'unione'
    });

    const mockFetch = vi.mocked(global.fetch);
    
    // Unione fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' })
    } as Response);

    const result = await emailService.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>'
    });

    // Should have tried Unione but not succeeded
    expect(result.success).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('Email Content Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnvVars(mockEnv);
  });

  afterEach(() => {
    clearEnvVars();
  });

  it('should send email with both HTML and text content', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: 'test-123' })
    } as Response);

    await emailService.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>HTML content</p>',
      text: 'Text content'
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(callBody.message.body.html).toBe('<p>HTML content</p>');
    expect(callBody.message.body.plaintext).toBe('Text content');
  });

  it('should use default from address when not specified', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: 'test-123' })
    } as Response);

    await emailService.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>'
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(callBody.message.from_email).toBe('noreply@spicebushmontessori.org');
    expect(callBody.message.from_name).toBe('Spicebush Montessori');
  });

  it('should allow custom from address', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: 'test-123' })
    } as Response);

    await emailService.send({
      to: 'test@example.com',
      from: 'admissions@spicebushmontessori.org',
      fromName: 'Spicebush Admissions',
      subject: 'Test',
      html: '<p>Test</p>'
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(callBody.message.from_email).toBe('admissions@spicebushmontessori.org');
    expect(callBody.message.from_name).toBe('Spicebush Admissions');
  });
});

describe('Error Recovery and Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnvVars(mockEnv);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    clearEnvVars();
    vi.restoreAllMocks();
  });

  it('should log warning when preferred provider fails', async () => {
    setEnvVars({ ...mockEnv, EMAIL_SERVICE: 'unione' });
    
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Server error' })
    } as Response);

    await emailService.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>'
    });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Preferred provider Unione failed'),
      expect.any(String)
    );
  });

  it('should handle malformed API responses', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new Error('Invalid JSON'); }
    } as Response);

    const result = await emailService.send({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });
});

// Performance test
describe('Email Service Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnvVars(mockEnv);
  });

  afterEach(() => {
    clearEnvVars();
  });

  it('should send email within acceptable time', async () => {
    const mockFetch = vi.mocked(global.fetch);
    mockFetch.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => 
          resolve({
            ok: true,
            json: async () => ({ job_id: 'perf-test-123' })
          } as Response), 
        100 // Simulate 100ms network latency
        )
      )
    );

    const startTime = Date.now();
    const result = await emailService.send({
      to: 'test@example.com',
      subject: 'Performance Test',
      html: '<p>Testing performance</p>'
    });
    const endTime = Date.now();

    expect(result.success).toBe(true);
    expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
  });
});