import type { ILogger } from '@rx-ted/packages-core';

export type CapturedLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'trace' | 'fatal';

export interface CapturedLog {
  level: CapturedLogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export function createMockLogger(): { logger: ILogger; logs: CapturedLog[] } {
  const logs: CapturedLog[] = [];

  const capture = (level: CapturedLogLevel) => {
    return (...args: unknown[]) => {
      const firstArg = args[0];
      const context =
        args.length > 1 && typeof firstArg === 'object' && !Array.isArray(firstArg)
          ? (firstArg as Record<string, unknown>)
          : undefined;
      const messageArgs = context ? args.slice(1) : args;
      const message = messageArgs.map(String).join(' ');
      logs.push({ level, message, context });
    };
  };

  const logger: ILogger = {
    trace: capture('trace'),
    debug: capture('debug'),
    info: capture('info'),
    warn: capture('warn'),
    error: capture('error'),
    fatal: capture('fatal'),
    child() {
      return logger;
    },
    setLevel() {},
    close() {
      return Promise.resolve();
    },
  };

  return { logger, logs };
}
