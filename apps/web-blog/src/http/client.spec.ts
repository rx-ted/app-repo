import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHttpClient, type HttpError } from './client';
import { API } from '@/constants';

const baseConfig = {
  baseURL: 'https://api.example.com',
  timeoutMs: 2_000,
  withCredentials: false,
  defaultHeaders: {
    Accept: 'application/json',
  },
  authHeaderName: 'Authorization',
} as const;

describe('http client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should build query strings and attach auth headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = createHttpClient(baseConfig);
    client.setAuthToken('token-1');

    const result = await client.get<{ ok: boolean }>(API.POSTS_LIST, {
      query: {
        page: 2,
        tags: ['vue', 'ts'],
      },
    });

    expect(result).toEqual({ ok: true });
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe('https://api.example.com/posts?page=2&tags=vue&tags=ts');
    expect(options.headers.Authorization).toBe('Bearer token-1');
    expect(options.method).toBe('GET');
  });

  it('should send JSON bodies and support the delete alias', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = createHttpClient(baseConfig);

    await client.post('/announcements', { title: 'hello' });
    await client.delete('/announcements/1');

    const [, postOptions] = fetchMock.mock.calls[0]!;
    expect(postOptions.method).toBe('POST');
    expect(postOptions.headers['Content-Type']).toBe('application/json');
    expect(postOptions.body).toBe(JSON.stringify({ title: 'hello' }));

    const [, deleteOptions] = fetchMock.mock.calls[1]!;
    expect(deleteOptions.method).toBe('DELETE');
  });

  it('should run request interceptors passed to createHttpClient', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = createHttpClient(baseConfig, {
      onRequest: async (config) => ({
        ...config,
        headers: { ...(config.headers as Record<string, string>), 'X-Interceptor': 'ran' },
      }),
    });
    await client.get('/posts');

    const [, options] = fetchMock.mock.calls[0]!;
    expect(options.headers['X-Interceptor']).toBe('ran');
  });

  it('should throw HttpError with parsed error body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'BAD_REQUEST' }), {
          status: 400,
          statusText: 'Bad Request',
          headers: {
            'content-type': 'application/json',
          },
        }),
      ),
    );

    const client = createHttpClient(baseConfig);

    await expect(client.get('/posts')).rejects.toEqual(
      expect.objectContaining<HttpError>({
        name: 'HttpError',
        message: expect.any(String),
        status: 400,
        statusText: 'Bad Request',
        body: { code: 'BAD_REQUEST' },
      }),
    );
  });
});
