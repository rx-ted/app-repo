import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSessionStore } from '@/stores/session';
import { useRouter } from 'vue-router';

vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useRoute: vi.fn(() => ({ fullPath: '/editor/new-post' })),
}));

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({ setLocale: vi.fn() }),
}));

vi.mock('@/http', () => ({
  http: { get: vi.fn(), post: vi.fn(), del: vi.fn() },
}));

describe('useAuthGuard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('returns isAuthenticated=true when session is authenticated', async () => {
    const session = useSessionStore();
    session.token = 'valid-token';
    session.user = {
      id: '1',
      username: 'test',
      email: null,
      preferredLocale: 'en',
      roles: [],
      permissions: [],
      tokenVersion: 1,
    };
    const { useAuthGuard } = await import('./useAuthGuard');
    const { isAuthenticated } = useAuthGuard();
    expect(isAuthenticated.value).toBe(true);
  });

  it('returns isAuthenticated=false when session is not authenticated', async () => {
    const session = useSessionStore();
    session.token = null;
    session.user = null;
    const { useAuthGuard } = await import('./useAuthGuard');
    const { isAuthenticated } = useAuthGuard();
    expect(isAuthenticated.value).toBe(false);
  });

  it('requireAuth() returns true when authenticated', async () => {
    const session = useSessionStore();
    session.token = 'valid-token';
    session.user = {
      id: '1',
      username: 'test',
      email: null,
      preferredLocale: 'en',
      roles: [],
      permissions: [],
      tokenVersion: 1,
    };
    const { useAuthGuard } = await import('./useAuthGuard');
    const { requireAuth } = useAuthGuard();
    expect(requireAuth()).toBe(true);
  });

  it('requireAuth() redirects to login and returns false when not authenticated', async () => {
    const push = vi.fn();
    vi.mocked(useRouter).mockImplementationOnce(() => ({ push }) as any);
    const session = useSessionStore();
    session.token = null;
    session.user = null;
    const { useAuthGuard } = await import('./useAuthGuard');
    const { requireAuth } = useAuthGuard();
    expect(requireAuth()).toBe(false);
    expect(push).toHaveBeenCalledWith({
      name: 'login',
      query: { redirect: '/editor/new-post' },
    });
  });
});
