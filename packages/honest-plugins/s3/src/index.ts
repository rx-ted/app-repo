export { S3Plugin, S3_CONTEXT_KEY, S3_GLOBAL_KEY } from './s3.plugin';
export type { S3PluginOptions } from './s3.plugin';
export { createS3Driver } from './s3.driver';
export type { S3DriverOptions } from './s3.driver';
export type {
  FileDriver,
  FileMetadata,
  FileUploadOptions,
  S3Options,
} from './types';

// DI service
export { S3Service } from './s3-service';
