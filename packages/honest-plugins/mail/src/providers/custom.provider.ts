import type { MailProvider, SendMailOptions, SendMailResult } from '../types';

export class CustomMailProvider implements MailProvider {
  readonly name: string;

  constructor(
    name: string,
    private impl: MailProvider,
  ) {
    this.name = name;
  }

  async send(options: SendMailOptions, providerName?: string): Promise<SendMailResult> {
    return this.impl.send(options, providerName);
  }

  async healthCheck(): Promise<boolean> {
    if (typeof this.impl.healthCheck === 'function') {
      return this.impl.healthCheck();
    }
    return true;
  }

  async close(): Promise<void> {
    if (typeof this.impl.close === 'function') {
      await this.impl.close();
    }
  }
}
