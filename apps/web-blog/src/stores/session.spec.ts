import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { API } from '@/constants';

const setLocale = vi.fn();
const httpMock = {
  get: vi.fn(),
  post: vi.fn(),
};

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({ setLocale }),
}));

vi.mock('@/lib/http/tokenStorage', () => {
  const storage = { token: null as string | null };
  return { tokenStorage: storage };
});

vi.mock('@/http', () => ({
  http: httpMock,
}));

describe('session store', () => {
  beforeEach(() => {
    vi.resetModules();
    setActivePinia(createPinia());
    httpMock.get.mockReset();
    httpMock.post.mockReset();
    setLocale.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should bootstrap with existing token and load current user', async () => {
    const { tokenStorage } = await import('@/lib/http/tokenStorage');
    tokenStorage.token = 'token-1';

    httpMock.get.mockResolvedValue({
      data: {
        id: 'user-1',
        username: 'ben',
        preferredLocale: 'en',
        roles: ['ADMIN'],
        permissions: [],
        tokenVersion: 1,
      },
    });

    const { useSessionStore } = await import('./session');
    const store = useSessionStore();

    await store.bootstrap();

    expect(store.user?.username).toBe('ben');
    expect(store.token).toBe('token-1');
    expect(setLocale).toHaveBeenCalledWith('en');
  });

  it('should clear session when bootstrap fails', async () => {
    const { tokenStorage } = await import('@/lib/http/tokenStorage');
    tokenStorage.token = 'token-1';
    httpMock.get.mockRejectedValue(new Error('401'));

    const { useSessionStore } = await import('./session');
    const store = useSessionStore();

    await store.bootstrap();

    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(tokenStorage.token).toBeNull();
  });

  it('should login with email code and persist token', async () => {
    httpMock.post.mockResolvedValue({
      data: {
        accessToken: 'token-2',
      },
    });
    httpMock.get.mockResolvedValue({
      data: {
        id: 'user-2',
        username: 'alice',
        preferredLocale: 'zh-CN',
        roles: ['USER'],
        permissions: [],
        tokenVersion: 2,
      },
    });

    const { tokenStorage } = await import('@/lib/http/tokenStorage');
    const { useSessionStore } = await import('./session');
    const store = useSessionStore();

    await store.loginWithEmailCode('alice@example.com', '123456');

    expect(httpMock.post).toHaveBeenCalledWith(API.AUTH_EMAIL_LOGIN, {
      email: 'alice@example.com',
      code: '123456',
    });
    expect(httpMock.get).toHaveBeenCalledWith(API.USER_ME);
    expect(tokenStorage.token).toBe('token-2');
    expect(store.user?.username).toBe('alice');
    expect(setLocale).toHaveBeenCalledWith('zh-CN');
  });

  it('should clear session after logout', async () => {
    const { tokenStorage } = await import('@/lib/http/tokenStorage');
    tokenStorage.token = 'token-3';
    httpMock.post.mockResolvedValue({});

    const { useSessionStore } = await import('./session');
    const store = useSessionStore();
    store.user = {
      id: 'user-3',
      username: 'carol',
      email: null,
      preferredLocale: 'en',
      roles: ['USER'],
      permissions: [],
      tokenVersion: 1,
    };

    await store.logout();

    expect(httpMock.post).toHaveBeenCalledWith(API.AUTH_LOGOUT);
    expect(store.user).toBeNull();
    expect(store.token).toBeNull();
    expect(tokenStorage.token).toBeNull();
  });
});
