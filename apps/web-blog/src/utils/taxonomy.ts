import type { TaxonomyItemVO } from '@/types/community';

export function toSelectOptions(items: TaxonomyItemVO[]) {
  return items.map((item) => ({ label: item.name, value: item.id }));
}
