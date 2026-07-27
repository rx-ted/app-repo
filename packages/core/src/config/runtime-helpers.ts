import type { RuntimeContext } from './platform';

export function createNodeContext(
  env?: Record<string, string | undefined>,
  request?: Request,
): RuntimeContext {
  return {
    platform: 'node',
    env: env ?? (typeof process !== 'undefined' ? process.env : {}),
    request,
  };
}

export function createCloudflareContext(
  env: Record<string, string | undefined>,
  request?: Request,
  executionContext?: unknown,
): RuntimeContext {
  return {
    platform: 'cloudflare',
    env,
    request,
    executionContext,
  };
}
