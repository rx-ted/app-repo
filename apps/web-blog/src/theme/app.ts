// theme/brands.ts

import type { THEME } from '../constants/theme';
import type { AsideComponentKey, ContentComponentKey } from '@/config/component-registry';

export type ComponentConfig = {
  name: string;
  order?: number;
  closable?: boolean;
};

declare module 'vue-router' {
  type SlotConfig = {
    show?: boolean;
  };

  type AsideSlotConfig = SlotConfig & { components?: (AsideComponentKey | ComponentConfig)[] };

  type ContentSlotConfig = SlotConfig & { components?: (ContentComponentKey | ComponentConfig)[] };

  interface RouteMeta {
    layout?: 'blank' | 'doc' | 'full' | 'simple';
    regions?: {
      aside?: Partial<Record<'left' | 'right', AsideSlotConfig>>;
      content?: Partial<Record<'before' | 'after', ContentSlotConfig>>;
    };
    auth?: boolean;
    title?: string;
  }
}

export namespace App {
  /** Supported locales for i18n */
  export type Locale = 'zh-CN' | 'en';
  /** Light or dark theme */
  export type ThemeMode = 'light' | 'dark';
  /** One of the predefined brand color names */
  export type ThemeBrandType = (typeof THEME.BRANDS)[number];

  /** Color tokens for a single brand, used to build AppThemeTokens */
  export interface AppThemeBrandColorSet {
    primary: string;
    hover: string;
    active: string;
    suppl: string;
  }

  /**
   * Application-level design tokens.
   * Maps semantic variable names to concrete color/length values for each theme mode.
   */
  export interface AppThemeTokens {
    /* --- Brand --- */
    colorPrimary: string;
    colorPrimaryHover: string;
    colorPrimaryActive: string;
    colorPrimarySuppl: string; // complement (NaiveUI convention)

    /* --- Text --- */
    colorText: string; // headings / primary body
    colorTextSecondary: string; // secondary body / descriptions
    colorTextTertiary: string; // auxiliary / timestamps / placeholders
    colorTextQuaternary: string; // disabled / dim hints

    /* --- Background --- */
    colorBgLayout: string; // page-level background
    colorBgContainer: string; // card / list item background
    colorBgElevated: string; // popover / drawer / dropdown background
    colorBgMuted: string; // muted placeholder or subtle background
    colorBgAction: string; // hover / active item background (dropdown, table row, list)
    colorBgCode: string; // code block background (syntax highlighting)

    /* --- Border / Divider --- */
    colorBorder: string; // stroke / border
    colorSplit: string; // hairline divider / dashed separator

    /* --- Semantic --- */
    colorSuccess: string;
    colorWarning: string;
    colorError: string;
    colorInfo: string;

    /* --- Typography --- */
    fontSizeXS: string; // 12px
    fontSizeSM: string; // 14px (default)
    fontSizeMD: string; // 16px
    fontSizeLG: string; // 20px
    fontSizeXL: string; // 24px
    lineHeight: string; // 1.5 – 1.6

    /* --- Radius & Shadow --- */
    borderRadiusSM: string;
    borderRadiusMD: string;
    borderRadiusLG: string;
    boxShadowBase: string;
    boxShadowHover: string;
    cardShadow: string;
  }

  /** Public-facing blog article displayed on cards and detail pages */
  export interface BlogArticle {
    id: string; // unique ID (DB / GitHub sha)
    title: string;
    slug: string; // route-friendly identifier
    lang?: Locale; // article language (derived from slug, e.g. '.zh' suffix)
    translationSlug?: string | null; // counterpart article slug in the other language
    content?: string; // raw markdown
    contentHtml?: string; // rendered HTML for detail view
    author: string;
    authorUsername?: string;
    tags: string[];
    tagNames?: string[];
    categories?: string[];
    categoryNames?: string[];
    coverImage?: string | null;
    isPinned?: boolean;
    views?: number;
    likes?: number;
    comments?: number;
    createdAt: string; // ISO string
    updatedAt: string; // ISO string
    readingTime: number; // estimated minutes
  }

  /** Navigation menu item, supports nesting and various target behaviours */
  export interface NavItem {
    label: string;
    key?: string; // unique key (e.g. post slug)
    description?: string;
    disabled?: boolean; // defaults to false
    path?: string;
    icon?: string | { render: () => unknown } | { src: string } | { name: string };
    target?: '_self' | '_blank'; // defaults to _self
    children?: NavItem[];
  }

  /** Minimal post summary used in admin-style listings */
  export interface Post {
    id: string;
    title: string;
    url: string;
    views: number;
    likes: number;
    tags: string[];
    createdAt: string;
  }

  /* ───────── Floating Widget ───────── */

  /** Side of the screen the floating hub is docked to */
  export type FloatingWidgetDock = 'left' | 'right';

  /** Descriptor for a single floating widget module (music player, notifications, etc.) */
  export interface FloatingWidgetModuleConfig {
    id: string;
    preset: 'music' | 'notifications' | 'ai' | 'utility';
    title: string;
    titleKey?: string;
    icon: string;
    description?: string;
    descriptionKey?: string;
    badge?: number | string;
    accent?: 'primary' | 'success' | 'warning' | 'info' | 'danger';
    enabled?: boolean;
    pinned?: boolean;
  }

  /** Ad creative unit for A/B-weighted rotations */
  export interface AdCreative {
    id: string;
    title: string;
    image: string;
    url: string;
    weight: number; // A/B test weight
  }

  /** Named ad slot with weighted creatives */
  export interface AdSlot {
    slot: string; // e.g. "home-right" | "doc-left"
    creatives: AdCreative[];
  }

  /**
   * Root application configuration.
   * Populated from localStorage by initData() and exposed app-wide via useData().
   */
  export interface Config {
    theme?: {
      mode?: ThemeMode;
      color?: ThemeBrandType;
      darkTransition?: boolean;
    };
    floating?: {
      enabled?: boolean;
      draggable?: boolean;
      defaultOpen?: boolean;
      position?: {
        x?: number;
        y?: number;
        dock?: FloatingWidgetDock;
      };
      interactions?: {
        hoverToOpen?: boolean;
        autoCollapseOnLeave?: boolean;
      };
      secondary?: {
        compact?: boolean | 'auto';
      };
      modules?: FloatingWidgetModuleConfig[];
    };
  }
}
