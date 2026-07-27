export const RATE_LIMIT = {
  AUTH_LOGIN: { limit: 5, window: 10 },
  AUTH_REFRESH: { limit: 30, window: 60 },
  AUTH_REGISTER: { limit: 30, window: 60 },
  AUTH_EMAIL_SEND_CODE: { limit: 3, window: 60 },
  AUTH_EMAIL_LOGIN: { limit: 10, window: 60 },
  AUTH_EMAIL_RESET_PASSWORD: { limit: 3, window: 60 },
} as const;
