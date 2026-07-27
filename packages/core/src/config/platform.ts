import { AsyncLocalStorage } from 'node:async_hooks';

export type Platform = 'node' | 'bun' | 'deno' | 'cloudflare' | 'vercel-edge';

export interface RuntimeContext {
  platform: Platform;
  env: Record<string, any>;
  request?: Request;
  executionContext?: unknown;
  waitUntil?: (promise: Promise<unknown>) => void;
}

const als = new AsyncLocalStorage<RuntimeContext>();
let appContext: RuntimeContext | null = null;

let cached: Platform | null = null;

function detectPlatform(): Platform {
  if (cached) return cached;
  const g = globalThis as any;
  if (typeof g.Deno !== 'undefined') {
    cached = 'deno';
    return cached;
  }
  if (typeof g.Bun !== 'undefined') {
    cached = 'bun';
    return cached;
  }
  if (typeof g.navigator !== 'undefined' && g.navigator?.userAgent === 'Cloudflare-Workers') {
    cached = 'cloudflare';
    return cached;
  }
  if (typeof process !== 'undefined' && process.versions?.node) {
    cached = 'node';
    return cached;
  }
  if (typeof process !== 'undefined' && process.env) {
    cached = 'vercel-edge';
    return cached;
  }
  cached = 'node';
  return cached;
}

function resetDetection(): void {
  cached = null;
}

export { detectPlatform, resetDetection };

function defaultEnv(): Record<string, string | undefined> {
  if (typeof process !== 'undefined' && process.env) return process.env;
  return {};
}

function union(
  a: Record<string, string | undefined>,
  b: Record<string, string | undefined>,
): Record<string, string | undefined> {
  return { ...a, ...b };
}

export const Platform = {
  run<T>(context: RuntimeContext, fn: () => T): T {
    const hasEnv = Object.keys(context.env).length > 0;
    if (!hasEnv) {
      console.warn(
        '[Platform.run] env is empty — D1 bindings and other platform resources will not be available. ' +
          'Ensure Platform.setAppContext() is called before run(), or pass env in the context.',
      );
    }
    return als.run(context, fn);
  },

  context(): RuntimeContext {
    return als.getStore() ?? appContext ?? { platform: detectPlatform(), env: defaultEnv() };
  },

  env(): Record<string, string | undefined> {
    const ctx = Platform.context();
    if (als.getStore() && appContext) {
      return union(appContext.env, ctx.env);
    }
    return ctx.env;
  },

  request(): Request | undefined {
    return Platform.context().request;
  },

  platform(): Platform {
    return Platform.context().platform;
  },

  setAppContext(context: RuntimeContext): void {
    appContext = context;
  },

  clearAppContext(): void {
    appContext = null;
  },
};
