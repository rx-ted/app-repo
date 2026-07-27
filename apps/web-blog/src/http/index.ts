import { httpConfig } from '@/config/http';
import { createHttpClient } from '@/http/client';
import { tokenStorage } from '@/lib/http/tokenStorage';
import { useStorage } from '@/composables/useStorage';

export const http = createHttpClient(httpConfig);

export function setupHttpAuth() {
  const existingToken = tokenStorage.token;
  if (existingToken) {
    http.setAuthToken(existingToken);
  }

  tokenStorage.subscribe((token: string | null) => {
    http.setAuthToken(token);
    if (!token) {
      const storage = useStorage();
      if (typeof window !== 'undefined' && !storage.getSession('authRedirecting', false)) {
        storage.setSession('authRedirecting', true);
        const stolen = storage.getSession('authStolen', '');
        const target = stolen ? '/login?stolen=1' : '/login';
        window.location.href = target;
      }
    }
  });
}

export * from '@/http/client';
export * from '@/http/types';
