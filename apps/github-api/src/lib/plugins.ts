import { env } from '@rx-ted/packages-core';
import type { PluginEntry } from '@rx-ted/packages-honest';

export async function getPlugins(): Promise<PluginEntry[]> {
  const plugins: PluginEntry[] = [];
  // API docs (optional)
  try {
    const { ApiDocPlugin } = await import('@rx-ted/packages-honest-plugins/api-doc');
    plugins.push(new ApiDocPlugin());
  } catch {
    // ignore
  }
  // Cache (required by GitHubService)
  const { CachePlugin } = await import('@rx-ted/packages-honest-plugins/cache');
  plugins.push(new CachePlugin());
  void env;
  return plugins;
}