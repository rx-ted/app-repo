import { describe, it, expect, beforeEach } from 'vitest';
import { Platform, detectPlatform, resetDetection } from './platform';

beforeEach(() => {
  Platform.clearAppContext();
  resetDetection();
});

describe('Platform', () => {
  it('falls back to process.env when no context set', () => {
    const ctx = Platform.context();
    expect(ctx.platform).toBe('node');
    expect(ctx.env).toBe(process.env);
  });

  it('provides env via run()', () => {
    Platform.run({ platform: 'node', env: { FOO: 'bar' } }, () => {
      expect(Platform.env().FOO).toBe('bar');
    });
  });

  it('isolates contexts between nested runs', () => {
    Platform.run({ platform: 'node', env: { SCOPE: 'outer' } }, () => {
      Platform.run({ platform: 'cloudflare', env: { SCOPE: 'inner' } }, () => {
        expect(Platform.env().SCOPE).toBe('inner');
      });
      expect(Platform.env().SCOPE).toBe('outer');
    });
  });

  it('merges appContext env with request-level env', () => {
    Platform.setAppContext({ platform: 'node', env: { APP_VAR: 'app', SHARED: 'from-app' } });
    Platform.run({ platform: 'cloudflare', env: { CF_VAR: 'cf', SHARED: 'from-cf' } }, () => {
      const env = Platform.env();
      expect(env.APP_VAR).toBe('app');
      expect(env.CF_VAR).toBe('cf');
      expect(env.SHARED).toBe('from-cf');
    });
  });

  it('returns request from context', () => {
    const req = new Request('https://example.com/test');
    Platform.run({ platform: 'node', env: {}, request: req }, () => {
      expect(Platform.request()?.url).toBe('https://example.com/test');
    });
  });

  it('returns platform from context', () => {
    Platform.run({ platform: 'cloudflare', env: {} }, () => {
      expect(Platform.platform()).toBe('cloudflare');
    });
  });

  it('falls back to appContext when no per-request context', () => {
    Platform.setAppContext({ platform: 'node', env: { KEY: 'val' } });
    expect(Platform.env().KEY).toBe('val');
    expect(Platform.platform()).toBe('node');
  });

  it('detects node runtime', () => {
    expect(detectPlatform()).toBe('node');
  });
});
