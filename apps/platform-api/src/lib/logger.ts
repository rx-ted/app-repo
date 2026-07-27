import { createLogger, createFileTransport, env, detectPlatform } from '@rx-ted/packages-core';
import type { LogLevel } from '@rx-ted/packages-core';

function detectLevel(): LogLevel {
  const raw = env.get('LOGGER_LEVEL')?.toLowerCase() as LogLevel | undefined;
  if (raw && ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(raw)) return raw;
  return 'info';
}

function buildFileTransport(): ReturnType<typeof createFileTransport> | undefined {
  const platform = detectPlatform();
  if (platform === 'cloudflare' || platform === 'deno') return undefined;

  const filePath = env.get('LOG_FILE_PATH');
  if (!filePath) return undefined;

  return createFileTransport({
    file: filePath,
    size: env.get('LOG_FILE_SIZE') || '50m',
    frequency: env.get('LOG_FILE_FREQUENCY') || 'daily',
    limit: (() => {
      const v = Number(env.get('LOG_FILE_LIMIT'));
      return Number.isFinite(v) ? v : 7;
    })(),
    mkdir: true,
    symlink: env.get('LOG_FILE_SYMLINK') === 'true',
  });
}

const fileTransport = buildFileTransport();

export const logger = createLogger({
  name: 'platform-api',
  level: detectLevel(),
  ...(fileTransport ? { transport: fileTransport } : {}),
});
