import { detectPlatform } from './platform';
import type { Platform as PlatformType } from './platform';
import type { DotenvOptions } from './dotenv';
import { assertString, assertNumber, assertBoolean, assertUrl } from '../utils/shared';
import { resolveKey } from './prefixes';
import type { z } from 'zod';
type EnvSource = Record<string, any>;

export type EnvMode = 'prod' | 'dev';

export const ENV_SYMBOL = Symbol('app:env');

export class Env {
  private _env: Record<string, any>;
  private _ctx: Record<string, any>;

  constructor(env?: Record<string, any>, ctx?: Record<string, any>) {
    this._env = env ?? {};
    this._ctx = ctx ?? {};
  }

  get platform(): PlatformType {
    return detectPlatform();
  }

  get mode(): EnvMode {
    const debugRaw = this._env.DEBUG ?? this._ctx.DEBUG;
    const raw = this._env.NODE_ENV ?? this._env.APP_ENV ?? this._ctx.NODE_ENV ?? 'dev';
    const intended = raw === 'production' || raw === 'prod' ? 'prod' : 'dev';

    if (debugRaw === 'false') {
      if (intended === 'dev') {
        console.warn(
          '[packages-core] DEBUG=false overrides mode="dev" → using mode="prod". ' +
            'Set NODE_ENV=production or APP_ENV=prod to suppress this warning.',
        );
      }
      return 'prod';
    }

    if (debugRaw === 'true') {
      if (intended === 'prod') {
        console.warn(
          '[packages-core] DEBUG=true overrides mode="prod" → using mode="dev". ' +
            'Set NODE_ENV=development or remove DEBUG=true to suppress this warning.',
        );
      }
      return 'dev';
    }

    return intended;
  }

  get DEBUG(): boolean {
    const explicit = this._env.DEBUG ?? this._ctx.DEBUG;
    if (explicit === 'true') return true;
    if (explicit === 'false') return false;
    return this.mode !== 'prod';
  }

  /** Read from merged source: ctx overrides env. Supports all value types. */
  get(key: string): any;
  get(key: string, type: 'string'): string;
  get(key: string, type: 'number'): number;
  get(key: string, type: 'boolean'): boolean;
  get(key: string, type: 'url'): URL;
  get(key: string, type?: string): any {
    const raw = key in this._ctx ? this._ctx[key] : this._env[key];
    if (type === 'string') return assertString(key, raw);
    if (type === 'number') return assertNumber(key, raw);
    if (type === 'boolean') return assertBoolean(key, raw);
    if (type === 'url') return assertUrl(key, raw);
    return raw;
  }

  /** Read from pre-boot env only (process.env style). */
  var(key: string): any;
  var(key: string, defaultValue: string): string;
  var(key: string, defaultValue?: string): any {
    const raw = this._env[key];
    return raw ?? defaultValue;
  }

  /** Read from runtime bindings only (CF D1/KV/R2 etc.). */
  ctx(key: string): any {
    return this._ctx[key];
  }

  /** Merged read, throws if missing. */
  require(key: string): string {
    const raw = key in this._ctx ? this._ctx[key] : this._env[key];
    return assertString(key, raw);
  }

  has(key: string): boolean {
    return key in this._env || key in this._ctx;
  }

  /** Write to pre-boot env source. Returns this for chaining. */
  set(key: string, value: any): this {
    this._env[key] = value;
    return this;
  }

  toObject(): Record<string, any> {
    return { ...this._env, ...this._ctx };
  }

  /** Parse a group of env vars by Zod schema, with optional prefix fallback. */
  schema<T extends Record<string, z.ZodTypeAny>>(
    schema: T,
    opts?: { prefix?: string; prefixes?: string[] },
  ): { [K in keyof T]: z.output<T[K]> } {
    const source: EnvSource = { ...this._env, ...this._ctx };
    const allPrefixes = opts?.prefix
      ? [opts.prefix, ...(opts.prefixes ?? [])]
      : (opts?.prefixes ?? []);
    const result: Record<string, unknown> = {};
    for (const [key, zodType] of Object.entries(schema)) {
      const upperKey = key.toUpperCase();
      const prefixedKey =
        allPrefixes.length > 0
          ? resolveKey(
              upperKey,
              source,
              allPrefixes.map((p) => `${p}_`),
            )
          : source[upperKey];
      result[key] = zodType.parse(prefixedKey ?? undefined);
    }
    return result as { [K in keyof T]: z.output<T[K]> };
  }

  loadDotenv(_options?: DotenvOptions): Promise<this> {
    throw new Error(
      '[packages-core] env.loadDotenv() is removed. Use Platform.setAppContext() to provide env data at startup.',
    );
  }
}

export const env = typeof process !== 'undefined' ? new Env(process.env, {}) : new Env({}, {});
