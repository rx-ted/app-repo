import { reactive } from 'vue';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_BASE ??
  'http://localhost:3000/api/v1';

export interface SiteConfig {
  siteName: string;
  siteUrl: string;
  siteDesc: string;
  siteImg: string;
  author: string;
  version: string;
  gitUrl: string;
}

const defaults: SiteConfig = {
  siteName: 'Tech Blog',
  siteUrl: 'http://localhost:8080',
  siteDesc: '',
  siteImg: '',
  author: '',
  version: '0.0.0',
  gitUrl: '',
};

export const siteConfig = reactive<SiteConfig>({ ...defaults });

export async function fetchSiteConfig(): Promise<SiteConfig> {
  try {
    const res = await fetch(`${API_BASE}/system/info`);
    const body = (await res.json()) as { data: SiteConfig };
    Object.assign(siteConfig, body.data);
  } catch {
    // keep defaults on failure
  }
  return siteConfig;
}
