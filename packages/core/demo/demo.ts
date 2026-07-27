#!/usr/bin/env tsx

import { Platform, createNodeContext, createCloudflareContext, Env } from '../src/index';
import { z } from 'zod';

const DIVIDER = ''.padStart(56, '─');

function heading(label: string) {
  console.log(`\n${DIVIDER}\n  ${label}\n${DIVIDER}`);
}

function section(title: string) {
  console.log(`\n  \u203a ${title}`);
}

function simulateNode() {
  heading('Platform: Node.js');

  Platform.run(
    createNodeContext({
      DB_HOST: '10.0.0.1',
      DB_PORT: '3306',
      DB_USER: 'root',
      DB_PASSWORD: 'secret',
      NODE_ENV: 'production',
    }),
    () => {
      const env = new Env(Platform.env(), {});

      section('env.platform');
      console.log('  platform:', env.platform);
      console.log('  mode:', env.mode);
      console.log('  DEBUG:', env.DEBUG);

      section('env.schema \u2014 DB config');
      const db = env.schema(
        {
          host: z.string().default('127.0.0.1'),
          port: z.coerce.number().default(3306),
          user: z.string(),
          password: z.string(),
        },
        { prefix: 'DB' },
      );
      console.log(' ', db);
    },
  );
}

function simulateCloudflare() {
  heading('Platform: Cloudflare Workers');

  Platform.run(
    createCloudflareContext({
      DB_HOST: '10.0.0.4',
      DB_PORT: '3309',
      DB_USER: 'cf_user',
      DB_PASSWORD: 'cf_secret',
      DB_DATABASE: 'cf_db',
    }),
    () => {
      const env = new Env(Platform.env(), {});

      section('env.platform');
      console.log('  platform:', env.platform);

      section('env.schema \u2014 DB config');
      const db = env.schema(
        {
          host: z.string().default('127.0.0.1'),
          port: z.coerce.number().default(3306),
          user: z.string(),
          password: z.string(),
          database: z.string(),
        },
        { prefix: 'DB' },
      );
      console.log(' ', db);

      section('env.has');
      console.log('  has DB_HOST:', env.has('DB_HOST'));
      console.log('  has MISSING:', env.has('MISSING'));
    },
  );
}

function showComparison() {
  heading('Platform Comparison');

  const runtimes: [string, Record<string, string | undefined>][] = [
    ['Node.js', { NODE_ENV: 'production', DB_HOST: 'node' }],
    ['Cloudflare', { DB_HOST: 'cf' }],
  ];

  console.log('  Name             Platform     Mode   DEBUG  DB_HOST');
  console.log(`  ${''.padEnd(54, '\u2500')}`);

  for (const [name, src] of runtimes) {
    Platform.run(createNodeContext(src), () => {
      const env = new Env(Platform.env(), {});
      const db = env.schema({ host: z.string().default('x') }, { prefix: 'DB' });
      console.log(
        `  ${name.padEnd(16)} ${env.platform.padEnd(12)} ${env.mode.padEnd(6)} ${String(env.DEBUG).padEnd(6)} ${db.host}`,
      );
    });
  }
}

console.log(
  '\n' +
    '  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n' +
    '  \u2551   @rx-ted/packages-core \u2014 Multi-Platform Demo  \u2551\n' +
    '  \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d\n',
);

simulateNode();
simulateCloudflare();
showComparison();
