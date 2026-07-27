export interface Attachment {
  filename: string;
  content?: string | Uint8Array;
  path?: string;
  contentType?: string;
}

export interface SendMailOptions {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  attachments?: Attachment[];
  headers?: Record<string, string>;
  tags?: Record<string, string>;
}

export interface SendMailResult {
  id: string;
  provider: string;
}

export interface MailProvider {
  readonly name: string;
  send(options: SendMailOptions, providerName?: string): Promise<SendMailResult>;
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
  warmUp?(): Promise<void>;
}

export interface ResendProviderConfig {
  apiKey: string;
}

export interface BrevoProviderConfig {
  apiKey: string;
}

export interface SmtpProviderConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure?: boolean;
}

export type ProviderType = 'resend' | 'brevo' | 'smtp' | 'custom';

export interface MailProviderConfigEntry {
  name: string;
  provider: ProviderType;
  fromEmail: string;
  fromName?: string;
  limits?: {
    dailyQuota?: number;
  };
  resend?: ResendProviderConfig;
  brevo?: BrevoProviderConfig;
  smtp?: SmtpProviderConfig;
  custom?: MailProvider;
}

export interface MailPluginOptions {
  providers: MailProviderConfigEntry[];
  healthCheck?: {
    intervalMs?: number;
    maxRetries?: number;
    retryDelayMs?: number;
  };
}

export class MailQuotaExceededError extends Error {
  constructor(providerName: string, quota: number) {
    super(`Mail quota exceeded for provider "${providerName}": ${quota}/day`);
    this.name = 'MailQuotaExceededError';
  }
}
