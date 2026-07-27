import type { MailProvider, SendMailOptions, SendMailResult } from '../types';

export class SmtpMailProvider implements MailProvider {
  readonly name: string;
  private mailer: any = null;
  private initPromise: Promise<void> | null = null;

  constructor(
    name: string,
    private config: { host: string; port: number; user: string; pass: string; secure?: boolean },
    private fromEmail: string,
    private fromName?: string,
  ) {
    this.name = name;
  }

  private async ensureInit(): Promise<void> {
    if (this.mailer) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      const { createSMTPMailer } = await import('sently/smtp');
      this.mailer = await createSMTPMailer({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },
      });
    })();
    return this.initPromise;
  }

  async send(options: SendMailOptions, _providerName?: string): Promise<SendMailResult> {
    await this.ensureInit();
    const email = options.from || this.fromEmail;
    const payload: Record<string, unknown> = {
      from: this.fromName ? { name: this.fromName, address: email } : email,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
    };
    if (options.html) payload.html = options.html;
    if (options.text) payload.text = options.text;
    if (options.cc) payload.cc = Array.isArray(options.cc) ? options.cc.join(', ') : options.cc;
    if (options.bcc)
      payload.bcc = Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc;
    if (options.replyTo) payload.replyTo = options.replyTo;
    if (options.attachments?.length) {
      payload.attachments = options.attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        path: a.path,
        contentType: a.contentType,
      }));
    }
    const info = await this.mailer.send(payload);
    return { id: info.messageId ?? 'unknown', provider: this.name };
  }

  async warmUp(): Promise<void> {
    await this.ensureInit();
    await this.mailer.verify();
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.warmUp();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.mailer) {
      try {
        await this.mailer.close();
      } catch {
        /* ignore */
      }
      this.mailer = null;
    }
  }
}
