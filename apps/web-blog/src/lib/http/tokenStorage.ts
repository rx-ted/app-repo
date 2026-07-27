const AUTH_CHANNEL = 'auth:token';

export class TokenStorage {
  private _token: string | null = null;
  private listeners = new Set<(token: string | null) => void>();
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(AUTH_CHANNEL);
        this.channel.onmessage = (event: MessageEvent) => {
          if (event.data?.type === 'token_updated') {
            this._token = event.data.token ?? null;
            this.notify();
          }
        };
      } catch {
        /* BroadcastChannel unavailable */
      }
    }
  }

  get token(): string | null {
    return this._token;
  }

  set token(value: string | null) {
    this._token = value;
    this.channel?.postMessage({ type: 'token_updated', token: value });
    this.notify();
  }

  subscribe(listener: (token: string | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const fn of this.listeners) fn(this._token);
  }

  destroy(): void {
    this.listeners.clear();
    this.channel?.close();
  }
}

export const tokenStorage = new TokenStorage();
