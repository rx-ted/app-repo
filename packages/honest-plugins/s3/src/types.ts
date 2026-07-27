export interface FileUploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface FileMetadata {
  key: string;
  size: number;
  contentType: string;
  lastModified: Date;
  url?: string;
}

export interface S3Options {
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
  forcePathStyle?: boolean;
  baseUrl?: string;
}

export interface FileDriver {
  upload(
    key: string,
    data: Uint8Array | ReadableStream,
    options?: FileUploadOptions,
  ): Promise<FileMetadata>;
  download(key: string): Promise<Uint8Array>;
  getUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  list(prefix?: string): Promise<FileMetadata[]>;
  close(): Promise<void>;
  healthCheck(): Promise<boolean>;
}
