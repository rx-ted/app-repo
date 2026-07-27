export interface PermissionSeed {
  resource: string;
  action: string;
  scope: string;
  name: string;
}

export interface RoleSeed {
  name: string;
  description: string;
}

export interface TagSeed {
  name: string;
  slug: string;
}

export interface CategorySeed {
  name: string;
  slug: string;
  description: string;
}

export interface DiscoverySeed {
  name: string;
  url: string;
  logo: string;
  description: string;
  category: string;
  status: string;
  sortOrder: number;
}

export interface DocSeed {
  title: string;
  slug: string;
  doc_hash: string;
  content_md: string;
  status: string;
  visibility: string;
  allow_comment: boolean;
  is_pinned: boolean;
  featured_weight: number;
}
