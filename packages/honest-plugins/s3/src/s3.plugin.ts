import type { Hono } from 'hono';
import type { ILogger } from '@rx-ted/packages-core';
import type { Application, IPlugin } from '@rx-ted/packages-honest';
import { ComponentManager, maskSensitive } from '@rx-ted/packages-honest';
import { createS3Driver } from './s3.driver';
import type { FileDriver, S3Options } from './types';

export const S3_CONTEXT_KEY = 'honest:s3';
export const S3_GLOBAL_KEY = 's3';

export interface S3PluginOptions {
  connection: S3Options;
  contextKey?: string;
}

export class S3Plugin implements IPlugin {
  static readonly globalKey = S3_GLOBAL_KEY;
  readonly name = 's3-plugin';
  readonly version = '1.0.0';

  logger?: ILogger;

  private driver: FileDriver | null = null;
  private readonly connection: S3Options;
  private readonly contextKey: string;

  constructor(options: S3PluginOptions) {
    this.connection = options.connection;
    this.contextKey = options.contextKey ?? S3_CONTEXT_KEY;
  }

  getClient(): FileDriver {
    if (!this.driver) {
      throw new Error('S3 not connected. Ensure beforeModulesRegistered has run.');
    }
    return this.driver;
  }

  async beforeModulesRegistered(app: Application, _hono: Hono): Promise<void> {
    this.logger?.info('S3: initializing...');

    const connInfo: Record<string, unknown> = {
      category: 'plugins',
      endpoint: this.connection.endpoint,
      region: this.connection.region,
      bucket: this.connection.bucket,
      accessKeyId: maskSensitive(this.connection.accessKeyId),
    };

    try {
      this.driver = await createS3Driver(this.connection);
      app.getContext().set(this.contextKey, this.driver);
      ComponentManager.registerPlugin(S3_GLOBAL_KEY, this.driver);

      const ok = await this.driver.healthCheck();
      if (!ok) throw new Error('S3: health check failed');
      this.logger?.info(connInfo, 'success to s3');
    } catch (error) {
      this.logger?.error(
        { ...connInfo, error: error instanceof Error ? error.message : String(error) },
        'fail to connect s3',
      );
      throw error;
    }
  }

  async afterModulesRegistered(_app: Application, _hono: Hono): Promise<void> {
    if (this.driver) {
      const ok = await this.driver.healthCheck();
      if (ok) {
        this.logger?.info('S3: health check passed');
      }
    }
  }

  async close(): Promise<void> {
    await this.driver?.close();
    this.driver = null;
  }
}
