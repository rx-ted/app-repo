// apps/platform-api/scripts/export-openapi.ts
import { createTestApplication } from '@rx-ted/packages-honest';
import { Container } from '@rx-ted/packages-honest';
import { ApiDocPlugin } from '@rx-ted/packages-honest-plugins/api-doc';
import { CacheService } from '@rx-ted/packages-honest-plugins/cache';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import AppModule from '../src/app.module';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  process.env.DEBUG = 'true';
  process.env.JWT_SECRET = 'test-jwt-secret-for-openapi-export';

  const container = new Container();
  container.register(DbService, {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve([]),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([]),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([]),
        }),
      }),
    }),
    delete: () => ({
      where: () => Promise.resolve([]),
    }),
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
  if (response.status !== 200) {
    throw new Error(`Failed to fetch OpenAPI spec: HTTP ${response.status}`);
  }

  const envelope = await response.json();
  const spec = envelope?.data ?? envelope;

  if (!spec?.openapi || !spec?.paths) {
    throw new Error('Invalid OpenAPI spec: missing openapi or paths');
  }

  const prefix = '/api/v1';
  const strippedPaths: Record<string, any> = {};
  for (const [path, methods] of Object.entries(spec.paths)) {
    const stripped = path.startsWith(prefix) ? path.slice(prefix.length) || '/' : path;
    strippedPaths[stripped] = methods;
  }
  spec.paths = strippedPaths;

  const outputPath = resolve(__dirname, '..', 'specs', 'openapi.json');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(spec, null, 2));

  const pathCount = Object.keys(spec.paths).length;
  console.log(`OpenAPI spec written to ${outputPath} (${pathCount} paths)`);
}

main().catch((err) => {
  console.error('Failed to export OpenAPI spec:', err);
  process.exit(1);
});
