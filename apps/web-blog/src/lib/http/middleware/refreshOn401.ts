import type { Middleware } from 'openapi-fetch';
import { getValidToken } from '@/lib/http/refreshHandler';

export function createRefreshOn401(baseUrl: string): Middleware {
  return {
    onError: async ({ request, error }) => {
      if (!(error instanceof Response) || error.status !== 401) return;

      const newToken = await getValidToken(baseUrl);
      if (!newToken) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return;
      }

      request.headers.set('Authorization', `Bearer ${newToken}`);
      return fetch(request);
    },
  };
}
