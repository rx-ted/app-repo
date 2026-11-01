import { z } from 'zod';

export interface OpenAPIPaths {
  [path: string]: {
    get?: OpenAPIOperation;
    post?: OpenAPIOperation;
    put?: OpenAPIOperation;
    header?: OpenAPIOperation;
    delete?: OpenAPIOperation;
    patch?: OpenAPIOperation;
    options?: OpenAPIOperation;
  };
}

export interface OpenAPIOperation {
  summary?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
}

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required?: boolean;
  schema: Record<string, unknown>;
}

export interface OpenAPIRequestBody {
  required?: boolean;
  content: {
    'application/json': {
      schema: Record<string, unknown>;
    };
  };
}

export interface OpenAPIResponse {
  description: string;
  content?: {
    'application/json': {
      schema: Record<string, unknown>;
    };
  };
}

export interface OpenAPIObject {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: OpenAPIPaths;
  tags: { name: string; description: string }[];
}

export interface RouteSpec {
  method: 'get' | 'post' | 'put' | 'header' | 'delete' | 'patch' | 'options';
  path: string;
  summary?: string;
  tags?: string[];
  request?: {
    body?: z.ZodType;
    query?: z.ZodType;
    params?: z.ZodType;
  };
  response?: {
    status: number;
    schema: z.ZodType;
    description?: string;
  };
}

const routes: RouteSpec[] = [];

export function registerRoute(spec: RouteSpec) {
  routes.push(spec);
}

export function generateOpenAPISpec(): OpenAPIObject {
  const paths: OpenAPIObject['paths'] = {};
  const tags: { name: string; description: string }[] = [];

  for (const route of routes) {
    const tag = route.tags?.[0] ?? 'Default';
    if (!tags.find((t) => t.name === tag)) {
      tags.push({ name: tag, description: `${tag} endpoints` });
    }

    const pathItem = paths[route.path] ?? {};
    const operation: Record<string, unknown> = {
      summary: route.summary ?? `${route.method} ${route.path}`,
      tags: route.tags,
      responses: route.response
        ? {
            [route.response.status]: {
              description: route.response.description ?? 'Success',
              content: {
                'application/json': {
                  schema: zodToJsonSchema(route.response.schema),
                },
              },
            },
          }
        : {},
    };

    if (route.request?.body) {
      (operation as Record<string, unknown>).requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: zodToJsonSchema(route.request.body),
          },
        },
      };
    }

    if (route.request?.query) {
      (operation as Record<string, unknown>).parameters = extractQueryParams(route.request.query);
    }

    pathItem[route.method] = operation;
    paths[route.path] = pathItem;
  }

  return {
    openapi: '3.0.0',
    info: {
      title: 'Blog API',
      version: '1.0.0',
      description: 'Blog platform API with Zod validation',
    },
    paths,
    tags,
  };
}

function resolveSchema(schema: z.ZodType): {
  type: string;
  format?: string;
  enumValues?: string[];
  defaultValue?: unknown;
  isOptional: boolean;
} {
  if (schema instanceof z.ZodDefault) {
    const inner = resolveSchema((schema as any)._def.innerType);
    return { ...inner, defaultValue: (schema as any)._def.defaultValue, isOptional: true };
  }
  if (schema instanceof z.ZodOptional) {
    const inner = resolveSchema((schema as any)._def.innerType);
    return { ...inner, isOptional: true };
  }
  if (schema instanceof z.ZodString) return { type: 'string', isOptional: false };
  if (schema instanceof z.ZodEmail) return { type: 'string', format: 'email', isOptional: false };
  if (schema instanceof z.ZodNumber) return { type: 'number', isOptional: false };
  if (schema instanceof z.ZodBoolean) return { type: 'boolean', isOptional: false };
  if (schema instanceof z.ZodArray) return { type: 'array', isOptional: false };
  if (schema instanceof z.ZodObject) return { type: 'object', isOptional: false };
  if (schema instanceof z.ZodEnum) {
    return { type: 'string', enumValues: (schema as any).options, isOptional: false };
  }
  return { type: 'string', isOptional: false };
}

function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const parseShape = (shape: Record<string, z.ZodType>): Record<string, unknown> => {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, field] of Object.entries(shape)) {
      const description = (field as any).description;
      const resolved = resolveSchema(field);

      const prop: Record<string, unknown> = { type: resolved.type };
      if (description) prop.description = description;
      if (resolved.format) prop.format = resolved.format;
      if (resolved.enumValues) prop.enum = resolved.enumValues;
      if (resolved.defaultValue !== undefined) prop.default = resolved.defaultValue;

      properties[key] = prop;

      if (!resolved.isOptional) {
        required.push(key);
      }
    }

    return { type: 'object', properties, required: required.length ? required : undefined };
  };

  if (schema instanceof z.ZodObject) {
    return parseShape(schema.shape);
  }

  if (schema instanceof z.ZodArray) {
    return { type: 'array', items: zodToJsonSchema((schema as any).element) };
  }

  if (schema instanceof z.ZodString) return { type: 'string' };
  if (schema instanceof z.ZodEmail) return { type: 'string', format: 'email' };
  if (schema instanceof z.ZodNumber) return { type: 'number' };
  if (schema instanceof z.ZodBoolean) return { type: 'boolean' };
  if (schema instanceof z.ZodOptional) return zodToJsonSchema((schema as any)._def.innerType);
  if (schema instanceof z.ZodDefault) return zodToJsonSchema((schema as any)._def.innerType);
  if (schema instanceof z.ZodEnum) return { type: 'string', enum: (schema as any).options };

  return { type: 'object' };
}

function extractQueryParams(
  schema: z.ZodType,
): { name: string; in: string; required: boolean; schema: Record<string, unknown> }[] {
  if (!(schema instanceof z.ZodObject)) return [];

  return Object.entries(schema.shape).map(([key, field]) => {
    const resolved = resolveSchema(field as z.ZodType);
    const qs: Record<string, unknown> = { type: resolved.type };
    if (resolved.enumValues) qs.enum = resolved.enumValues;

    return {
      name: key,
      in: 'query' as const,
      required: !resolved.isOptional,
      schema: qs,
    };
  });
}

export { z };
