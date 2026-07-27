import type { Middleware } from 'openapi-fetch';

export function createRequestLogger(): Middleware {
  return {
    onRequest: ({ request }) => {
      if (import.meta.env.DEV) {
        console.debug(`[HTTP] ${request.method} ${request.url}`);
      }
    },
    onResponse: ({ response }) => {
      if (import.meta.env.DEV) {
        console.debug(`[HTTP] ${response.status} ${response.url}`);
      }
    },
    onError: ({ error }) => {
      if (import.meta.env.DEV) {
        console.error('[HTTP] Error:', error);
      }
    },
  };
}
