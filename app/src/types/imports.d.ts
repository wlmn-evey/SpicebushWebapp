// Type declarations for imports without types

declare module '@sendgrid/mail' {
  type SendGridMessage = Record<string, unknown>;
  type SendGridResponse = unknown;

  export function setApiKey(key: string): void;
  export function send(msg: SendGridMessage): Promise<SendGridResponse>;

  const sendGrid: {
    setApiKey: typeof setApiKey;
    send: typeof send;
  };
  export default sendGrid;
}

declare module 'postmark' {
  type PostmarkEmailOptions = Record<string, unknown>;
  type PostmarkEmailResponse = unknown;

  export class ServerClient {
    constructor(token: string);
    sendEmail(options: PostmarkEmailOptions): Promise<PostmarkEmailResponse>;
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
  export function defineConfig<TConfig>(config: TConfig): TConfig;
}
