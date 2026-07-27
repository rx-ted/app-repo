import type { GlobalThemeOverrides } from 'naive-ui';
import { computed, watchEffect } from 'vue';
import type { App } from './app';
import { applyCssVars, getThemeTokens } from './tokens';

export function createNaiveTheme(tokens: App.AppThemeTokens): GlobalThemeOverrides {
  return {
    common: {
      primaryColor: tokens.colorPrimary,
      primaryColorHover: tokens.colorPrimaryHover,
      primaryColorPressed: tokens.colorPrimaryActive,
      primaryColorSuppl: tokens.colorPrimarySuppl,

      textColor1: tokens.colorText,
      textColor2: tokens.colorTextSecondary,
      textColor3: tokens.colorTextTertiary,
      textColorDisabled: tokens.colorTextQuaternary,

      baseColor: tokens.colorBgContainer,
      bodyColor: tokens.colorBgLayout,
      cardColor: tokens.colorBgContainer,
      modalColor: tokens.colorBgElevated,
      popoverColor: tokens.colorBgElevated,
      actionColor: tokens.colorBgAction,

      borderColor: tokens.colorBorder,
      dividerColor: tokens.colorSplit,

      borderRadius: tokens.borderRadiusMD,
      fontSize: tokens.fontSizeSM,
      lineHeight: tokens.lineHeight,

      successColor: tokens.colorSuccess,
      warningColor: tokens.colorWarning,
      errorColor: tokens.colorError,
      infoColor: tokens.colorInfo,
    },
  };
}

export const naiveThemeOverrides = () => {
  const tokens = getThemeTokens();
  watchEffect(() => {
    applyCssVars(tokens.value);
  });

  return computed(() => {
    return createNaiveTheme(tokens.value);
  });
};
