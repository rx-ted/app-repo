import type { IMiddleware } from '@rx-ted/packages-honest';
import type { Context, Next } from 'hono';

export class ResponseWrapper implements IMiddleware {
  async use(c: Context, next: Next): Promise<void> {
    await next();

    const res = c.res;
    if (!res) return;

    if (!(res instanceof Response)) {
      c.res = c.json({ code: 'OK', status: 200, data: res, message: '', error: null }, 200);
      return;
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) return;

    const cloned = res.clone();
    const text = await cloned.text();
    if (!text.length) {
      c.res = new Response(text, { status: res.status, headers: res.headers });
      return;
    }

    try {
      const body = JSON.parse(text);
      if (!body || typeof body !== 'object') {
        c.res = new Response(text, { status: res.status, headers: res.headers });
        return;
      }
      if ('code' in body && 'status' in body && 'data' in body) {
        c.res = new Response(text, { status: res.status, headers: res.headers });
        return;
      }
      c.res = c.json(
        { code: 'OK', status: res.status, data: body, message: '', error: null },
        res.status as never,
      );
    } catch {
      c.res = new Response(text, { status: res.status, headers: res.headers });
    }
  }
}
