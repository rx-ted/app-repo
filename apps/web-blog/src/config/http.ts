export type HttpConfig = {
  baseURL: string;
  timeoutMs: number;
  withCredentials: boolean;
  defaultHeaders: Record<string, string>;
  authHeaderName: string;
};

const resolveNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolvedBaseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1';

export const httpConfig: HttpConfig = {
  baseURL: resolvedBaseURL,
  timeoutMs: resolveNumber(import.meta.env.VITE_HTTP_TIMEOUT_MS, 15000),
  withCredentials: import.meta.env.VITE_HTTP_WITH_CREDENTIALS === 'true',
  defaultHeaders: {
    Accept: 'application/json',
  },
  authHeaderName: 'Authorization',
};
