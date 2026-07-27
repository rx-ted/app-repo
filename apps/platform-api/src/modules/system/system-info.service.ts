import { Inject, Service } from '@rx-ted/packages-honest';
import { env } from '@rx-ted/packages-core';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';

let startTime = Date.now();

export function getUptimeMs(): number {
  return Date.now() - startTime;
}

export function getStartTimeISO(): string {
  return new Date(startTime).toISOString();
}

export function resetStartTime(ts = Date.now()): void {
  startTime = ts;
}

let pkgInfo: {
  name: string;
  version: string;
  author: string;
  license: string;
} | null = null;

@Service()
class SystemInfoService {
  constructor(@Inject(CacheService) private readonly cache: CacheService) {
    this.loadPkgInfo();
  }

  private async loadPkgInfo() {
    if (pkgInfo !== null) return;
    try {
      const pkg = await import('../../../package.json', { with: { type: 'json' } });
      pkgInfo = {
        name: ((pkg as any).default ?? (pkg as any)).name ?? 'API',
        version: ((pkg as any).default ?? (pkg as any)).version ?? '0.0.0',
        author: ((pkg as any).default ?? (pkg as any)).author ?? 'rx-ted',
        license: ((pkg as any).default ?? (pkg as any)).license ?? 'MIT',
      };
    } catch {
      pkgInfo = null;
    }
  }

  async getInfo(): Promise<Record<string, unknown>> {
    return cacheable(this.cache, 'system:info', 60, async () => {
      const uptime = getUptimeMs();
      const hours = Math.floor(uptime / 3_600_000);
      const minutes = Math.floor((uptime % 3_600_000) / 60_000);

      return {
        ...pkgInfo,
        gitUrl: `https://github.com/${pkgInfo?.author}`,
        runtime: env.platform,
        uptime: {
          ms: uptime,
          human: `${hours}h ${minutes}m`,
        },
        startTime: getStartTimeISO(),
        env: env.mode,
      };
    });
  }
}

export default SystemInfoService;
