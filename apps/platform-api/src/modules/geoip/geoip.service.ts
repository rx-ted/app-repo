import { Service } from '@rx-ted/packages-honest';

@Service()
export class GeoipService {
  private searcher: any = null;

  private async getSearcher(): Promise<any> {
    if (!this.searcher) {
      try {
        const { createRequire } = (await import('node:module')) as any;
        const _require = createRequire('/');
        const { Ip2Region } = _require('ts-ip2region2') as any;
        this.searcher = new Ip2Region({ cachePolicy: 'vectorIndex' });
      } catch {
        this.searcher = null;
      }
    }
    return this.searcher;
  }

  async lookup(ip: string): Promise<string | null> {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
      return null;
    }
    try {
      const result = (await this.getSearcher())?.search(ip);
      if (!result) return null;
      const parts = result.region.split('|');
      const country = parts[0] ?? '';
      const province = parts[1] ?? '';
      const city = parts[2] ?? '';
      const resolved = [country, province, city]
        .map((p) => p.replace(/0$/, ''))
        .filter(Boolean)
        .join(' ');
      return resolved || null;
    } catch {
      return null;
    }
  }

  close(): void {
    this.searcher?.close();
    this.searcher = null;
  }
}
