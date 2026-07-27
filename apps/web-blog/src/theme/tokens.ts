import { computed, type Ref } from 'vue';
import type { App } from './app';
import { useTheme } from './useTheme';

/* =========================
   Light Tokens
   ========================= */
const lightTokens: App.AppThemeTokens = {
  colorPrimary: '#3b82f6', // blue-500
  colorPrimaryHover: '#60a5fa', // blue-400
  colorPrimaryActive: '#2563eb', // blue-600
  colorPrimarySuppl: '#60a5fa',

  colorText: '#111827', // gray-900
  colorTextSecondary: '#4b5563', // gray-600
  colorTextTertiary: '#9ca3af', // gray-400
  colorTextQuaternary: '#d1d5db', // gray-300

  colorBgLayout: '#f3f4f6', // gray-100
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorBgMuted: '#f9fafb',
  colorBgAction: '#f0f0f0',
  colorBgCode: '#f6f8fa',

  colorBorder: '#e5e7eb', // gray-200
  colorSplit: '#f3f4f6', // gray-100

  colorSuccess: '#10b981',
  colorWarning: '#f59e0b',
  colorError: '#ef4444',
  colorInfo: '#3b82f6',

  fontSizeXS: '12px',
  fontSizeSM: '14px',
  fontSizeMD: '16px',
  fontSizeLG: '20px',
  fontSizeXL: '24px',
  lineHeight: '1.5715',

  borderRadiusSM: '2px',
  borderRadiusMD: '4px',
  borderRadiusLG: '8px',
  boxShadowBase: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  boxShadowHover: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  cardShadow: '0 2px 8px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.06)',
};

/* =========================
   Dark Tokens
   ========================= */

const darkTokens: App.AppThemeTokens = {
  colorPrimary: '#818cf8',
  colorPrimaryHover: '#a5b4fc',
  colorPrimaryActive: '#6366f1',
  colorPrimarySuppl: '#6366f1',

  colorText: '#f0f0f5',
  colorTextSecondary: '#a8b0c0',
  colorTextTertiary: '#7a8290',
  colorTextQuaternary: '#4b5563',

  colorBgLayout: '#0a0a0f',
  colorBgContainer: '#16161f',
  colorBgElevated: '#222238',
  colorBgMuted: '#1a1a26',
  colorBgAction: '#303048',
  colorBgCode: '#0d1117',

  colorBorder: '#2a2a40',
  colorSplit: '#1e1e2e',

  colorSuccess: '#22c55e',
  colorWarning: '#f59e0b',
  colorError: '#ef4444',
  colorInfo: '#818cf8',

  fontSizeXS: '12px',
  fontSizeSM: '14px',
  fontSizeMD: '16px',
  fontSizeLG: '20px',
  fontSizeXL: '24px',
  lineHeight: '1.5715',

  borderRadiusSM: '2px',
  borderRadiusMD: '4px',
  borderRadiusLG: '8px',
  boxShadowBase: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  boxShadowHover: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
  cardShadow: '0 2px 8px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.15)',
};

type ThemeBrandColorMap = {
  [M in App.ThemeMode]: {
    [B in App.ThemeBrandType]: App.AppThemeBrandColorSet;
  };
};

const themeBrandColor: ThemeBrandColorMap = {
  light: {
    blue: {
      primary: '#3B82F6', // blue-500
      hover: '#60A5FA', // blue-400
      active: '#2563EB', // blue-600
      suppl: '#1D4ED8', // blue-700
    },
    green: {
      primary: '#22C55E', // green-500
      hover: '#4ADE80', // green-400
      active: '#16A34A', // green-600
      suppl: '#15803D', // green-700
    },
    orange: {
      primary: '#F97316', // orange-500
      hover: '#FB923C', // orange-400
      active: '#EA580C', // orange-600
      suppl: '#C2410C', // orange-700
    },
    purple: {
      primary: '#8B5CF6', // purple-500
      hover: '#A78BFA', // purple-400
      active: '#7C3AED', // purple-600
      suppl: '#6D28D9', // purple-700
    },
    red: {
      primary: '#EF4444', // red-500
      hover: '#F87171', // red-400
      active: '#DC2626', // red-600
      suppl: '#B91C1C', // red-700
    },
  },
  dark: {
    blue: { primary: '#818cf8', hover: '#a5b4fc', active: '#6366f1', suppl: '#4f46e5' },
    green: { primary: '#22c55e', hover: '#4ade80', active: '#16a34a', suppl: '#15803d' },
    orange: { primary: '#f97316', hover: '#fb923c', active: '#ea580c', suppl: '#c2410c' },
    purple: { primary: '#a78bfa', hover: '#c4b5fd', active: '#8b5cf6', suppl: '#7c3aed' },
    red: { primary: '#f87171', hover: '#fca5a5', active: '#ef4444', suppl: '#dc2626' },
  },
};

/* =========================
   Token Getter
   ========================= */

export function getThemeTokens(): Ref<App.AppThemeTokens> {
  const { isDark, themeColor, themeMode } = useTheme();
  return computed(() => {
    const baseTokens = isDark.value ? darkTokens : lightTokens;
    const brand = themeBrandColor[themeMode.value][themeColor.value];
    return {
      ...baseTokens,
      colorPrimary: brand.primary,
      colorPrimaryHover: brand.hover,
      colorPrimaryActive: brand.active,
      colorPrimarySuppl: brand.suppl,
    };
  });
}

// 这里的 Key 必须与 AppThemeTokens 完全对应
export const cssVarMap: Record<keyof App.AppThemeTokens, string> = {
  colorPrimary: '--app-primary',
  colorPrimaryHover: '--app-primary-hover',
  colorPrimaryActive: '--app-primary-active',
  colorPrimarySuppl: '--app-primary-suppl',

  colorText: '--app-text',
  colorTextSecondary: '--app-text-secondary',
  colorTextTertiary: '--app-text-tertiary',
  colorTextQuaternary: '--app-text-quaternary',

  colorBgLayout: '--app-bg-layout',
  colorBgContainer: '--app-bg-container',
  colorBgElevated: '--app-bg-elevated',
  colorBgMuted: '--app-bg-muted',
  colorBgAction: '--app-bg-action',
  colorBgCode: '--app-bg-code',

  colorBorder: '--app-border',
  colorSplit: '--app-divider',

  colorSuccess: '--app-success',
  colorWarning: '--app-warning',
  colorError: '--app-error',
  colorInfo: '--app-info',

  fontSizeXS: '--app-font-size-xs',
  fontSizeSM: '--app-font-size-sm',
  fontSizeMD: '--app-font-size-base',
  fontSizeLG: '--app-font-size-lg',
  fontSizeXL: '--app-font-size-xl',
  lineHeight: '--app-line-height',

  borderRadiusSM: '--app-radius-sm',
  borderRadiusMD: '--app-radius-md',
  borderRadiusLG: '--app-radius-lg',
  boxShadowBase: '--app-shadow-base',
  boxShadowHover: '--app-shadow-hover',
  cardShadow: '--app-card-shadow',
};

export function applyCssVars(tokens: App.AppThemeTokens) {
  const root = document.documentElement;

  Object.entries(cssVarMap).forEach(([key, cssVar]) => {
    root.style.setProperty(cssVar, tokens[key as keyof App.AppThemeTokens]);
  });
}
