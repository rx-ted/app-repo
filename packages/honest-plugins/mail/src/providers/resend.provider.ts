import type { MailProvider, SendMailOptions, SendMailResult } from '../types';

export class ResendMailProvider implements MailProvider {
  readonly name: string;
  private client: any = null;
  private initPromise: Promise<void> | null = null;

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
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      const { Resend } = await import('resend');
      this.client = new Resend(this.config.apiKey);
    })();
    return this.initPromise;
  }

  async send(options: SendMailOptions, _providerName?: string): Promise<SendMailResult> {
    await this.ensureInit();
    const payload: Record<string, unknown> = {
      from: this.fromName
        ? `${this.fromName} <${options.from || this.fromEmail}>`
        : options.from || this.fromEmail,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
    };
    if (options.cc) payload.cc = Array.isArray(options.cc) ? options.cc : [options.cc];
    if (options.bcc) payload.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
    if (options.html) payload.html = options.html;
    if (options.text) payload.text = options.text;
    if (options.attachments?.length) {
      payload.attachments = options.attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        path: a.path,
        content_type: a.contentType,
      }));
    }
    if (options.headers) payload.headers = options.headers;
    if (options.tags)
      payload.tags = Object.entries(options.tags).map(([key, value]) => ({ name: key, value }));
    const { data, error } = await this.client.emails.send(payload);
    if (error) throw new Error(`Resend send failed: ${error.message}`);
    return { id: data?.id ?? 'unknown', provider: this.name };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureInit();
      await this.client.emails.send({
        from: this.fromName ? `${this.fromName} <${this.fromEmail}>` : this.fromEmail,
        to: [this.fromEmail],
        subject: 'Health check',
        text: 'This is a health check email from Resend provider.',
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
