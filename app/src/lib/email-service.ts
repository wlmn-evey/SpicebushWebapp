/**
 * Centralized Email Service
 * 
 * This module provides a unified interface for sending emails across different providers.
 * It supports multiple email services and handles provider-specific implementation details.
 */

import type { EmailMessage, EmailProvider, EmailResult } from '@types/email';

// Email message interface
export interface EmailMessage {
  to: string | string[];
  from?: string;
  fromName?: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

// Email provider interface
export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<EmailResult>;
  isConfigured(): boolean;
}

// Email result interface
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

/**
 * Unione.io Email Provider
 */
class UnioneProvider implements EmailProvider {
  name = 'Unione';
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = import.meta.env.UNIONE_API_KEY || process.env.UNIONE_API_KEY || '';
    // Use EU region by default, can be overridden with UNIONE_REGION=us
    const region = import.meta.env.UNIONE_REGION || process.env.UNIONE_REGION || 'eu';
    this.baseUrl = region === 'us' 
      ? 'https://us1.unione.io/en/transactional/api/v1' 
      : 'https://eu1.unione.io/en/transactional/api/v1';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Unione.io API key not configured',
        provider: this.name
      };
    }

    try {
      const recipients = Array.isArray(message.to) ? message.to : [message.to];
      
      const payload = {
        api_key: this.apiKey,
        message: {
          body: {
            html: message.html,
            plaintext: message.text
          },
          subject: message.subject,
          from_email: message.from || import.meta.env.EMAIL_FROM || process.env.EMAIL_FROM,
          from_name: message.fromName || import.meta.env.EMAIL_FROM_NAME || process.env.EMAIL_FROM_NAME || 'Spicebush Montessori',
          recipients: recipients.map(email => ({ email })),
          ...(message.replyTo && { reply_to: message.replyTo })
        }
      };

      const response = await fetch(`${this.baseUrl}/email/send.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}: ${response.statusText}`,
          provider: this.name
        };
      }

      return {
        success: true,
        messageId: data.job_id,
        provider: this.name
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name
      };
    }
  }
}

/**
 * SendGrid Email Provider
 */
class SendGridProvider implements EmailProvider {
  name = 'SendGrid';
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY || '';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'SendGrid API key not configured',
        provider: this.name
      };
    }

    try {
      // Dynamic import to avoid loading if not needed
      const sgMail = await import('@sendgrid/mail').catch(() => null);
      if (!sgMail) {
        return {
          success: false,
          error: 'SendGrid package not installed. Run: npm install @sendgrid/mail',
          provider: this.name
        };
      }

      sgMail.default.setApiKey(this.apiKey);

      const msg = {
        to: message.to,
        from: {
          email: message.from || import.meta.env.EMAIL_FROM || process.env.EMAIL_FROM,
          name: message.fromName || import.meta.env.EMAIL_FROM_NAME || process.env.EMAIL_FROM_NAME || 'Spicebush Montessori'
        },
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(message.replyTo && { replyTo: message.replyTo })
      };

      const [response] = await sgMail.default.send(msg);
      
      return {
        success: true,
        messageId: response.headers['x-message-id'],
        provider: this.name
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name
      };
    }
  }
}

/**
 * Postmark Email Provider
 */
class PostmarkProvider implements EmailProvider {
  name = 'Postmark';
  private serverToken: string;

  constructor() {
    this.serverToken = import.meta.env.POSTMARK_SERVER_TOKEN || process.env.POSTMARK_SERVER_TOKEN || '';
  }

  isConfigured(): boolean {
    return !!this.serverToken;
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Postmark server token not configured',
        provider: this.name
      };
    }

    try {
      const postmark = await import('postmark').catch(() => null);
      if (!postmark) {
        return {
          success: false,
          error: 'Postmark package not installed. Run: npm install postmark',
          provider: this.name
        };
      }

      const client = new postmark.ServerClient(this.serverToken);
      
      const result = await client.sendEmail({
        From: message.from || import.meta.env.POSTMARK_FROM_EMAIL || process.env.POSTMARK_FROM_EMAIL || import.meta.env.EMAIL_FROM || process.env.EMAIL_FROM,
        To: Array.isArray(message.to) ? message.to.join(',') : message.to,
        Subject: message.subject,
        TextBody: message.text,
        HtmlBody: message.html,
        ...(message.replyTo && { ReplyTo: message.replyTo })
      });

      return {
        success: true,
        messageId: result.MessageID,
        provider: this.name
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name
      };
    }
  }
}

/**
 * Resend Email Provider
 */
class ResendProvider implements EmailProvider {
  name = 'Resend';
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY || '';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Resend API key not configured',
        provider: this.name
      };
    }

    try {
      const { Resend } = await import('resend').catch(() => ({ Resend: null }));
      if (!Resend) {
        return {
          success: false,
          error: 'Resend package not installed. Run: npm install resend',
          provider: this.name
        };
      }

      const resend = new Resend(this.apiKey);
      
      const result = await resend.emails.send({
        from: message.from || import.meta.env.EMAIL_FROM || process.env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(message.replyTo && { reply_to: message.replyTo })
      });

      return {
        success: true,
        messageId: result.id,
        provider: this.name
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name
      };
    }
  }
}

/**
 * Email Service Manager
 * 
 * Manages multiple email providers and handles fallback logic
 */
class EmailService {
  private providers: EmailProvider[] = [];
  private preferredProvider?: string;

  constructor() {
    // Initialize providers
    this.providers = [
      new UnioneProvider(),
      new SendGridProvider(),
      new PostmarkProvider(),
      new ResendProvider()
    ];

    // Set preferred provider from environment
    this.preferredProvider = import.meta.env.EMAIL_SERVICE || process.env.EMAIL_SERVICE;
  }

  /**
   * Get configured providers
   */
  getConfiguredProviders(): EmailProvider[] {
    return this.providers.filter(p => p.isConfigured());
  }

  /**
   * Send an email using the configured provider(s)
   */
  async send(message: EmailMessage): Promise<EmailResult> {
    const configuredProviders = this.getConfiguredProviders();
    
    if (configuredProviders.length === 0) {
      return {
        success: false,
        error: 'No email service configured. Please configure at least one email provider.'
      };
    }

    // Try preferred provider first if specified
    if (this.preferredProvider) {
      const preferred = configuredProviders.find(p => 
        p.name.toLowerCase() === this.preferredProvider?.toLowerCase()
      );
      
      if (preferred) {
        const result = await preferred.send(message);
        if (result.success) return result;
        
        // Log the failure but continue to fallback
        console.warn(`Preferred provider ${preferred.name} failed:`, result.error);
      }
    }

    // Try each configured provider until one succeeds
    const errors: string[] = [];
    
    for (const provider of configuredProviders) {
      // Skip if this was already tried as preferred
      if (provider.name.toLowerCase() === this.preferredProvider?.toLowerCase()) {
        continue;
      }

      const result = await provider.send(message);
      if (result.success) {
        return result;
      }
      
      errors.push(`${provider.name}: ${result.error}`);
    }

    // All providers failed
    return {
      success: false,
      error: `All email providers failed. Errors: ${errors.join('; ')}`
    };
  }

  /**
   * Get status of all providers
   */
  getStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const provider of this.providers) {
      status[provider.name] = provider.isConfigured();
    }
    return status;
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export the class for direct instantiation when needed
export { EmailService };

// Export types
export type { EmailMessage, EmailProvider, EmailResult };