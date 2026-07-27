
import { defineConfig } from 'drizzle-kit';
import { env } from '@rx-ted/packages-core';

env.set('DB', 'mysql');

export default defineConfig({
  dialect: 'mysql',
  schema: 'apps/platform-api/src/schema/index.ts',
  out: 'drizzle/mysql',
  dbCredentials: {
    host: env.require('DB_HOST'),
    port: env.get('DB_PORT', 'number'),
    user: env.require('DB_USER'),
    password: env.require('DB_PASSWORD'),
    database: env.require('DB_DATABASE'),
  },
  casing: 'snake_case',
  verbose: env.DEBUG,
  strict: true,
});
