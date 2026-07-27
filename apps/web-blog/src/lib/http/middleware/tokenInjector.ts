import type { Middleware } from 'openapi-fetch';
import type { TokenStorage } from '@/lib/http/tokenStorage';

export function createTokenInjector(tokenStorage: TokenStorage): Middleware {
  return {
    onRequest: ({ request }) => {
      const token = tokenStorage.token;
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`);
      }
      return request;
    },
  };
}
