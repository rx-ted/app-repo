import * as schema from '@/schema/index';
import { env } from '@rx-ted/packages-core';
import { logger } from '@/lib/logger';

type PluginEntry = import('@rx-ted/packages-honest').PluginEntry;

// ── API Docs ──

async function maybeApiDoc(plugins: PluginEntry[]): Promise<void> {
  const { ApiDocPlugin } = await import('@rx-ted/packages-honest-plugins/api-doc');
  plugins.push(new ApiDocPlugin());
}

// ── Database ──

async function loadDbPlugin(plugins: PluginEntry[]): Promise<void> {
  const { DBPlugin } = await import('@rx-ted/packages-honest-plugins/db');
  const dbPlugin = await DBPlugin(schema);
  plugins.push(dbPlugin);
}

// ── Cache ──

async function loadCachePlugin(plugins: PluginEntry[]): Promise<void> {
  const { CachePlugin } = await import('@rx-ted/packages-honest-plugins/cache');

  plugins.push(new CachePlugin());
}

// ── Counter ──

async function loadCounterPlugin(plugins: PluginEntry[]): Promise<void> {
  const { CounterPlugin } = await import('@rx-ted/packages-honest-plugins/counter');
  plugins.push(new CounterPlugin());
}

async function maybeMail(plugins: PluginEntry[]): Promise<void> {
  const { MailPlugin } = await import('@rx-ted/packages-honest-plugins/mail');
  const isProd = env.mode === 'prod';
  plugins.push(new MailPlugin({ healthCheck: { enabled: isProd } }));
}

// ── Cache Warming ──

async function warmTagsCache(): Promise<void> {
  try {
    const { CacheService } = await import('@rx-ted/packages-honest-plugins/cache');
    const { TagsRepository } = await import('@/modules/tags/repositories/tags.repository');
    const { DbService } = await import('@rx-ted/packages-honest-plugins/db');
    const { ComponentManager } = await import('@rx-ted/packages-honest');

    const cache = ComponentManager.getPlugin('app:cache') as InstanceType<typeof CacheService>;
    const db = ComponentManager.getPlugin('app:db') as InstanceType<typeof DbService>;

    if (!cache || !db) return;

    const tagsRepo = new TagsRepository(db, cache);
    await tagsRepo.list(1, 10);
    logger.info('[cache] Tags cache warmed');
  } catch (err) {
    logger.warn({ err }, '[cache] Failed to warm tags cache');
  }
}

// ── Boot ──

export async function getPlugins(): Promise<PluginEntry[]> {
  const plugins: PluginEntry[] = [];
  await maybeApiDoc(plugins);
  await loadDbPlugin(plugins);
  await loadCachePlugin(plugins);
  await loadCounterPlugin(plugins);
  await maybeMail(plugins);

  setTimeout(() => warmTagsCache(), 1000);

  return plugins;
}
