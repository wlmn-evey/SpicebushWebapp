// Type declarations for imports without types

declare module '@sendgrid/mail' {
  export default any;
  export function setApiKey(key: string): void;
  export function send(msg: any): Promise<any>;
}

declare module 'postmark' {
  export class ServerClient {
    constructor(token: string);
    sendEmail(options: any): Promise<any>;
  }
}

declare module '@lib/email-service' {
  export interface EmailMessage {
    to: string | string[];
    from?: string;
    fromName?: string;
    subject: string;
    text?: string;
    html?: string;
    replyTo?: string;
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
  }
  
  export const emailService: EmailService;
}

// Vitest config type fix
declare module 'vitest/config' {
  export function defineConfig(config: any): any;
}