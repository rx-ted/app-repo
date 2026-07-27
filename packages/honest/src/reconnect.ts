/**
 * Reconnection configuration and backoff calculation.
 */

export interface ReconnectConfig {
  strategy: 'fixed' | 'exponential';
  initialDelayMs: number;
  maxDelayMs: number;
  maxRetries: number;
  jitter: boolean;
}

const DEFAULT_CONFIG: ReconnectConfig = {
  strategy: 'exponential',
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  maxRetries: Infinity,
  jitter: true,
};

export function resolveReconnectConfig(overrides?: Partial<ReconnectConfig>): ReconnectConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

/**
 * Calculate the delay in milliseconds for a given attempt number.
 * Attempt numbers start at 1.
 */
export function calculateDelay(config: ReconnectConfig, attempt: number): number {
  const { strategy, initialDelayMs, maxDelayMs, jitter } = config;

  let delay: number;

  if (strategy === 'fixed') {
    delay = initialDelayMs;
  } else {
    delay = Math.min(initialDelayMs * 2 ** (attempt - 1), maxDelayMs);
  }

  if (jitter) {
    const half = delay / 2;
    delay = half + Math.random() * half;
  }

  return Math.floor(delay);
}
