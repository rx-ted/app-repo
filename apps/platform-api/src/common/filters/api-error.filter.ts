import type { IFilter } from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ILogger } from '@rx-ted/packages-core';
import { env } from '@rx-ted/packages-core';
import { ApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

interface ErrorContext {
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
}

function getErrorContext(c: Context): ErrorContext {
  return {
    requestId: c.get('requestId'),
    userId: c.get('userId'),
    path: c.req.path,
    method: c.req.method,
  };
}

function getReqLogger(c: Context): ILogger {
  return (c.get('logger') || logger) as unknown as ILogger;
}

function buildResponse(
  c: Context,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const ctx = getErrorContext(c);
  return c.json(
    {
      status,
      code,
      message,
      data: null,
      error: details ?? null,
      requestId: ctx.requestId,
      timestamp: new Date().toISOString(),
    },
    status as never,
  );
}

export class ApiErrorFilter implements IFilter {
  async catch(exception: Error, c: Context): Promise<Response | undefined> {
    const ctx = getErrorContext(c);
    const reqLogger = getReqLogger(c);

    if (exception instanceof ApiError) {
      const level = exception.status >= 400 && exception.status < 500 ? 'warn' : 'error';
      reqLogger[level](`ApiError: ${exception.code}`, {
        ...ctx,
        code: exception.code,
        status: exception.status,
        details: exception.details,
        stack: exception.stack,
      });
      return buildResponse(
        c,
        exception.status,
        exception.code,
        exception.message,
        env.DEBUG ? exception.details : undefined,
      );
    }

    if (exception instanceof HTTPException) {
      reqLogger.warn(
        { ...ctx, status: exception.status, message: exception.message, stack: exception.stack },
        `HTTPException: ${exception.status}`,
      );
      return buildResponse(c, exception.status, 'HTTP_ERROR', exception.message);
    }

    if ('issues' in exception && Array.isArray((exception as any).issues)) {
      const issues = (exception as any).issues;
      reqLogger.warn({ ...ctx, issues }, `ValidationError: ${exception.message}`);
      return buildResponse(
        c,
        400,
        'VALIDATION_ERROR',
        env.DEBUG ? exception.message : 'Request validation failed.',
        env.DEBUG ? issues : undefined,
      );
    }

    reqLogger.error(
      { ...ctx, name: exception.name, stack: exception.stack, cause: exception.cause },
      `UnhandledError: ${exception.message}`,
    );

    return buildResponse(
      c,
      500,
      'INTERNAL_SERVER_ERROR',
      env.DEBUG ? exception.message : 'An unexpected error occurred.',
      env.DEBUG && exception.cause ? { cause: String(exception.cause) } : undefined,
    );
  }
}
