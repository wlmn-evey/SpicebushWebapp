/**
 * Centralized Email Service
 *
 * This module provides a unified interface for sending emails across different providers.
 * It supports multiple email services and handles provider-specific implementation details.
 */
import { logServerWarn } from '@lib/server-logger';
import { queryRows } from '@lib/db/client';

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_SENDER_EMAIL = 'information@spicebushmontessori.org';
const DB_SENDER_SETTING_KEYS = ['school_email', 'main_email', 'contact_email'] as const;
const DB_SENDER_CACHE_MS = 5 * 60 * 1000;

type SenderCacheState = {
  value: string | null;
  expiresAt: number;
};

let cachedDbSenderEmail: SenderCacheState | null = null;

const normalizeProviderKey = (value: string | null | undefined): string => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'send-grid') return 'sendgrid';
  return normalized;
};

const parseRecipients = (to: string | string[]): string[] => {
  const recipients = Array.isArray(to) ? to : to.split(',').map(entry => entry.trim()).filter(Boolean);
  return recipients
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0 && EMAIL_REGEX.test(entry));
};

const parseSettingEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return EMAIL_REGEX.test(trimmed) ? trimmed : null;
};

const getDbSenderEmail = async (): Promise<string | null> => {
  const now = Date.now();
  if (cachedDbSenderEmail && cachedDbSenderEmail.expiresAt > now) {
    return cachedDbSenderEmail.value;
  }

  try {
    const rows = await queryRows<{ key: string; value: unknown }>(
      `
        SELECT key, value
        FROM settings
        WHERE key = ANY($1::text[])
      `,
      [DB_SENDER_SETTING_KEYS]
    );

    const rowByKey = new Map(rows.map((row) => [row.key, row.value]));
    for (const key of DB_SENDER_SETTING_KEYS) {
      const email = parseSettingEmail(rowByKey.get(key));
      if (email) {
        cachedDbSenderEmail = {
          value: email,
          expiresAt: now + DB_SENDER_CACHE_MS
        };
        return email;
      }
    }
  } catch (error) {
    logServerWarn('Unable to resolve sender email from settings table, using fallback sender', {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  cachedDbSenderEmail = {
    value: null,
    expiresAt: now + 60_000
  };
  return null;
};

const resolveSender = async (message: EmailMessage): Promise<{ email: string; name: string } | null> => {
  const explicitEmail = message.from?.trim();
  if (explicitEmail && EMAIL_REGEX.test(explicitEmail)) {
    const name = (message.fromName || process.env.EMAIL_FROM_NAME || 'Spicebush Montessori').trim();
    return {
      email: explicitEmail,
      name: name || 'Spicebush Montessori'
    };
  }

  const envEmail = (process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL || '').trim();
  if (EMAIL_REGEX.test(envEmail)) {
    const name = (message.fromName || process.env.EMAIL_FROM_NAME || 'Spicebush Montessori').trim();
    return {
      email: envEmail,
      name: name || 'Spicebush Montessori'
    };
  }

  const dbEmail = await getDbSenderEmail();
  if (dbEmail) {
    const name = (message.fromName || process.env.EMAIL_FROM_NAME || 'Spicebush Montessori').trim();
    return {
      email: dbEmail,
      name: name || 'Spicebush Montessori'
    };
  }

  if (!EMAIL_REGEX.test(DEFAULT_SENDER_EMAIL)) return null;

  const name = (message.fromName || process.env.EMAIL_FROM_NAME || 'Spicebush Montessori').trim();
  return {
    email: DEFAULT_SENDER_EMAIL,
    name: name || 'Spicebush Montessori'
  };
};

const parseReplyTo = (value: string | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return EMAIL_REGEX.test(trimmed) ? trimmed : null;
};

const messageHasBody = (message: EmailMessage): boolean => {
  const hasText = typeof message.text === 'string' && message.text.trim().length > 0;
  const hasHtml = typeof message.html === 'string' && message.html.trim().length > 0;
  return hasText || hasHtml;
};

const providerError = (provider: string, error: string): EmailResult => ({
  success: false,
  error,
  provider
});

/**
 * SendGrid Email Provider
 */
class SendGridProvider implements EmailProvider {
  name = 'SendGrid';
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || '';
    this.baseUrl = process.env.SENDGRID_API_BASE_URL || 'https://api.sendgrid.com/v3';
    const parsedTimeout = Number.parseInt(process.env.SENDGRID_TIMEOUT_MS || '15000', 10);
    this.timeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 15000;
  }

  isConfigured(): boolean {
    return this.apiKey.trim().length > 0;
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    if (!this.isConfigured()) {
      return providerError(this.name, 'SendGrid API key not configured');
    }

    const recipients = parseRecipients(message.to);
    if (recipients.length === 0) {
      return providerError(this.name, 'No valid recipient email address provided');
    }

    const sender = await resolveSender(message);
    if (!sender) {
      return providerError(
        this.name,
        'Sender email is not configured. Set EMAIL_FROM or define school_email in Settings.'
      );
    }

    if (!messageHasBody(message)) {
      return providerError(this.name, 'Email body is required (text or html)');
    }

    const replyTo = parseReplyTo(message.replyTo);
    const content: Array<{ type: string; value: string }> = [];
    if (typeof message.text === 'string' && message.text.trim().length > 0) {
      content.push({ type: 'text/plain', value: message.text });
    }
    if (typeof message.html === 'string' && message.html.trim().length > 0) {
      content.push({ type: 'text/html', value: message.html });
    }

    const attachments =
      message.attachments?.map(attachment => ({
        filename: attachment.filename,
        type: attachment.contentType || 'application/octet-stream',
        content: Buffer.isBuffer(attachment.content)
          ? attachment.content.toString('base64')
          : Buffer.from(attachment.content).toString('base64')
      })) ?? [];

    const payload: Record<string, unknown> = {
      personalizations: [
        {
          to: recipients.map(email => ({ email }))
        }
      ],
      from: { email: sender.email, name: sender.name },
      subject: message.subject,
      content
    };

    if (replyTo) {
      payload['reply_to'] = { email: replyTo };
    }
    if (attachments.length > 0) {
      payload['attachments'] = attachments;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/mail/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const data = (await response.json()) as { errors?: Array<{ message?: string }> };
          const firstError = data?.errors?.[0]?.message;
          if (typeof firstError === 'string' && firstError.trim().length > 0) {
            errorMessage = firstError.trim();
          }
        } catch {
          // Ignore parse errors and keep HTTP status error.
        }
        return providerError(this.name, errorMessage);
      }

      return {
        success: true,
        messageId: response.headers.get('x-message-id') ?? undefined,
        provider: this.name
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return providerError(this.name, 'SendGrid request timed out');
      }
      return providerError(this.name, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Unione.io Email Provider
 */
class UnioneProvider implements EmailProvider {
  name = 'Unione';
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.UNIONE_API_KEY || '';
    // Use EU region by default, can be overridden with UNIONE_REGION=us
    const region = process.env.UNIONE_REGION || 'eu';
    this.baseUrl = region === 'us' 
      ? 'https://us1.unione.io/en/transactional/api/v1' 
      : 'https://eu1.unione.io/en/transactional/api/v1';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    if (!this.isConfigured()) {
      return providerError(this.name, 'Unione.io API key not configured');
    }

    const recipients = parseRecipients(message.to);
    if (recipients.length === 0) {
      return providerError(this.name, 'No valid recipient email address provided');
    }

    const sender = await resolveSender(message);
    if (!sender) {
      return providerError(
        this.name,
        'Sender email is not configured. Set EMAIL_FROM or define school_email in Settings.'
      );
    }

    if (!messageHasBody(message)) {
      return providerError(this.name, 'Email body is required (text or html)');
    }

    try {
      const replyTo = parseReplyTo(message.replyTo);

      // Prepare the message payload without API key (will use header instead)
      const payload = {
        message: {
          body: {
            html: message.html,
            plaintext: message.text
          },
          subject: message.subject,
          from_email: sender.email,
          from_name: sender.name,
          recipients: recipients.map((email: string) => ({ email })),
          ...(replyTo && { reply_to: replyTo })
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
        return providerError(
          this.name,
          (typeof data?.message === 'string' && data.message) ||
            `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return {
        success: true,
        messageId: data.job_id,
        provider: this.name
      };
    } catch (error) {
      return providerError(this.name, error instanceof Error ? error.message : 'Unknown error');
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
    // Keep both providers available while defaulting to SendGrid-first.
    this.providers = [
      new SendGridProvider(),
      new UnioneProvider()
    ];

    // Preferred provider order: explicit setting > sensible default.
    this.preferredProvider = normalizeProviderKey(process.env.EMAIL_SERVICE || 'sendgrid');
  }

  /**
   * Get configured providers
   */
  getConfiguredProviders(): EmailProvider[] {
    return this.providers.filter(p => p.isConfigured());
  }

  /**
   * Get configured provider names (lower-level status helper for diagnostics/UI)
   */
  getConfiguredProviderNames(): string[] {
    return this.getConfiguredProviders().map((provider) => provider.name);
  }

  /**
   * Send an email using the configured provider(s)
   */
  async send(message: EmailMessage): Promise<EmailResult> {
    const configuredProviders = this.getConfiguredProviders();
    const errors: string[] = [];

    if (configuredProviders.length === 0) {
      return {
        success: false,
        error: 'No email service configured. Please configure at least one email provider.'
      };
    }

    // Try preferred provider first if specified
    if (this.preferredProvider) {
      const preferred = configuredProviders.find(p => 
        normalizeProviderKey(p.name) === this.preferredProvider
      );

      if (preferred) {
        const result = await preferred.send(message);
        if (result.success) return result;

        errors.push(`${preferred.name}: ${result.error}`);

        // Log the failure but continue to fallback
        logServerWarn('Preferred email provider failed, attempting fallback', {
          provider: preferred.name,
          error: result.error
        });
      }
    }

    // Try each configured provider until one succeeds
    for (const provider of configuredProviders) {
      // Skip if this was already tried as preferred
      if (normalizeProviderKey(provider.name) === this.preferredProvider) {
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
      error: `All email providers failed. Errors: ${errors.join('; ')}`,
      provider: configuredProviders.length === 1 ? configuredProviders[0]?.name : undefined
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

  getPreferredProvider(): string {
    return this.preferredProvider || 'auto';
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export the class for direct instantiation when needed
export { EmailService };
