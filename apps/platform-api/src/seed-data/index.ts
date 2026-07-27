import type {
  PermissionSeed,
  RoleSeed,
  TagSeed,
  CategorySeed,
  DiscoverySeed,
  DocSeed,
} from './types';

export { default as permissions } from './permissions.json' with { type: 'json' };
export { default as roles } from './roles.json' with { type: 'json' };
export { default as tags } from './tags.json' with { type: 'json' };
export { default as categories } from './categories.json' with { type: 'json' };
export { default as discoveries } from './discoveries.json' with { type: 'json' };

export type { PermissionSeed, RoleSeed, TagSeed, CategorySeed, DiscoverySeed, DocSeed };
