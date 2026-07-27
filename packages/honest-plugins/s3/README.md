# @rx-ted/packages-honest-plugins-s3

S3 object storage plugin for [@rx-ted/packages-honest](https://github.com/rx-ted/honest). Supports AWS S3 and S3-compatible services.

## Features

- **AWS S3**: full S3 API support via `@aws-sdk/client-s3`
- **Presigned URLs**: generate presigned upload/download URLs
- **File metadata**: track file type, size, and custom metadata
- **Runtime-agnostic**: works on Node.js, Bun, Deno

## Installation

```bash
pnpm add @rx-ted/packages-honest-plugins-s3
```

Peer dependencies: `@rx-ted/packages-honest`, `hono`

## Usage

### Register as a plugin

```ts
import { S3Plugin } from '@rx-ted/packages-honest-plugins/s3';

const plugin = new S3Plugin({
  bucket: 'my-bucket',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const { hono } = await Application.create(AppModule, {
  plugins: [plugin],
});
```

### Access S3 service

```ts
import { ComponentManager } from '@rx-ted/packages-honest';
import { S3Service } from '@rx-ted/packages-honest-plugins/s3';

const s3 = ComponentManager.getPlugin<S3Service>('s3');

// Upload
await s3.upload(file, { key: 'uploads/image.png', contentType: 'image/png' });

// Get presigned URL
const url = await s3.getPresignedUrl('uploads/image.png', { expiresIn: 3600 });
```

### Driver options

```ts
import { createS3Driver } from '@rx-ted/packages-honest-plugins/s3';

const driver = createS3Driver({
  endpoint: 'https://s3.amazonaws.com',
  bucket: 'my-bucket',
  region: 'us-east-1',
  credentials: {
    accessKeyId: '...',
    secretAccessKey: '...',
  },
  forcePathStyle: false, // true for MinIO
});
```

## Types

```ts
interface FileDriver {
  upload(key: string, body: Buffer, options?: FileUploadOptions): Promise<FileMetadata>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getPresignedUrl(key: string, options?: S3Options): Promise<string>;
  list(prefix: string): Promise<FileMetadata[]>;
}
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm test` | Run tests |
| `pnpm build` | Build |
