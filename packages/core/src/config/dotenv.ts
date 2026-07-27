import { getNodeModules } from './node-modules';

export type DotenvOptions = never;

async function loadEnvImpl(cwd?: string): Promise<Record<string, string>> {
  const modules = await getNodeModules();
  if (!modules) return {};

  const { readFileSync, existsSync, resolve } = modules;

  const startDir = cwd ?? (typeof process !== 'undefined' ? process.cwd() : '');
  if (!startDir) return {};

  function findUp(filename: string): string | null {
    let dir = startDir;
    for (let i = 0; i < 4; i++) {
      const filePath = resolve(dir, filename);
      if (existsSync(filePath)) return filePath;
      const parent = resolve(dir, '..');
      if (parent === dir) break;
      dir = parent;
    }
    return null;
  }

  const env: Record<string, string> = {};

  const envPath = findUp('.env');
  if (envPath) {
    Object.assign(env, parseDotenv(readFileSync(envPath, 'utf-8')));
  } else {
    return env;
  }

  const isDebug = process.env.DEBUG === 'true';
  const overrideName = isDebug ? '.env.dev' : '.env.prod';
  const overridePath = findUp(overrideName);
  if (overridePath) {
    Object.assign(env, parseDotenv(readFileSync(overridePath, 'utf-8')));
  }

  for (const [key, value] of Object.entries(env)) {
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }

  return env;
}

/**
 * Load .env file chain — safe for drizzle configs and other Node-only CLI tools.
 * Returns {} when filesystem is unavailable.
 */
export const loadEnvSync = loadEnvImpl;

/**
 * Load .env file chain by searching up to 3 parent directories from `cwd`.
 *
 * Strategy (from lowest to highest priority):
 * 1. `.env` — always loaded as base
 * 2. If `DEBUG=true` → `.env.dev` overrides base
 * 3. If `DEBUG=false` → `.env.prod` overrides base
 *
 * Safe in Cloudflare Workers — returns `{}` when filesystem is unavailable.
 */
export const loadEnv = loadEnvImpl;

export function parseDotenv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eqIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, eqIndex).trim();
    let raw = trimmed.slice(eqIndex + 1).trim();
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      raw = raw.slice(1, -1);
    }
    if (key) result[key] = raw;
  }
  return result;
}
