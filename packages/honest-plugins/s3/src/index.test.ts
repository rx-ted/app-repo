import { describe, it, expect } from 'vitest';
import { S3Plugin, S3_CONTEXT_KEY, S3_GLOBAL_KEY, createS3Driver } from './index';

describe('S3 plugin exports', () => {
  it('exports S3Plugin', () => {
    expect(S3Plugin).toBeDefined();
  });

  it('exports S3_CONTEXT_KEY', () => {
    expect(S3_CONTEXT_KEY).toBe('honest:s3');
  });

  it('exports S3_GLOBAL_KEY', () => {
    expect(S3_GLOBAL_KEY).toBe('s3');
  });

  it('exports createS3Driver', () => {
    expect(createS3Driver).toBeDefined();
  });
});
