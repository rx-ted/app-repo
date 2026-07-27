import { ENV_SYMBOL, type Env, type ILogger } from '@rx-ted/packages-core';
import type {
  ApiDocOptions,
  ApiDocSecurityScheme,
  ApiDocSecurityRequirement,
  ApiTagOptions,
  Application,
  HonestOptions,
  IPlugin,
} from '@rx-ted/packages-honest';
import {
  ComponentManager,
  VERSION_NEUTRAL,
  normalizePath,
  resolvePluginLogger,
} from '@rx-ted/packages-honest';
import type { Context, Hono } from 'hono';
import type { IDocRenderer } from './interfaces/renderer.interface';
import { ScalarRenderer } from './renderers/scalar.renderer';
import { SwaggerRenderer } from './renderers/swagger.renderer';

type RendererName = 'scalar' | 'swagger';

export interface ApiDocPluginOptions {
  specUrl?: string;
  uiRoute?: string;
  uiTitle?: string;
  defaultRenderer?: RendererName;
  renderers?: IDocRenderer[];
  onRequest?: (c: Context) => void | Promise<void>;
  securitySchemes?: Record<string, ApiDocSecurityScheme>;
  security?: ApiDocSecurityRequirement[];
  exclude?: string[];
  excludeMethods?: string[];
  excludeTags?: string[];
}

export function normalizeRoute(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '/';
  let normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (normalized.length > 1) {
    normalized = normalized.replace(/\/+$/g, '');
  }
  return normalized || '/';
}

const DEFAULT_SECURITY_SCHEMES: Record<string, ApiDocSecurityScheme> = {
  bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
  basicAuth: { type: 'http', scheme: 'basic' },
  apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
  cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
};

export class ApiDocPlugin implements IPlugin {
  readonly name = 'api-doc-plugin';
  readonly version = '1.0.0';
  logger?: ILogger;

  private readonly specUrl: string = '/openapi.json';
  private readonly uiRoute: string = '/docs';
  private readonly uiTitle: string = 'API Documentation';
  private readonly defaultRendererName: RendererName = 'scalar';
  private readonly onRequest?: (c: Context) => void | Promise<void>;
  private readonly securitySchemes: Record<string, ApiDocSecurityScheme> = {
    ...DEFAULT_SECURITY_SCHEMES,
  };
  private readonly defaultSecurity?: ApiDocSecurityRequirement[];
  private readonly exclude?: string[];
  private readonly excludeMethods?: string[];
  private readonly excludeTags?: string[];
  private renderers: Map<string, IDocRenderer> = new Map();
  private spec: Record<string, any> | null = null;
  private routingPrefix?: string;
  private routingVersion?: number | typeof VERSION_NEUTRAL | number[];
  private app?: Application;

  constructor(options: ApiDocPluginOptions = {}) {
    if (options.specUrl !== undefined) this.specUrl = options.specUrl;
    if (options.uiRoute !== undefined) this.uiRoute = normalizeRoute(options.uiRoute);
    if (options.uiTitle !== undefined) this.uiTitle = options.uiTitle;
    if (options.defaultRenderer !== undefined) this.defaultRendererName = options.defaultRenderer;
    if (options.onRequest !== undefined) this.onRequest = options.onRequest;
    if (options.securitySchemes !== undefined) this.securitySchemes = options.securitySchemes;
    if (options.security !== undefined) this.defaultSecurity = options.security;
    if (options.exclude !== undefined) this.exclude = options.exclude;
    if (options.excludeMethods !== undefined) this.excludeMethods = options.excludeMethods;
    if (options.excludeTags !== undefined) this.excludeTags = options.excludeTags;
    if (options.renderers !== undefined) {
      options.renderers.forEach((r) => this.renderers.set(r.name, r));
    } else {
      [new ScalarRenderer(), new SwaggerRenderer()].forEach((r) => this.renderers.set(r.name, r));
    }
  }

  private applyPrefixToUrl(url: string): string {
    if (!this.routingPrefix && !this.routingVersion) {
      return url;
    }

    const prefix = this.routingPrefix ? normalizePath(`/${this.routingPrefix}`) : '';
    let versionSegment = '';

    if (
      this.routingVersion !== undefined &&
      this.routingVersion !== null &&
      this.routingVersion !== VERSION_NEUTRAL &&
      !Array.isArray(this.routingVersion)
    ) {
      versionSegment = `/v${this.routingVersion}`;
    }

    const base = `${prefix}${versionSegment}`;
    if (!base) return url;

    const urlPath = url.startsWith('/') ? url : `/${url}`;
    return normalizePath(`${base}${urlPath}`);
  }

  setRoutingOptions(options?: HonestOptions['routing']): void {
    if (options) {
      this.routingPrefix = options.prefix;
      this.routingVersion = options.version;
    }
  }

  registerRenderer(renderer: IDocRenderer): void {
    this.renderers.set(renderer.name, renderer);
  }

  getRenderer(name: string): IDocRenderer | undefined {
    return this.renderers.get(name);
  }

  beforeModulesRegistered = async (app: Application, hono: Hono): Promise<void> => {
    this.logger ??= resolvePluginLogger(this.name);

    if (!ComponentManager.hasPlugin(ENV_SYMBOL)) {
      this.logger.warn('ApiDoc disabled (env not configured)');
      return;
    }

    const envInstance = ComponentManager.getPlugin<Env>(ENV_SYMBOL);
    if (!envInstance.DEBUG) {
      this.logger.warn('ApiDoc disabled in production');
      return;
    }

    try {
      const routingOptions = app.getRoutingOptions();
      if (routingOptions) {
        this.setRoutingOptions(routingOptions);
      }
    } catch {
      // Ignore if options are not accessible
    }

    const specUrlWithPrefix = this.applyPrefixToUrl(this.specUrl);
    const uiRouteWithPrefix = this.applyPrefixToUrl(this.uiRoute);

    // Register callback to print doc URLs when server starts
    if (app.registerOnStartCallback) {
      app.registerOnStartCallback((port: number) => {
        const base = `http://localhost:${port}`;
        this.logger?.info(`Docs: ${base}${uiRouteWithPrefix}`);
        this.logger?.info(`OpenAPI JSON: ${base}${specUrlWithPrefix}`);
      });
    }

    hono.get(specUrlWithPrefix, async (c: Context) => {
      await this.runHook(c);
      if (!this.spec) {
        return c.json(
          { status: 500, code: 'ERROR', data: null, error: 'API spec not generated yet' },
          500,
        );
      }
      return c.json({ status: 200, code: 'OK', data: this.spec });
    });

    hono.get(uiRouteWithPrefix, async (c: Context) => {
      await this.runHook(c);
      const renderer = this.renderers.get(this.defaultRendererName);
      if (!renderer) {
        return c.json({ error: `Default renderer '${this.defaultRendererName}' not found` }, 500);
      }
      return c.html(
        renderer.renderHtml({
          specUrl: specUrlWithPrefix,
          uiTitle: this.uiTitle,
        }),
      );
    });

    hono.get(`${uiRouteWithPrefix}/:renderer`, async (c: Context) => {
      await this.runHook(c);
      const rendererName = c.req.param('renderer');
      if (!rendererName)
        return c.json(
          {
            error: `Renderer '${rendererName}' not found`,
            available: Array.from(this.renderers.keys()),
          },
          404,
        );

      const renderer = this.renderers.get(rendererName);

      if (!renderer) {
        return c.json(
          {
            error: `Renderer '${rendererName}' not found`,
            available: Array.from(this.renderers.keys()),
          },
          404,
        );
      }

      return c.html(
        renderer.renderHtml({
          specUrl: specUrlWithPrefix,
          uiTitle: this.uiTitle,
        }),
      );
    });
  };

  afterModulesRegistered = async (app: Application, hono: Hono): Promise<void> => {
    this.app = app;
    this.spec = this.generateSpec();
  };

  private generateSpec(): Record<string, any> {
    const paths: Record<string, any> = {};
    const tags: Array<{ name: string; description: string }> = [];

    if (!this.app) {
      return {
        openapi: '3.0.0',
        info: {
          title: this.uiTitle,
          version: '1.0.0',
          description: 'API Documentation',
        },
        paths: {},
      };
    }

    const routes = this.app.getRoutes();
    const controllerTags: Map<string | symbol, ApiTagOptions> = new Map();

    // Collect all controller tags first
    for (const route of routes) {
      if (route.controllerClass) {
        const tag = Reflect.getMetadata('api:controller:tag', route.controllerClass) as
          | ApiTagOptions
          | undefined;
        if (tag && !controllerTags.has(route.controller)) {
          controllerTags.set(route.controller, tag);
          tags.push({
            name: tag.name,
            description: tag.description ?? `${tag.name} endpoints`,
          });
        }
      }
    }

    for (const route of routes) {
      let fullPath = route.fullPath;
      if (!fullPath) continue;

      // Skip excluded paths
      if (this.exclude && this.isPathExcluded(fullPath, this.exclude)) {
        continue;
      }

      // Skip excluded methods
      if (this.excludeMethods?.map((m) => m.toLowerCase()).includes(route.method.toLowerCase())) {
        continue;
      }

      // Convert Hono :param syntax to OpenAPI {param} syntax
      fullPath = this.convertHonoPathToOpenAPI(fullPath);

      const pathItem = paths[fullPath] ?? {};

      const apiDoc = route.controllerClass
        ? (Reflect.getMetadata(
            'api:method:apiDoc',
            route.controllerClass.prototype,
            route.handler,
          ) as ApiDocOptions | undefined)
        : undefined;

      const controllerTag = controllerTags.get(route.controller);

      // Skip excluded tags
      const tagName = apiDoc?.tags ?? (controllerTag ? [controllerTag.name] : ['Default']);
      if (this.excludeTags && tagName.some((tag: string) => this.excludeTags!.includes(tag))) {
        continue;
      }

      const operation: any = {
        ...(apiDoc?.summary && { summary: apiDoc.summary }),
        ...(apiDoc?.description && { description: apiDoc.description }),
        tags: tagName,
        // Add security requirements
        ...(apiDoc?.security
          ? { security: apiDoc.security }
          : this.defaultSecurity
            ? { security: this.defaultSecurity }
            : this.securitySchemes
              ? { security: Object.keys(this.securitySchemes).map((n) => ({ [n]: [] })) }
              : {}),
      };

      // Handle parameters (path params from Zod schema + query params)
      const parameters: any[] = [];

      // Add path parameters from apiDoc.request.params
      if (apiDoc?.request?.params) {
        const paramsSchema = this.toOpenAPISchema(apiDoc.request.params);
        if (paramsSchema.properties) {
          for (const [name, schema] of Object.entries(
            paramsSchema.properties as Record<string, any>,
          )) {
            parameters.push({
              name,
              in: 'path',
              required: true,
              schema,
            });
          }
        }
      }

      // Add query parameters from apiDoc.request.query
      if (apiDoc?.request?.query) {
        const querySchema = this.toOpenAPISchema(apiDoc.request.query);
        if (querySchema.properties) {
          for (const [name, schema] of Object.entries(
            querySchema.properties as Record<string, any>,
          )) {
            parameters.push({
              name,
              in: 'query',
              required: querySchema.required?.includes(name) ?? false,
              schema,
            });
          }
        }
      }

      if (parameters.length > 0) {
        operation.parameters = parameters;
      }

      if (apiDoc?.request?.body) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: this.toOpenAPISchema(apiDoc.request.body),
            },
          },
        };
      }

      if (apiDoc?.responses) {
        operation.responses = {};
        for (const [statusStr, response] of Object.entries(apiDoc.responses)) {
          const status = parseInt(statusStr, 10);
          operation.responses[status] = {
            description: response.description ?? 'Success',
            ...(response.schema && {
              content: {
                'application/json': {
                  schema: this.toOpenAPISchema(response.schema),
                },
              },
            }),
          };
        }
      }

      pathItem[route.method] = operation;
      paths[fullPath] = pathItem;
    }

    return {
      openapi: '3.0.0',
      info: {
        title: this.uiTitle,
        version: '1.0.0',
        description: 'API Documentation',
      },
      paths,
      ...(tags.length > 0 && { tags }),
      components: {
        securitySchemes: this.securitySchemes,
      },
    };
  }

  private convertHonoPathToOpenAPI(honoPath: string): string {
    // Convert Hono :param syntax to OpenAPI {param} syntax
    return honoPath.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}');
  }

  private isPathExcluded(path: string, excludePatterns: string[]): boolean {
    return excludePatterns.some((pattern) => {
      // Convert pattern to regex (support wildcard *)
      const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
      return regex.test(path);
    });
  }

  private toOpenAPISchema(schema: any): any {
    if (!schema) return { type: 'object' };
    if (schema._def) {
      return this.zodToOpenAPI(schema);
    }
    if (schema.type || schema.properties) {
      return schema;
    }
    return { type: 'object' };
  }

  private zodToOpenAPI(schema: any): any {
    if (!schema?._def) return { type: 'object' };

    const def = schema._def;

    // Handle Zod 4.x new structure (type, innerType, etc.)
    // Zod 4.x uses def.type property instead of typeName
    const zodType = def.type || def.typeName;

    switch (zodType) {
      case 'string':
      case 'ZodString': {
        const stringMeta: any = { type: 'string' };
        // Zod 3.x: checks in def.checks
        if (def.checks) {
          for (const check of def.checks) {
            if (check.kind === 'min') stringMeta.minLength = check.value;
            if (check.kind === 'max') stringMeta.maxLength = check.value;
            if (check.kind === 'regex') stringMeta.pattern = check.regex.source;
          }
        }
        // Zod 4.x: instance properties
        if (schema.minLength != null) stringMeta.minLength = schema.minLength;
        if (schema.maxLength != null) stringMeta.maxLength = schema.maxLength;
        return stringMeta;
      }

      case 'number':
      case 'ZodNumber': {
        const numberMeta: any = { type: 'number' };
        // Zod 3.x: checks in def.checks
        if (def.checks) {
          for (const check of def.checks) {
            if (check.kind === 'min') numberMeta.minimum = check.value;
            if (check.kind === 'max') numberMeta.maximum = check.value;
          }
        }
        // Zod 4.x: instance properties
        if (schema.minValue != null && Number.isFinite(schema.minValue))
          numberMeta.minimum = schema.minValue;
        if (schema.maxValue != null && Number.isFinite(schema.maxValue))
          numberMeta.maximum = schema.maxValue;
        return numberMeta;
      }

      case 'boolean':
      case 'ZodBoolean':
        return { type: 'boolean' };

      case 'array':
      case 'ZodArray': {
        // Zod 4.x: def.element, Zod 3.x: def.type (the schema, not a string)
        const elementSchema =
          def.element ||
          (typeof def.type !== 'string' ? def.type : null) ||
          (def.typeName ? def : null);
        return {
          type: 'array',
          items: elementSchema ? this.zodToOpenAPI(elementSchema) : { type: 'object' },
        };
      }

      case 'object':
      case 'ZodObject': {
        const properties: Record<string, any> = {};
        const required: string[] = [];

        // Zod 4.x: def.shape() or def.shape
        // Zod 3.x: def.shape()
        const shape = typeof def.shape === 'function' ? def.shape() : def.shape || {};

        for (const [key, value] of Object.entries(shape as Record<string, any>)) {
          const field = value as any;
          properties[key] = this.zodToOpenAPI(field);

          // Check if field is required (not optional)
          const fieldDef = field?._def;
          const fieldType = fieldDef?.type || fieldDef?.typeName;
          if (fieldType !== 'optional' && fieldType !== 'ZodOptional') {
            required.push(key);
          }
        }

        return {
          type: 'object',
          properties,
          ...(required.length > 0 && { required }),
        };
      }

      case 'optional':
      case 'ZodOptional':
        // Zod 4.x: def.innerType, Zod 3.x: def.innerType or def.type
        return this.zodToOpenAPI(def.innerType ?? def.type);

      case 'enum':
      case 'ZodEnum':
        return {
          type: 'string',
          enum: def.values || (def.entries ? Object.values(def.entries) : []),
        };

      case 'null':
      case 'ZodNull':
        return { type: 'null' };

      case 'union':
      case 'ZodUnion':
        if (def.options) {
          return {
            oneOf: def.options.map((opt: any) => this.zodToOpenAPI(opt)),
          };
        }
        return { type: 'object' };

      default:
        return { type: 'object' };
    }
  }

  private async runHook(c: Context): Promise<void> {
    if (this.onRequest) {
      await this.onRequest(c);
    }
  }
}
