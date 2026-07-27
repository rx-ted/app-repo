import type { Context, Next } from 'hono';
import type { z, ZodType } from 'zod';

export function createValidator(schema: ZodType, source: 'body' | 'query' | 'param' = 'body') {
  return async (c: Context, next: Next) => {
    let data: unknown;

    switch (source) {
      case 'body':
        data = await c.req.json().catch(() => ({}));
        break;
      case 'query':
        data = Object.fromEntries(
          Object.entries(c.req.query() as Record<string, string>).map(([k, v]) => [k, v ?? '']),
        );
        break;
      case 'param':
        data = c.req.param();
        break;
    }

    const result = schema.safeParse(data);

    if (!result.success) {
      return c.json(
        {
          error: 'Validation failed',
          details: result.error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        400,
      );
    }

    c.set('validatedData', result.data);
    await next();
  };
}

export function getValidatedData<T>(c: Context): T {
  return c.get('validatedData') as T;
}

export function validateBody<T extends ZodType>(schema: T) {
  return createValidator(schema, 'body');
}

export function validateQuery<T extends ZodType>(schema: T) {
  return createValidator(schema, 'query');
}

export function validateParams<T extends ZodType>(schema: T) {
  return createValidator(schema, 'param');
}

export function generateZodSchema<T extends z.ZodType>(schema: T, _name: string) {
  return {
    contentType: 'application/json',
    schema: schema,
  };
}
