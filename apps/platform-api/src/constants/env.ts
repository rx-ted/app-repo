import { env } from '@rx-ted/packages-core';

export const envParams = {
  get DB_PATH() {
    return env.var('DB_PATH', 'data/app.db');
  },

  get VITE_SITE_NAME() {
    return env.var('VITE_SITE_NAME', "rx-ted's Blog");
  },
  get SITE_DOMAIN() {
    return env.var('SITE_DOMAIN', 'localhost:3000');
  },
  get FRONTEND_DOMAIN() {
    return env.var('FRONTEND_DOMAIN', 'blog.19981204.xyz');
  },
  get SITE_LICENSE() {
    return env.var('SITE_LICENSE', 'CC BY-NC-SA 4.0');
  },

  get API_PREFIX() {
    return env.var('API_PREFIX', '/api/v1');
  },

  get ADMIN_USERS(): string[] {
    const raw = env.get('ADMIN_USERS');
    if (!raw) return [];
    return raw
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
  },

  get PICX_API_KEY() {
    return env.var('PICX_API_KEY', '');
  },
  get PICX_UPLOAD_URL() {
    return env.var('PICX_UPLOAD_URL', 'https://picx.19981204.xyz/rest/upload');
  },
};
