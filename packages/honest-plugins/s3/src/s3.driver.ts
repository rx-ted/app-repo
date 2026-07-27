import type { Logger } from '@rx-ted/packages-core';
import type { FileDriver, FileMetadata, FileUploadOptions, S3Options } from './types';

let awsS3: any = null;
async function getAwsS3() {
  if (!awsS3) {
    const name = '@aws-sdk/client-s3';
    awsS3 = await import(name);
  }
  return awsS3;
}

let awsPresigner: any = null;
async function getAwsPresigner() {
  if (!awsPresigner) {
    const name = '@aws-sdk/s3-request-presigner';
    awsPresigner = await import(name);
  }
  return awsPresigner;
}

export type S3DriverOptions = S3Options & {
  logger?: Logger;
};

export async function createS3Driver(options: S3DriverOptions): Promise<FileDriver> {
  const logger = options.logger;
  if (logger) {
    logger.debug(
      {
        bucket: options.bucket,
        endpoint: options.endpoint,
        region: options.region,
      },
      'S3Driver: initializing',
    );
  }

  const s3 = await getAwsS3();
  const client = new s3.S3Client({
    endpoint: options.endpoint,
    region: options.region || 'us-east-1',
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
    forcePathStyle: options.forcePathStyle,
  });

  const driver = new S3Driver(client, options, logger);

  if (logger) {
    logger.info('S3Driver: initialized');
  }

  return driver;
}

class S3Driver implements FileDriver {
  constructor(
    private client: any,
    private options: S3Options & { logger?: Logger },
    private logger?: Logger,
  ) {}

  async upload(
    key: string,
    data: Uint8Array | ReadableStream,
    uploadOptions?: FileUploadOptions,
  ): Promise<FileMetadata> {
    let body: Uint8Array | undefined;
    if (data instanceof Uint8Array) {
      body = data;
    } else {
      const chunks: Uint8Array[] = [];
      const reader = data.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLength = chunks.reduce((sum, c) => sum + c.byteLength, 0);
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }
      body = merged;
    }

    const s3 = await getAwsS3();
    const command = new s3.PutObjectCommand({
      Bucket: this.options.bucket,
      Key: key,
      Body: body,
      ContentType: uploadOptions?.contentType,
      Metadata: uploadOptions?.metadata,
    });

    await this.client.send(command);

    const url = this.options.baseUrl
      ? `${this.options.baseUrl.replace(/\/$/, '')}/${key}`
      : undefined;

    if (this.logger) {
      this.logger.debug({ key, size: body?.length }, 'S3Driver: uploaded');
    }

    return {
      key,
      size: body?.length || 0,
      contentType: uploadOptions?.contentType || this.guessContentType(key),
      lastModified: new Date(),
      url,
    };
  }

  async download(key: string): Promise<Uint8Array> {
    const s3 = await getAwsS3();
    const command = new s3.GetObjectCommand({
      Bucket: this.options.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      return new Uint8Array();
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const totalLength = chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return merged;
  }

  async getUrl(key: string, expiresIn?: number): Promise<string> {
    if (this.options.baseUrl) {
      return `${this.options.baseUrl.replace(/\/$/, '')}/${key}`;
    }

    const [s3, presigner] = await Promise.all([getAwsS3(), getAwsPresigner()]);
    const command = new s3.GetObjectCommand({
      Bucket: this.options.bucket,
      Key: key,
    });

    return presigner.getSignedUrl(this.client, command, {
      expiresIn: expiresIn || 3600,
    });
  }

  async delete(key: string): Promise<boolean> {
    try {
      const s3 = await getAwsS3();
      const command = new s3.DeleteObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
      });

      await this.client.send(command);

      if (this.logger) {
        this.logger.debug({ key }, 'S3Driver: deleted');
      }
      return true;
    } catch {
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const s3 = await getAwsS3();
      const command = new s3.HeadObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix?: string): Promise<FileMetadata[]> {
    const s3 = await getAwsS3();
    const command = new s3.ListObjectsV2Command({
      Bucket: this.options.bucket,
      Prefix: prefix,
    });

    const response = await this.client.send(command);
    const results: FileMetadata[] = [];

    if (response.Contents) {
      for (const item of response.Contents) {
        results.push({
          key: item.Key || '',
          size: item.Size || 0,
          contentType: this.guessContentType(item.Key || ''),
          lastModified: item.LastModified || new Date(),
        });
      }
    }

    return results;
  }

  async close(): Promise<void> {
    this.client.destroy();
    if (this.logger) {
      this.logger.info('S3Driver: closed');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const s3 = await getAwsS3();
      const command = new s3.ListObjectsV2Command({
        Bucket: this.options.bucket,
        MaxKeys: 1,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  private guessContentType(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      json: 'application/json',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      txt: 'text/plain',
    };
    return mimeTypes[ext] || 'application/octet-default';
  }
}
