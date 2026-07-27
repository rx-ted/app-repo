
import { defineConfig } from 'drizzle-kit';
import { env } from '@rx-ted/packages-core';

env.set('DB', 'sqlite');

export default defineConfig({
  dialect: 'sqlite',
  schema: 'apps/platform-api/src/schema/index.ts',
  out: 'drizzle/sqlite',
  dbCredentials: {
    url: 'apps/platform-api/data/app.db',
  },
  verbose: env.DEBUG,
  strict: true,
});