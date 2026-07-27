import 'reflect-metadata';

export type RateLimitKeyBy = 'ip' | 'user';

export interface RateLimitRule {
  limit: number;
  window: number;
  keyBy: RateLimitKeyBy;
}

export const RATE_LIMIT_KEY = 'rateLimit';

export function RateLimit(rules: RateLimitRule[]) {
  return (target: object, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(RATE_LIMIT_KEY, rules, target.constructor, key!);
    } else {
      Reflect.defineMetadata(RATE_LIMIT_KEY, rules, target);
    }
  };
}
