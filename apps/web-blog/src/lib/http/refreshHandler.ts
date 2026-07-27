import { tokenStorage } from './tokenStorage';

const STOLEN_KEY = 'auth:stolen';

export class RefreshQueue {
  private _promise: Promise<string | null> | null = null;

  get isRefreshing(): boolean {
    return this._promise !== null;
  }

  async refresh(fn: () => Promise<string | null>): Promise<string | null> {
    if (this._promise) return this._promise;
    this._promise = fn().finally(() => {
      this._promise = null;
    });
    return this._promise;
  }

  reset(): void {
    this._promise = null;
  }
}

export const refreshQueue = new RefreshQueue();

export async function doRefresh(baseUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message = (body as Record<string, unknown>)?.message ?? '';
      if (
        typeof message === 'string' &&
        (message.includes('reuse detected') || message.includes('TOKEN_STOLEN'))
      ) {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(STOLEN_KEY, '1');
        }
      }
      return null;
    }
    const data = (await res.json()) as { accessToken: string };
    tokenStorage.token = data.accessToken;
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function getValidToken(baseUrl: string): Promise<string | null> {
  if (tokenStorage.token) return tokenStorage.token;
  return refreshQueue.refresh(() => doRefresh(baseUrl));
}
