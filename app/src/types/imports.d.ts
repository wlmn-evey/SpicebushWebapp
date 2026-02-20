// Type declarations for imports without types

declare module '@lib/email-service' {
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
  
  export interface EmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
    provider?: string;
  }
  
  export class EmailService {
    send(message: EmailMessage): Promise<EmailResult>;
    getStatus(): Record<string, boolean>;
    getConfiguredProviderNames(): string[];
    getPreferredProvider(): string;
  }
  
  export const emailService: EmailService;
}

// Vitest config type fix
declare module 'vitest/config' {
  export function defineConfig<TConfig>(config: TConfig): TConfig;
}
