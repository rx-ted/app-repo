import { env } from '@rx-ted/packages-core';

export const envParams = {
  get API_PREFIX() {
    return env.var('API_PREFIX', '/api/v1');
  },
  get FRONTEND_DOMAIN() {
    return env.var('FRONTEND_DOMAIN', 'blog.19981204.xyz');
  },
  get FRONTEND_ALLOWED_ORIGINS(): string[] {
    const raw = env.var('FRONTEND_ALLOWED_ORIGINS', this.FRONTEND_DOMAIN);
    return String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  },
};