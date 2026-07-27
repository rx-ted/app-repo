import type { HttpConfig } from '@/config/http';
import type {
  DownloadOptions,
  DownloadResult,
  HttpRequestOptions,
  QueryParams,
} from '@/http/types';
import { tokenStorage } from '@/lib/http/tokenStorage';

export class HttpError extends Error {
  status: number;
  statusText: string;
  body?: unknown;

  constructor(message: string, status: number, statusText: string, body?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

const buildQuery = (query?: QueryParams): string => {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
      return;
    }
    params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

const resolveUrl = (baseURL: string, path: string, query?: QueryParams): string => {
  const withQuery = `${path}${buildQuery(query)}`;
  if (/^https?:\/\//i.test(path)) return withQuery;
  const base = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
  const normalized = withQuery.startsWith('/') ? withQuery.slice(1) : withQuery;
  return `${base}${normalized}`;
};

const getFilenameFromDisposition = (disposition: string | null) => {
  if (!disposition) return null;
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition);
  const raw = match?.[1] ?? match?.[2];
  return raw ? decodeURIComponent(raw) : null;
};

const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export type HttpClientInstance = ReturnType<typeof createHttpClient>;

export interface HttpInterceptors {
  onRequest?: (config: RequestInit & { url: string }) => Promise<RequestInit & { url: string }>;
}

export const createHttpClient = (config: HttpConfig, interceptors?: HttpInterceptors) => {
  let authToken: string | null = null;

  async function request<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
    const url = resolveUrl(config.baseURL, path, options.query);
    const method = (options.method ?? 'GET').toUpperCase();

    const headers: Record<string, string> = {
      ...config.defaultHeaders,
      ...options.headers,
    };

    const token = options.authToken ?? authToken ?? tokenStorage.token;
    if (token) {
      headers[config.authHeaderName] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeout = options.timeoutMs ?? config.timeoutMs;
    const timer = setTimeout(() => controller.abort(), timeout);
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    let body: BodyInit | undefined;
    if (options.body !== undefined && !(options.body instanceof FormData)) {
      body = JSON.stringify(options.body);
      headers['Content-Type'] = 'application/json';
    } else if (options.body instanceof FormData) {
      body = options.body;
    }

    try {
      let fetchConfig: RequestInit & { url: string } = {
        url,
        method,
        headers,
        body,
        signal: controller.signal,
      };

      if (interceptors?.onRequest) {
        fetchConfig = await interceptors.onRequest(fetchConfig);
      }

      const response = await fetch(fetchConfig.url, {
        method: fetchConfig.method,
        headers: fetchConfig.headers,
        body: fetchConfig.body,
        signal: fetchConfig.signal,
      });

      const responseType = options.responseType ?? 'json';
      let data: unknown;

      if (responseType === 'json') {
        data = await response.json();
      } else if (responseType === 'text') {
        data = await response.text();
      } else if (responseType === 'blob') {
        data = await response.blob();
      } else if (responseType === 'arrayBuffer') {
        data = await response.arrayBuffer();
      }

      if (!response.ok) {
        throw new HttpError(
          typeof data === 'object' && data !== null
            ? ((data as Record<string, unknown>).message as string) || response.statusText
            : response.statusText,
          response.status,
          response.statusText,
          data,
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new HttpError('Request timeout', 408, 'Timeout');
      }
      throw new HttpError(
        error instanceof Error ? error.message : 'Network error',
        0,
        'Network Error',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async function download(path: string, options: DownloadOptions = {}): Promise<DownloadResult> {
    const url = resolveUrl(config.baseURL, path, options.query);
    const method = (options.method ?? 'GET').toUpperCase();
    const timeout = options.timeoutMs ?? config.timeoutMs;

    const headers: Record<string, string> = {
      ...config.defaultHeaders,
      ...options.headers,
    };
    const token = options.authToken ?? authToken ?? tokenStorage.token;
    if (token) {
      headers[config.authHeaderName] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new HttpError(
          `HTTP ${response.status} ${response.statusText}`,
          response.status,
          response.statusText,
        );
      }

      const blob = await response.blob();
      const filename =
        options.filename ??
        getFilenameFromDisposition(response.headers.get('content-disposition')) ??
        'download';

      if (options.autoSave ?? true) {
        saveBlob(blob, filename);
      }

      return { blob, filename, response };
    } finally {
      clearTimeout(timer);
    }
  }

  const get = <T>(path: string, options: HttpRequestOptions = {}) =>
    request<T>(path, { ...options, method: 'GET' });

  const post = <T>(path: string, body?: unknown, options: HttpRequestOptions = {}) =>
    request<T>(path, { ...options, method: 'POST', body });

  const put = <T>(path: string, body?: unknown, options: HttpRequestOptions = {}) =>
    request<T>(path, { ...options, method: 'PUT', body });

  const patch = <T>(path: string, body?: unknown, options: HttpRequestOptions = {}) =>
    request<T>(path, { ...options, method: 'PATCH', body });

  const del = <T>(path: string, options: HttpRequestOptions = {}) =>
    request<T>(path, { ...options, method: 'DELETE' });

  return {
    request,
    download,
    get,
    post,
    put,
    patch,
    del,
    delete: del,
    setAuthToken: (token: string | null) => {
      authToken = token;
    },
  };
};
