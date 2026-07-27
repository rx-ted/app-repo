import { Platform } from '../config/platform';
import type { Env } from '../config/env';

export class ConfigError extends Error {
  constructor(message: string) {
    super(`[packages-core] ${message}`);
    this.name = 'ConfigError';
  }
}

export class ConfigTypeError extends ConfigError {
  constructor(key: string, expected: string, value: string) {
    super(`Invalid type for "${key}": expected ${expected}, got "${value}"`);
    this.name = 'ConfigTypeError';
  }
}

export function assertString(key: string, value: string | undefined): string {
  if (value === undefined) throw new ConfigError(`Missing required config: ${key}`);
  return value;
}

export function assertNumber(key: string, value: string | undefined): number {
  if (value === undefined) throw new ConfigError(`Missing required config: ${key}`);
  const n = Number(value);
  if (Number.isNaN(n)) throw new ConfigTypeError(key, 'number', value);
  return n;
}

export function assertBoolean(key: string, value: string | undefined): boolean {
  if (value === undefined) throw new ConfigError(`Missing required config: ${key}`);
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new ConfigTypeError(key, 'boolean', value);
}

export function assertUrl(key: string, value: string | undefined): URL {
  if (value === undefined) throw new ConfigError(`Missing required config: ${key}`);
  try {
    return new URL(value);
  } catch {
    throw new ConfigTypeError(key, 'URL', value);
  }
}

export function resolveBinding(name: string, env?: Env): any {
  return (
    (globalThis as any)[name] ??
    (globalThis as any).env?.[name] ??
    (typeof process !== 'undefined' ? (process.env as any)?.[name] : undefined) ??
    Platform.env()?.[name] ??
    env?.get(name)
  );
}
