import { envParams } from './env';

export const AUTH = {
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  REFRESH_TOKEN_BYTES: 64,
  SESSION_TTL_SECONDS: 7 * 24 * 60 * 60,
  COOKIE_MAX_AGE_SECONDS: 7 * 24 * 60 * 60,
  get COOKIE_PATH() {
    return `${envParams.API_PREFIX}/auth`;
  },
  COOKIE_NAME: 'refresh_token',
  ANOMALY_WINDOW_MS: 30 * 60 * 1000,
  EMAIL_CODE_TTL_SECONDS: 300,
  EMAIL_CODE_RESEND_COOLDOWN_SECONDS: 60,
  EMAIL_CODE_LENGTH: 6,
} as const;
