import type { z } from 'zod';
import { Platform } from './platform';
import { resolveKey } from './prefixes';
import { ConfigError } from '../utils/shared';

type EnvSource = Record<string, string | undefined>;
type ZodSchemaMap = Record<string, z.ZodTypeAny>;
type InferEnv<T extends ZodSchemaMap> = {
  [K in keyof T]: z.infer<T[K]>;
} & {
  toJSON(): Record<string, unknown>;
};

export interface CreateEnvOptions<T extends ZodSchemaMap> {
  schema: T;
  prefixes?: string[];
  runtimeEnv?: EnvSource;
  runtime?: Platform;
  skipValidation?: boolean;
}

export function createEnv<T extends ZodSchemaMap>(options: CreateEnvOptions<T>): InferEnv<T> {
  const { schema, prefixes = [] } = options;
  const source: EnvSource = options.runtimeEnv ?? Platform.env();
  const validated: Record<string, unknown> = {};

  for (const key of Object.keys(schema)) {
    const raw = resolveKey(key, source, prefixes);
    const zodSchema = schema[key];
    const result = zodSchema.safeParse(raw);

    if (result.success) {
      validated[key] = result.data;
    } else if (raw === undefined) {
      const defResult = zodSchema.safeParse(undefined);
      if (defResult.success) {
        validated[key] = defResult.data;
      } else if (!options.skipValidation) {
        throw new ConfigError(
          `Validation failed for "${key}": ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
        );
      }
    } else if (!options.skipValidation) {
      throw new ConfigError(
        `Validation failed for "${key}": ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      );
    }
  }

  return new Proxy(validated as InferEnv<T>, {
    get(target, prop: string | symbol) {
      if (prop === 'toJSON') return () => ({ ...target });
      if (typeof prop === 'string' && prop in target) return target[prop];
      return undefined;
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, prop) {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
  });
}
