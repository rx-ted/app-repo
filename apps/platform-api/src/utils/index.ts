import { env } from '@rx-ted/packages-core';

const VALID_DB = ['d1', 'sqlite', 'mysql'] as const;
export type Dialect = (typeof VALID_DB)[number];

function resolveDialect(): Dialect {
  const override = env.get('DB')?.toLowerCase();
  if (override && VALID_DB.includes(override as any)) return override as Dialect;
  return env.platform === 'cloudflare' ? 'd1' : 'sqlite';
}

export const dialect = resolveDialect();
