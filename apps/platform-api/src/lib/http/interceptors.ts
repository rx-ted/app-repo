import type { AxiosInstance } from 'axios';

export function setupInterceptors(client: AxiosInstance): void {
  client.interceptors.request.use(
    (config) => {
      if (process.env.DEBUG) {
        console.debug(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`);
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (!error.config || error.config._retryCount >= 2) return Promise.reject(error);

      const isNetworkError = !error.response && error.code !== 'ERR_CANCELED';
      if (!isNetworkError) return Promise.reject(error);

      error.config._retryCount = (error.config._retryCount ?? 0) + 1;
      const delay = Math.min(1000 * 2 ** (error.config._retryCount - 1), 4000);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return client.request(error.config);
    },
  );
}
