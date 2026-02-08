/**
 * Centralized Email Service
 * 
 * This module provides a unified interface for sending emails across different providers.
 * It supports multiple email services and handles provider-specific implementation details.
 */
import { logServerWarn } from '@lib/server-logger';

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
      
      // Prepare the message payload without API key (will use header instead)
      const payload = {
        message: {
          body: {
            html: message.html,
            plaintext: message.text
          },
          subject: message.subject,
          from_email: message.from || import.meta.env.EMAIL_FROM || process.env.EMAIL_FROM,
          from_name: message.fromName || import.meta.env.EMAIL_FROM_NAME || process.env.EMAIL_FROM_NAME || 'Spicebush Montessori',
          recipients: recipients.map((email: string) => ({ email })),
          ...(message.replyTo && { reply_to: message.replyTo })
        }
      };

      // Use X-API-KEY header for authentication (preferred method)
      const response = await fetch(`${this.baseUrl}/email/send.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-API-KEY': this.apiKey
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
 * Email Service Manager
 * 
 * Manages multiple email providers and handles fallback logic
 */
class EmailService {
  private providers: EmailProvider[] = [];
  private preferredProvider?: string;

  constructor() {
    // Initialize Unione as the only provider
    this.providers = [
      new UnioneProvider()
    ];

    // Set preferred provider from environment (defaults to Unione)
    this.preferredProvider = import.meta.env.EMAIL_SERVICE || process.env.EMAIL_SERVICE || 'Unione';
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
        logServerWarn('Preferred email provider failed, attempting fallback', {
          provider: preferred.name,
          error: result.error
        });
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
