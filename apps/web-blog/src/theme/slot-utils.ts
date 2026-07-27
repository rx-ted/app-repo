import type { ComponentConfig } from './app';

export function normalizeComponents(
  raw: (string | ComponentConfig)[] | undefined | null,
): ComponentConfig[] {
  if (!raw) return [];
  const normalized = raw.map((item) => (typeof item === 'string' ? { name: item } : item));
  return normalized.sort((a, b) => {
    if (a.order === -1) return 1;
    if (b.order === -1) return -1;
    return (a.order ?? 0) - (b.order ?? 0);
  });
}
