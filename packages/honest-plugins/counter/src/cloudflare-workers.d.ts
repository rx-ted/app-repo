/**
 * Type stubs for Cloudflare Workers runtime.
 * At build time, wrangler resolves these from `cloudflare:workers`.
 * For local TypeScript compilation, we provide minimal type declarations.
 */
declare module 'cloudflare:workers' {
  export abstract class DurableObject {
    protected ctx: {
      getAlarm(): Promise<number | null>;
      setAlarm(timestamp: number): Promise<void>;
      storage: {
        get<T = unknown>(key: string): Promise<T | undefined>;
        put<T = unknown>(key: string, value: T): Promise<void>;
        delete(key: string): Promise<void>;
      };
    };
    protected env: unknown;
    constructor(ctx: DurableObjectState, env: unknown);
  }

  export interface DurableObjectId {
    toString(): string;
  }
}
