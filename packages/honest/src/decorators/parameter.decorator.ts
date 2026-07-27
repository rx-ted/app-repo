import { HONEST_PIPELINE_BODY_CACHE_KEY } from '../constants';
import { createParamDecorator } from '../helpers';

/**
 * Decorator that binds the request body to a parameter
 * @param data - Optional property name to extract from the body
 */
export const Body = createParamDecorator('body', async (data, ctx) => {
  let body = ctx.get(HONEST_PIPELINE_BODY_CACHE_KEY) as unknown;
  if (body === undefined) {
    body = await ctx.req.json();
    ctx.set(HONEST_PIPELINE_BODY_CACHE_KEY, body);
  }
  if (data && body && typeof body === 'object') {
    return (body as Record<string, unknown>)[String(data)];
  }
  return body;
});

/**
 * Decorator that binds a route parameter to a parameter
 * @param data - The parameter name in the route
 */
export const Param = createParamDecorator('param', (data, ctx) => {
  return data ? ctx.req.param(String(data)) : ctx.req.param();
});

/**
 * Decorator that binds a query parameter to a parameter
 * @param data - The query parameter name
 */
export const Query = createParamDecorator('query', (data, ctx) => {
  return data ? ctx.req.query(String(data)) : ctx.req.query();
});

/**
 * Decorator that binds a header value to a parameter
 * @param data - The header name
 */
export const Header = createParamDecorator('header', (data, ctx) => {
  return data ? ctx.req.header(String(data)) : ctx.req.header();
});
export const Headers = Header;

/**
 * Decorator that binds the request object to a parameter
 */
export const Req = createParamDecorator('request', (_, ctx) => ctx.req);
export const Request = createParamDecorator('request', (_, ctx) => ctx.req);

/**
 * Decorator that binds the response object to a parameter
 */
export const Res = createParamDecorator('response', (_, ctx) => ctx.res);
export const Response = createParamDecorator('response', (_, ctx) => ctx.res);

/**
 * Decorator that binds the context object to a parameter
 */
export const Ctx = createParamDecorator('context', (_, ctx) => ctx);
export const Context = createParamDecorator('context', (_, ctx) => ctx);

/**
 * Decorator that binds a context variable to a parameter
 * @param data - The variable name to retrieve from context
 */
export const Var = createParamDecorator('variable', (data, ctx) =>
  data === undefined ? undefined : ctx.get(String(data)),
);
export const Variable = createParamDecorator('variable', (data, ctx) =>
  data === undefined ? undefined : ctx.get(String(data)),
);

/**
 * Decorator that binds the client IP address to a parameter.
 * Reads from `CF-Connecting-IP` (Cloudflare), `X-Real-IP`, then `X-Forwarded-For`.
 * Falls back to `unknown`.
 */
export const Ip = createParamDecorator(
  'ip',
  (_, ctx) =>
    ctx.req.header('cf-connecting-ip') ??
    ctx.req.header('x-real-ip') ??
    ctx.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown',
);

/**
 * Decorator that binds the User-Agent header to a parameter.
 */
export const UA = createParamDecorator('ua', (_, ctx) => ctx.req.header('user-agent'));

/**
 * Decorator that binds cookie values to a parameter.
 * @param name - Optional cookie name. If omitted, returns all cookies as a record.
 */
export const Cookie = createParamDecorator('cookie', (data, ctx) => {
  const raw = ctx.req.header('cookie') ?? '';
  const cookies: Record<string, string> = {};
  for (const pair of raw.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    if (key) cookies[key] = pair.slice(idx + 1).trim();
  }
  return data ? cookies[String(data)] : cookies;
});

/**
 * Decorator that binds the session object from context to a parameter.
 * @param key - Optional session property key to extract
 */
export const Session = createParamDecorator('session', (data, ctx) => {
  const session = ctx.get('session');
  if (data !== undefined && session && typeof session === 'object') {
    return (session as Record<string, unknown>)[String(data)];
  }
  return session;
});

/**
 * Decorator that binds parsed host subdomains to a parameter.
 * Extracts subdomain parts from the `Host` header (e.g. `['api', 'v1']` from `api.v1.example.com`).
 */
export const HostParam = createParamDecorator('hostparam', (_data, ctx) => {
  const host = ctx.req.header('host') ?? '';
  return host.split('.').slice(0, -2);
});

/**
 * Decorator that provides a no-op `next` function for NestJS compatibility.
 * In Hono / honest, middleware chains use `await next()` explicitly — there is no
 * `next` callback to inject.  This decorator exists so that code ported from
 * NestJS or Express compiles without changes.
 */
export const Next = createParamDecorator('next', () => () => undefined);
