import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import {
  Controller,
  Get,
  Post,
  createTestApplication,
  createTestingModule,
  VERSION_NEUTRAL,
} from '@rx-ted/packages-honest';
import { ApiDocPlugin, normalizeRoute, type ApiDocPluginOptions } from './api-doc.plugin';
import { ScalarRenderer } from './renderers/scalar.renderer';
import { SwaggerRenderer } from './renderers/swagger.renderer';
import type { IDocRenderer } from './interfaces/renderer.interface';
import { z } from 'zod';

@Controller('/items', { tag: { name: 'Items', description: 'Item management endpoints' } })
class ItemsController {
  @Get('/', {
    apiDoc: {
      summary: 'List all items',
      description: 'Returns a paginated list of items',
      tags: ['Items'],
    },
  })
  list() {
    return [];
  }

  @Get('/:id', {
    apiDoc: {
      summary: 'Get item by ID',
      tags: ['Items'],
      request: {
        params: z.object({ id: z.string() }),
      },
      responses: {
        200: { description: 'Item found' },
        404: { description: 'Item not found' },
      },
    },
  })
  getById() {
    return {};
  }

  @Post('/', {
    apiDoc: {
      summary: 'Create item',
      tags: ['Items'],
      request: {
        body: z.object({ name: z.string().min(1), price: z.number().min(0) }),
      },
      responses: {
        201: { description: 'Created' },
      },
    },
  })
  create() {
    return {};
  }

  @Get('/search', {
    apiDoc: {
      summary: 'Search items',
      tags: ['Items'],
      request: {
        query: z.object({ q: z.string(), page: z.number().optional() }),
      },
    },
  })
  search() {
    return [];
  }

  @Get('/admin', {
    apiDoc: {
      summary: 'Admin endpoint',
      tags: ['Admin'],
      security: [{ bearerAuth: [] }],
    },
  })
  admin() {
    return {};
  }
}

@Controller('/healthz', { tag: { name: 'System', description: 'System health endpoints' } })
class HealthController {
  @Get('/', {
    apiDoc: {
      summary: 'Health check',
      tags: ['System'],
    },
  })
  check() {
    return { ok: true };
  }
}

@Controller('/no-doc')
class NoDocController {
  @Get('/')
  plain() {
    return {};
  }
}

const TestAppModule = createTestingModule({
  controllers: [ItemsController, HealthController, NoDocController],
});

const mockRenderer: IDocRenderer = {
  name: 'mock',
  renderHtml: ({ specUrl, uiTitle }) => `<html>${specUrl}-${uiTitle}</html>`,
};

function createPlugin(options: ApiDocPluginOptions = {}) {
  return new ApiDocPlugin(options);
}

describe('ApiDocPlugin', () => {
  describe('constructor', () => {
    it('should set default options', () => {
      const plugin = createPlugin();
      expect(plugin.name).toBe('api-doc-plugin');
      expect(plugin.version).toBe('1.0.0');
    });

    it('should accept custom options', () => {
      const plugin = createPlugin({
        specUrl: '/spec.json',
        uiRoute: '/api-docs',
        uiTitle: 'My API',
        defaultRenderer: 'swagger',
      });
      expect((plugin as any).specUrl).toBe('/spec.json');
      expect((plugin as any).uiRoute).toBe('/api-docs');
      expect((plugin as any).uiTitle).toBe('My API');
      expect((plugin as any).defaultRendererName).toBe('swagger');
    });

    it('should register custom renderers', () => {
      const plugin = createPlugin({ renderers: [mockRenderer] });
      expect(plugin.getRenderer('mock')).toBe(mockRenderer);
    });

    it('should register default renderers when none provided', () => {
      const plugin = createPlugin();
      expect(plugin.getRenderer('scalar')).toBeInstanceOf(ScalarRenderer);
      expect(plugin.getRenderer('swagger')).toBeInstanceOf(SwaggerRenderer);
    });
  });

  describe('setRoutingOptions', () => {
    it('should store routing options', () => {
      const plugin = createPlugin();
      plugin.setRoutingOptions({ prefix: 'api', version: 1 });
      expect((plugin as any).routingPrefix).toBe('api');
      expect((plugin as any).routingVersion).toBe(1);
    });

    it('should handle undefined options', () => {
      const plugin = createPlugin();
      plugin.setRoutingOptions(undefined as any);
      expect((plugin as any).routingPrefix).toBeUndefined();
    });
  });

  describe('registerRenderer / getRenderer', () => {
    it('should register and retrieve renderer', () => {
      const plugin = createPlugin();
      plugin.registerRenderer(mockRenderer);
      expect(plugin.getRenderer('mock')).toBe(mockRenderer);
    });

    it('should return undefined for unknown renderer', () => {
      const plugin = createPlugin();
      expect(plugin.getRenderer('nonexistent')).toBeUndefined();
    });
  });

  describe('normalizeRoute', () => {
    it('should normalize route paths', () => {
      expect(normalizeRoute('/docs')).toBe('/docs');
      expect(normalizeRoute('docs')).toBe('/docs');
      expect(normalizeRoute('/docs/')).toBe('/docs');
      expect(normalizeRoute('')).toBe('/');
      expect(normalizeRoute('/')).toBe('/');
    });
  });

  describe('convertHonoPathToOpenAPI', () => {
    it('should convert :param to {param}', () => {
      const plugin = createPlugin();
      expect((plugin as any).convertHonoPathToOpenAPI('/users/:id')).toBe('/users/{id}');
      expect((plugin as any).convertHonoPathToOpenAPI('/:a/:b')).toBe('/{a}/{b}');
    });

    it('should leave non-param paths unchanged', () => {
      const plugin = createPlugin();
      expect((plugin as any).convertHonoPathToOpenAPI('/users/list')).toBe('/users/list');
    });
  });

  describe('isPathExcluded', () => {
    it('should exclude matching paths', () => {
      const plugin = createPlugin();
      expect((plugin as any).isPathExcluded('/health', ['/health'])).toBe(true);
      expect((plugin as any).isPathExcluded('/health/details', ['/health'])).toBe(false);
    });

    it('should support wildcard patterns', () => {
      const plugin = createPlugin();
      expect((plugin as any).isPathExcluded('/internal/secret', ['/internal/*'])).toBe(true);
      expect((plugin as any).isPathExcluded('/internal', ['/internal/*'])).toBe(false);
    });
  });

  describe('applyPrefixToUrl', () => {
    it('should return url unchanged when no routing options', () => {
      const plugin = createPlugin();
      expect((plugin as any).applyPrefixToUrl('/docs')).toBe('/docs');
    });

    it('should apply prefix', () => {
      const plugin = createPlugin();
      plugin.setRoutingOptions({ prefix: 'api', version: VERSION_NEUTRAL });
      expect((plugin as any).applyPrefixToUrl('/docs')).toBe('/api/docs');
    });

    it('should apply version', () => {
      const plugin = createPlugin();
      plugin.setRoutingOptions({ prefix: 'api', version: 1 });
      expect((plugin as any).applyPrefixToUrl('/docs')).toBe('/api/v1/docs');
    });
  });

  describe('toOpenAPISchema', () => {
    it('should handle plain object schema', () => {
      const plugin = createPlugin();
      const schema = (plugin as any).toOpenAPISchema({ type: 'string' });
      expect(schema).toEqual({ type: 'string' });
    });

    it('should handle null/undefined', () => {
      const plugin = createPlugin();
      expect((plugin as any).toOpenAPISchema(null)).toEqual({ type: 'object' });
      expect((plugin as any).toOpenAPISchema(undefined)).toEqual({ type: 'object' });
    });

    it('should handle Zod schemas', () => {
      const plugin = createPlugin();
      const result = (plugin as any).toOpenAPISchema(z.string());
      expect(result).toEqual({ type: 'string' });
    });
  });

  describe('zodToOpenAPI', () => {
    it('should convert ZodString', () => {
      const plugin = createPlugin();
      expect((plugin as any).zodToOpenAPI(z.string())).toEqual({ type: 'string' });
      expect((plugin as any).zodToOpenAPI(z.string().min(3).max(100))).toEqual({
        type: 'string',
        minLength: 3,
        maxLength: 100,
      });
    });

    it('should convert ZodNumber', () => {
      const plugin = createPlugin();
      expect((plugin as any).zodToOpenAPI(z.number())).toEqual({ type: 'number' });
      expect((plugin as any).zodToOpenAPI(z.number().min(0).max(100))).toEqual({
        type: 'number',
        minimum: 0,
        maximum: 100,
      });
    });

    it('should convert ZodBoolean', () => {
      const plugin = createPlugin();
      expect((plugin as any).zodToOpenAPI(z.boolean())).toEqual({ type: 'boolean' });
    });

    it('should convert ZodArray', () => {
      const plugin = createPlugin();
      expect((plugin as any).zodToOpenAPI(z.array(z.string()))).toEqual({
        type: 'array',
        items: { type: 'string' },
      });
    });

    it('should convert ZodObject', () => {
      const plugin = createPlugin();
      const schema = z.object({ name: z.string(), age: z.number().optional() });
      const result = (plugin as any).zodToOpenAPI(schema);
      expect(result).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name'],
      });
    });

    it('should convert ZodEnum', () => {
      const plugin = createPlugin();
      expect((plugin as any).zodToOpenAPI(z.enum(['a', 'b', 'c']))).toEqual({
        type: 'string',
        enum: ['a', 'b', 'c'],
      });
    });

    it('should convert ZodOptional', () => {
      const plugin = createPlugin();
      expect((plugin as any).zodToOpenAPI(z.string().optional())).toEqual({ type: 'string' });
    });

    it('should convert ZodUnion', () => {
      const plugin = createPlugin();
      const result = (plugin as any).zodToOpenAPI(z.union([z.string(), z.number()]));
      expect(result).toEqual({
        oneOf: [{ type: 'string' }, { type: 'number' }],
      });
    });
  });

  describe('spec generation', () => {
    it('should generate spec with routes from controllers', async () => {
      const plugin = createPlugin({
        specUrl: '/openapi.json',
        uiRoute: '/docs',
      });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
          debug: false,
        },
      });

      const response = await testApp.request('/openapi.json');
      expect(response.status).toBe(200);

      const envelope = await response.json();
      const spec = envelope.data;

      expect(spec.openapi).toBe('3.0.0');
      expect(spec.info.title).toBe('API Documentation');
      expect(spec.paths).toBeDefined();
    });

    it('should have expected routes in spec', async () => {
      const plugin = createPlugin({
        specUrl: '/openapi.json',
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        security: [{ bearerAuth: [] }],
      });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
        },
      });

      const response = await testApp.request('/openapi.json');
      const envelope = await response.json();
      const spec = envelope.data;

      // Main endpoints
      expect(spec.paths['/items']?.get).toBeDefined();
      expect(spec.paths['/items']?.post).toBeDefined();
      expect(spec.paths['/items/{id}']?.get).toBeDefined();
      expect(spec.paths['/items/search']?.get).toBeDefined();
      expect(spec.paths['/healthz']?.get).toBeDefined();

      // No-doc route should still appear (just without summary)
      expect(spec.paths['/no-doc']?.get).toBeDefined();
      expect(spec.paths['/no-doc'].get.summary).toBeUndefined();
    });

    it('should include tags in spec', async () => {
      const plugin = createPlugin({ specUrl: '/openapi.json' });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
        },
      });

      const response = await testApp.request('/openapi.json');
      const envelope = await response.json();
      const spec = envelope.data;

      expect(spec.tags).toBeDefined();
      const tagNames = spec.tags.map((t: any) => t.name);
      expect(tagNames).toContain('Items');
      expect(tagNames).toContain('System');

      // Items routes should have tag
      expect(spec.paths['/items']?.get?.tags).toEqual(['Items']);
      expect(spec.paths['/healthz']?.get?.tags).toEqual(['System']);
    });

    it('should include security schemes in spec', async () => {
      const plugin = createPlugin({
        specUrl: '/openapi.json',
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        security: [{ bearerAuth: [] }],
      });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
        },
      });

      const response = await testApp.request('/openapi.json');
      const envelope = await response.json();
      const spec = envelope.data;

      expect(spec.components?.securitySchemes?.bearerAuth).toBeDefined();
      expect(spec.components.securitySchemes.bearerAuth).toEqual({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      });
    });

    it('should include parameter schemas from Zod', async () => {
      const plugin = createPlugin({ specUrl: '/openapi.json' });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
        },
      });

      const response = await testApp.request('/openapi.json');
      const envelope = await response.json();
      const spec = envelope.data;

      const getById = spec.paths['/items/{id}']?.get;
      const params = getById?.parameters ?? [];

      expect(params).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          }),
        ]),
      );
    });

    it('should include request body schema', async () => {
      const plugin = createPlugin({ specUrl: '/openapi.json' });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
        },
      });

      const response = await testApp.request('/openapi.json');
      const envelope = await response.json();
      const spec = envelope.data;

      const postItem = spec.paths['/items']?.post;
      expect(postItem.requestBody).toBeDefined();
      expect(postItem.requestBody.content['application/json'].schema).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          price: { type: 'number', minimum: 0 },
        },
        required: ['name', 'price'],
      });
    });

    it('should include query parameter schemas', async () => {
      const plugin = createPlugin({ specUrl: '/openapi.json' });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
        },
      });

      const response = await testApp.request('/openapi.json');
      const envelope = await response.json();
      const spec = envelope.data;

      const searchRoute = spec.paths['/items/search']?.get;
      const params = searchRoute?.parameters ?? [];

      expect(params).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'q',
            in: 'query',
            required: true,
          }),
          expect.objectContaining({
            name: 'page',
            in: 'query',
            required: false,
          }),
        ]),
      );
    });

    it('should respect per-route security override', async () => {
      const plugin = createPlugin({
        specUrl: '/openapi.json',
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        security: [{ bearerAuth: [] }],
      });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
        },
      });

      const response = await testApp.request('/openapi.json');
      const envelope = await response.json();
      const spec = envelope.data;

      // Admin route has per-route security override
      expect(spec.paths['/items/admin']?.get?.security).toEqual([{ bearerAuth: [] }]);

      // Other routes use default security
      expect(spec.paths['/items']?.get?.security).toEqual([{ bearerAuth: [] }]);
    });

    it('should include response schemas', async () => {
      const plugin = createPlugin({ specUrl: '/openapi.json' });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
        },
      });

      const response = await testApp.request('/openapi.json');
      const envelope = await response.json();
      const spec = envelope.data;

      const getById = spec.paths['/items/{id}']?.get;
      expect(getById.responses).toBeDefined();
      expect(getById.responses['200']).toEqual({ description: 'Item found' });
      expect(getById.responses['404']).toEqual({ description: 'Item not found' });
    });
  });

  describe('exclusions', () => {
    it('should exclude specified paths', async () => {
      const plugin = createPlugin({
        specUrl: '/openapi.json',
        exclude: ['/healthz'],
      });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
        },
      });

      const response = await testApp.request('/openapi.json');
      const envelope = await response.json();
      const spec = envelope.data;

      expect(spec.paths['/healthz']).toBeUndefined();
      expect(spec.paths['/items']).toBeDefined();
    });

    it('should exclude specified methods', async () => {
      const plugin = createPlugin({
        specUrl: '/openapi.json',
        excludeMethods: ['post'],
      });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
        },
      });

      const response = await testApp.request('/openapi.json');
      const envelope = await response.json();
      const spec = envelope.data;

      expect(spec.paths['/items']?.post).toBeUndefined();
      expect(spec.paths['/items']?.get).toBeDefined();
    });

    it('should exclude specified tags', async () => {
      const plugin = createPlugin({
        specUrl: '/openapi.json',
        excludeTags: ['System'],
      });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
        },
      });

      const response = await testApp.request('/openapi.json');
      const envelope = await response.json();
      const spec = envelope.data;

      expect(spec.paths['/healthz']).toBeUndefined();
      expect(spec.paths['/items']).toBeDefined();
    });
  });

  describe('request lifecycle', () => {
    it('should serve spec via GET specUrl', async () => {
      const plugin = createPlugin({ specUrl: '/openapi.json' });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
        },
      });

      const response = await testApp.request('/openapi.json');
      expect(response.status).toBe(200);
    });

    it('should serve UI via GET uiRoute', async () => {
      const plugin = createPlugin({ uiRoute: '/docs', specUrl: '/openapi.json' });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
        },
      });

      const response = await testApp.request('/docs');
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
    });

    it('should serve renderers via GET uiRoute/:renderer', async () => {
      const plugin = createPlugin({ specUrl: '/openapi.json' });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
        },
      });

      const swaggerResponse = await testApp.request('/docs/swagger');
      expect(swaggerResponse.status).toBe(200);
      expect(swaggerResponse.headers.get('content-type')).toContain('text/html');

      const scalarResponse = await testApp.request('/docs/scalar');
      expect(scalarResponse.status).toBe(200);
    });

    it('should return 404 for unknown renderer', async () => {
      const plugin = createPlugin({ specUrl: '/openapi.json' });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
        },
      });

      const response = await testApp.request('/docs/nonexistent');
      expect(response.status).toBe(404);
    });

    it('should respect onRequest hook', async () => {
      const onRequest = vi.fn();
      const plugin = createPlugin({
        specUrl: '/openapi.json',
        onRequest,
      });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
        },
      });

      await testApp.request('/openapi.json');
      expect(onRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('routing prefix and version', () => {
    it('should work with routing prefix', async () => {
      const plugin = createPlugin({ specUrl: '/openapi.json' });

      const testApp = await createTestApplication({
        module: TestAppModule,
        appOptions: {
          plugins: [plugin],
          routing: { prefix: 'api', version: 1 },
        },
      });

      const response = await testApp.request('/api/v1/openapi.json');
      expect(response.status).toBe(200);

      const envelope = await response.json();
      expect(envelope.data.paths['/api/v1/items']?.get).toBeDefined();
    });
  });
});
