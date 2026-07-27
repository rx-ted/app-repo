import axios from 'axios';

export function createHttpClient(baseURL: string, timeout = 10_000) {
  return axios.create({
    adapter: 'fetch',
    baseURL,
    timeout,
  });
}
