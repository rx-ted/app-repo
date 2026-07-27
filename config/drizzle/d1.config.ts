
import { defineConfig } from 'drizzle-kit';
import { env } from '@rx-ted/packages-core';

env.set('DB', 'D1');

export default defineConfig({
  dialect: 'sqlite',
  driver: 'd1-http',
  schema: 'apps/platform-api/src/schema/index.ts',
  out: 'drizzle/d1',
  dbCredentials: {
    accountId: env.require('CLOUDFLARE_ACCOUNT_ID'),
    databaseId: env.require('CLOUDFLARE_DATABASE_ID'),
    token: env.require('CLOUDFLARE_D1_TOKEN'),
  },
  verbose: env.DEBUG,
  strict: true,
});
