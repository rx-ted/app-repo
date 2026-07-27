export type LayoutId = 'layout-1' | 'layout-2';

export type LayoutType = 'full' | 'doc' | 'simple' | 'blank';

export interface FullOptions {
  showAsideLeft: boolean;
  showAsideRight: boolean;
  asideLeftComponents: string[];
  asideRightComponents: string[];
  showBeforeContent: boolean;
  showAfterContent: boolean;
  beforeContentComponents: string[];
  afterContentComponents: string[];
}

export interface DocOptions {
  showAsideRight: boolean;
  showAsideLeft: boolean;
  showTopAd: boolean;
  asideRightComponents: string[];
  asideLeftComponents: string[];
  showBeforeContent: boolean;
  showAfterContent: boolean;
  beforeContentComponents: string[];
  afterContentComponents: string[];
}

export type SimpleOptions = Record<string, never>;

export type BlankOptions = Record<string, never>;

export interface LayoutConfig {
  layoutId: LayoutId;
  topPinned: boolean;
  header: {
    left: string[];
    center: string[];
    right: string[];
  };
  sider: {
    menuItems: string[];
  };
  layouts: {
    full: FullOptions;
    doc: DocOptions;
    simple: SimpleOptions;
    blank: BlankOptions;
  };
}

export interface LayoutConfigVO {
  userId: string;
  layoutId: LayoutId;
  config: LayoutConfig;
  version: number;
  syncedAt: string | null;
  updatedAt: string;
}

export interface SaveLayoutConfigPartial {
  type: LayoutType;
  options: FullOptions | DocOptions | SimpleOptions | BlankOptions;
}

export interface SaveLayoutConfigDTO {
  layoutId: LayoutId;
  config: LayoutConfig;
  partial?: SaveLayoutConfigPartial;
}
