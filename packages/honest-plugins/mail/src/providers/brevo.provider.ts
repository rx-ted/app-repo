import { BrevoClient } from '@getbrevo/brevo';
import type { MailProvider, SendMailOptions, SendMailResult } from '../types';

export class BrevoMailProvider implements MailProvider {
  readonly name: string;
  private client: BrevoClient | null = null;

  constructor(
    name: string,
    private config: { apiKey: string },
    private fromEmail: string,
    private fromName?: string,
  ) {
    this.name = name;
  }

  private async ensureInit(): Promise<void> {
    if (this.client) return;
    this.client = new BrevoClient({ apiKey: this.config.apiKey });
  }

  async send(options: SendMailOptions, _providerName?: string): Promise<SendMailResult> {
    await this.ensureInit();
    const to = (Array.isArray(options.to) ? options.to : [options.to]).map((e: string) => ({
      email: e,
    }));
    const payload: Record<string, unknown> = {
      sender: { name: this.fromName ?? '', email: options.from || this.fromEmail },
      to,
      subject: options.subject,
    };
    if (options.html) payload.htmlContent = options.html;
    if (options.text) payload.textContent = options.text;
    if (options.cc)
      payload.cc = (Array.isArray(options.cc) ? options.cc : [options.cc]).map((e: string) => ({
        email: e,
      }));
    if (options.bcc)
      payload.bcc = (Array.isArray(options.bcc) ? options.bcc : [options.bcc]).map((e: string) => ({
        email: e,
      }));
    if (options.attachments?.length) {
      payload.attachment = options.attachments.map((a) => ({
        name: a.filename,
        content: a.content instanceof Uint8Array ? uint8ArrayToBase64(a.content) : a.content,
      }));
    }
    const result = await (this.client!.transactionalEmails.sendTransacEmail as any)(payload);
    return { id: result?.messageId ?? 'unknown', provider: this.name };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureInit();
      await (this.client!.transactionalEmails.sendTransacEmail as any)({
        sender: { name: this.fromName ?? '', email: this.fromEmail },
        to: [{ email: this.fromEmail }],
        subject: 'Health check',
        textContent: 'This is a health check email from Brevo provider.',
      });
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    this.client = null;
  }
}

function uint8ArrayToBase64(u8: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < u8.length; i++) {
    binary += String.fromCharCode(u8[i]);
  }
  return btoa(binary);
}
