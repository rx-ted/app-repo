import { describe, it, expect } from 'vitest';
import { createTestApplication } from '@rx-ted/packages-honest';
import { Container } from '@rx-ted/packages-honest';
import { ApiDocPlugin } from '@rx-ted/packages-honest-plugins/api-doc';
import { CacheService } from '@rx-ted/packages-honest-plugins/cache';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { CounterService } from '@rx-ted/packages-honest-plugins/counter';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import AppModule from '../src/app.module';

describe('generate openapi snapshot', () => {
  it('should bootstrap the app and write openapi.json', async () => {
    process.env.DEBUG = 'true';
    process.env.JWT_SECRET = 'test-jwt-secret-for-snapshot-generation';

    const container = new Container();
    container.register(DbService, {
      select: () => ({
        from: () => ({
          where: () => ({ orderBy: () => Promise.resolve([]) }),
        }),
      }),
      insert: () => ({
        values: () => ({ returning: () => Promise.resolve([]) }),
      }),
      update: () => ({
        set: () => ({
          where: () => ({ returning: () => Promise.resolve([]) }),
        }),
      }),
      delete: () => ({ where: () => Promise.resolve([]) }),
    } as any);
    container.register(CacheService, {
      get: () => Promise.resolve(null),
      set: () => Promise.resolve(),
      delete: () => Promise.resolve(),
      exists: () => Promise.resolve(false),
      mget: () => Promise.resolve([]),
      mset: () => Promise.resolve(),
      deleteByPattern: () => Promise.resolve(0),
      incr: () => Promise.resolve(1),
      decr: () => Promise.resolve(0),
      expire: () => Promise.resolve(),
      close: () => Promise.resolve(),
      healthCheck: () => Promise.resolve(true),
    } as any);
    container.register(CounterService, {
      increment: () => Promise.resolve({}),
      decrement: () => Promise.resolve({}),
      getValue: () => Promise.resolve(0),
      getPending: () => Promise.resolve(0),
      consumePending: () => Promise.resolve(0),
      reset: () => Promise.resolve(),
    } as any);

    const plugin = new ApiDocPlugin({
      specUrl: '/openapi.json',
      uiRoute: '/docs',
      uiTitle: 'Blog API Documentation',
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      security: [{ bearerAuth: [] }],
    });

    const testApp = await createTestApplication({
      module: AppModule,
      appOptions: {
        container,
        plugins: [plugin],
        routing: { prefix: 'api', version: 1 },
        debug: false,
      },
    });

    const response = await testApp.request('/api/v1/openapi.json');
    expect(response.status).toBe(200);

    const envelope = await response.json();
    const spec = envelope?.data ?? envelope;

    expect(spec).toBeDefined();
    expect(spec.openapi).toBeDefined();
    expect(spec.info).toBeDefined();
    expect(spec.paths).toBeDefined();

    const count = Object.keys(spec.paths).length;
    expect(count).toBeGreaterThan(10);

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const outputPath = resolve(__dirname, '..', 'specs', 'openapi.json');
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(spec, null, 2));

    console.log(`OpenAPI spec written to ${outputPath} (${count} paths)`);
  });
});
