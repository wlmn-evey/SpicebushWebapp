import { Page } from '@playwright/test';

/**
 * Email Testing Helper
 * Provides different strategies for capturing magic link emails during testing
 */

interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  timestamp: Date;
}

export class EmailTestHelper {
  private strategy: 'mailhog' | 'mailtrap' | 'console';
  
  constructor(strategy?: string) {
    this.strategy = (strategy || process.env.EMAIL_TEST_STRATEGY || 'console') as any;
  }

  /**
   * Retrieve magic link from email based on configured strategy
   */
  async getMagicLink(email: string, page?: Page): Promise<string | null> {
    switch (this.strategy) {
      case 'mailhog':
        return this.getMailHogLink(email);
      case 'mailtrap':
        return this.getMailtrapLink(email);
      case 'console':
      default:
        return this.getConsoleLink(email, page!);
    }
  }

  /**
   * Get magic link from MailHog (local email testing)
   */
  private async getMailHogLink(email: string): Promise<string | null> {
    const mailhogUrl = process.env.MAILHOG_URL || 'http://localhost:8025';
    
    try {
      // Query MailHog API for messages
      const response = await fetch(`${mailhogUrl}/api/v2/messages`);
      const data = await response.json();
      
      // Find the most recent email to our test address
      const message = data.items.find((item: any) => 
        item.To[0].Mailbox + '@' + item.To[0].Domain === email
      );
      
      if (!message) return null;
      
      // Extract magic link from email HTML
      const html = message.Content.Body;
      const linkMatch = html.match(/href="([^"]+auth\/confirm[^"]+)"/);
      
      return linkMatch ? linkMatch[1] : null;
    } catch (error) {
      console.error('MailHog error:', error);
      return null;
    }
  }

  /**
   * Get magic link from Mailtrap (cloud email testing)
   */
  private async getMailtrapLink(email: string): Promise<string | null> {
    const apiToken = process.env.MAILTRAP_API_TOKEN;
    const inboxId = process.env.MAILTRAP_INBOX_ID;
    
    if (!apiToken || !inboxId) {
      throw new Error('Mailtrap configuration missing');
    }
    
    try {
      const response = await fetch(
        `https://mailtrap.io/api/v1/inboxes/${inboxId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const messages = await response.json();
      
      // Find most recent message to our email
      const message = messages.find((msg: any) => 
        msg.to_email === email && 
        msg.subject.includes('Sign in to Spicebush')
      );
      
      if (!message) return null;
      
      // Get full message content
      const msgResponse = await fetch(
        `https://mailtrap.io/api/v1/inboxes/${inboxId}/messages/${message.id}`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const fullMessage = await msgResponse.json();
      const linkMatch = fullMessage.html_body.match(/href="([^"]+auth\/confirm[^"]+)"/);
      
      return linkMatch ? linkMatch[1] : null;
    } catch (error) {
      console.error('Mailtrap error:', error);
      return null;
    }
  }

  /**
   * Get magic link from browser console (development fallback)
   */
  private async getConsoleLink(email: string, page: Page): Promise<string | null> {
    return new Promise((resolve) => {
      let resolved = false;
      
      // Listen for console messages
      const listener = (msg: any) => {
        const text = msg.text();
        
        // Look for common auth URL patterns
        if (text.includes('auth/confirm') || 
            text.includes('auth/verify') || 
            text.includes('#access_token=')) {
          
          const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
          if (urlMatch && !resolved) {
            resolved = true;
            resolve(urlMatch[1]);
          }
        }
      };
      
      page.on('console', listener);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (!resolved) {
          page.off('console', listener);
          resolve(null);
        }
      }, 10000);
    });
  }

  /**
   * Clear all emails for a given address (useful for test cleanup)
   */
  async clearEmails(email: string): Promise<void> {
    switch (this.strategy) {
      case 'mailhog':
        await this.clearMailHogEmails();
        break;
      case 'mailtrap':
        await this.clearMailtrapEmails();
        break;
      default:
        // No-op for other strategies
        break;
    }
  }

  private async clearMailHogEmails(): Promise<void> {
    const mailhogUrl = process.env.MAILHOG_URL || 'http://localhost:8025';
    
    try {
      await fetch(`${mailhogUrl}/api/v1/messages`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Failed to clear MailHog emails:', error);
    }
  }

  private async clearMailtrapEmails(): Promise<void> {
    const apiToken = process.env.MAILTRAP_API_TOKEN;
    const inboxId = process.env.MAILTRAP_INBOX_ID;
    
    if (!apiToken || !inboxId) return;
    
    try {
      await fetch(
        `https://mailtrap.io/api/v1/inboxes/${inboxId}/clean`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Accept': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Failed to clear Mailtrap emails:', error);
    }
  }

  /**
   * Wait for an email to arrive (with timeout)
   */
  async waitForEmail(email: string, timeoutMs: number = 30000): Promise<EmailMessage | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const emails = await this.getEmails(email);
      
      if (emails.length > 0) {
        return emails[0];
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return null;
  }

  /**
   * Get all emails for a given address
   */
  private async getEmails(email: string): Promise<EmailMessage[]> {
    switch (this.strategy) {
      case 'mailhog':
        return this.getMailHogEmails(email);
      case 'mailtrap':
        return this.getMailtrapEmails(email);
      default:
        return [];
    }
  }

  private async getMailHogEmails(email: string): Promise<EmailMessage[]> {
    const mailhogUrl = process.env.MAILHOG_URL || 'http://localhost:8025';
    
    try {
      const response = await fetch(`${mailhogUrl}/api/v2/messages`);
      const data = await response.json();
      
      return data.items
        .filter((item: any) => 
          item.To[0].Mailbox + '@' + item.To[0].Domain === email
        )
        .map((item: any) => ({
          to: item.To[0].Mailbox + '@' + item.To[0].Domain,
          from: item.From.Mailbox + '@' + item.From.Domain,
          subject: item.Content.Headers.Subject[0],
          html: item.Content.Body,
          text: item.Content.Body,
          timestamp: new Date(item.Created)
        }));
    } catch (error) {
      console.error('MailHog error:', error);
      return [];
    }
  }

  private async getMailtrapEmails(email: string): Promise<EmailMessage[]> {
    const apiToken = process.env.MAILTRAP_API_TOKEN;
    const inboxId = process.env.MAILTRAP_INBOX_ID;
    
    if (!apiToken || !inboxId) return [];
    
    try {
      const response = await fetch(
        `https://mailtrap.io/api/v1/inboxes/${inboxId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const messages = await response.json();
      
      return messages
        .filter((msg: any) => msg.to_email === email)
        .map((msg: any) => ({
          to: msg.to_email,
          from: msg.from_email,
          subject: msg.subject,
          html: msg.html_body || '',
          text: msg.text_body || '',
          timestamp: new Date(msg.created_at)
        }));
    } catch (error) {
      console.error('Mailtrap error:', error);
      return [];
    }
  }
}

/**
 * Utility function to extract magic link from email content
 */
export function extractMagicLink(emailContent: string): string | null {
  // Try different patterns the auth provider might use
  const patterns = [
    /href="([^"]+auth\/confirm[^"]+)"/,
    /href="([^"]+auth\/verify[^"]+)"/,
    /href="([^"]+#access_token=[^"]+)"/,
    /(https?:\/\/[^\s]+auth\/confirm[^\s]+)/,
    /(https?:\/\/[^\s]+#access_token=[^\s]+)/
  ];
  
  for (const pattern of patterns) {
    const match = emailContent.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Create a mock magic link for testing
 */
export function createMockMagicLink(
  baseUrl: string,
  email: string,
  isAdmin: boolean = false
): string {
  const token = Buffer.from(JSON.stringify({
    email,
    isAdmin,
    exp: Date.now() + 3600000 // 1 hour
  })).toString('base64');
  
  return `${baseUrl}/auth/confirm?token=${token}&type=magiclink`;
}
