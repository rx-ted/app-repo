import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@platform-api/common/guards', () => ({
  AuthGuard: vi.fn(),
  RateLimitGuard: vi.fn(),
}));

vi.mock('@platform-api/common/decorators', () => ({
  Public: () => () => {},
  RateLimit: () => () => {},
}));

vi.mock('hono/cookie', () => ({
  setCookie: vi.fn(),
}));

vi.mock('@platform-api/modules/auth/dtos/auth.schema', () => ({
  LoginSchema: { parse: vi.fn((body: any) => body) },
  RegisterSchema: { parse: vi.fn((body: any) => body) },
}));

vi.mock('@platform-api/modules/auth/repositories/session.repository', () => ({
  SessionRepository: vi.fn(),
}));

vi.mock('@platform-api/modules/auth/auth.service', () => ({
  default: vi.fn(),
  hashRefreshToken: vi.fn((token: string) => `hashed:${token}`),
}));

import AuthController from '@platform-api/modules/auth/auth.controller';
import AuthEmailController from '@platform-api/modules/auth/auth-email.controller';
import SessionController from '@platform-api/modules/auth/sessions/sessions.controller';
import { setCookie } from 'hono/cookie';

describe('E2E: AuthController', () => {
  const mockAuthService = {
    getSession: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  };

  const mockSessionRepo = {
    getRefreshTokenHash: vi.fn(),
  };

  function mockCtx(overrides = {}) {
    return {
      req: { header: vi.fn() },
      header: vi.fn(),
      json: vi.fn((data: any) => data),
      get: vi.fn(),
      ...overrides,
    } as any;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /auth/me - getSession', () => {
    it('should return session when authenticated', async () => {
      const controller = new AuthController(mockAuthService as any, mockSessionRepo as any);
      const c = mockCtx();
      c.get.mockReturnValue({ username: 'alice', userId: 'user-1' });
      mockAuthService.getSession.mockResolvedValue({
        userId: 'user-1',
        username: 'alice',
        roles: ['user'],
        permissions: ['post:read'],
      });

      const result = await controller.getSession(c);
      expect(result.username).toBe('alice');
    });

    it('should throw when no user in context', async () => {
      const controller = new AuthController(mockAuthService as any, mockSessionRepo as any);
      const c = mockCtx();
      c.get.mockReturnValue(null);
      mockAuthService.getSession.mockRejectedValue(new Error('Unauthorized'));

      await expect(controller.getSession(c)).rejects.toThrow();
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const controller = new AuthController(mockAuthService as any, mockSessionRepo as any);
      const c = mockCtx();
      mockAuthService.login.mockResolvedValue({
        accessToken: 'mock-at',
        refreshToken: 'mock-rt',
        expiresIn: 900,
        sessionId: 'session-123',
        user: { username: 'alice', id: 'user-1' },
      });

      const result = await controller.login({ username: 'alice', password: 'password123' }, c);
      expect(result.accessToken).toBe('mock-at');
      expect(c.header).toHaveBeenCalledWith('Set-Cookie', expect.any(String), expect.objectContaining({ append: true }));
    });

    it('should throw on invalid credentials', async () => {
      const controller = new AuthController(mockAuthService as any, mockSessionRepo as any);
      const c = mockCtx();
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(controller.login({ username: 'alice', password: 'wrong' }, c)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should handle rate limiting', async () => {
      const controller = new AuthController(mockAuthService as any, mockSessionRepo as any);
      const c = mockCtx();
      mockAuthService.login.mockRejectedValue(new Error('Too many login attempts'));

      await expect(
        controller.login({ username: 'alice', password: 'password123' }, c),
      ).rejects.toThrow('Too many login attempts');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token with valid refresh token cookie', async () => {
      const controller = new AuthController(mockAuthService as any, mockSessionRepo as any);
      const c = mockCtx();
      c.req.header.mockImplementation((name: string) => {
        if (name === 'Cookie') return 'refresh_token=my-refresh-token; other=val';
        return undefined;
      });
      mockAuthService.refresh.mockResolvedValue({
        accessToken: 'new-at',
        refreshToken: 'new-rt',
        expiresIn: 900,
      });

      const result = await controller.refresh(c);
      expect(result.accessToken).toBe('new-at');
    });

    it('should throw 401 without refresh token cookie', async () => {
      const controller = new AuthController(mockAuthService as any, mockSessionRepo as any);
      const c = mockCtx();
      c.req.header.mockReturnValue(undefined);

      await expect(controller.refresh(c)).rejects.toThrow();
    });

    it('should throw with invalid/expired refresh token', async () => {
      const controller = new AuthController(mockAuthService as any, mockSessionRepo as any);
      const c = mockCtx();
      c.req.header.mockImplementation((name: string) => {
        if (name === 'Cookie') return 'refresh_token=expired-token';
        return undefined;
      });
      mockAuthService.refresh.mockRejectedValue(new Error('Refresh token expired'));

      await expect(controller.refresh(c)).rejects.toThrow('Refresh token expired');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully with valid session', async () => {
      const controller = new AuthController(mockAuthService as any, mockSessionRepo as any);
      const c = mockCtx();
      c.get.mockReturnValue({ username: 'alice' });
      c.req.header.mockImplementation((name: string) => {
        if (name === 'Cookie') return 'refresh_token=my-token';
        return undefined;
      });
      mockSessionRepo.getRefreshTokenHash.mockResolvedValue('session-123');
      mockAuthService.logout.mockResolvedValue({ affectedRows: 1 });

      const result = await controller.logout(c);
      expect(result).toBeDefined();
    });

    it('should logout without session if no refresh cookie', async () => {
      const controller = new AuthController(mockAuthService as any, mockSessionRepo as any);
      const c = mockCtx();
      c.get.mockReturnValue({ username: 'alice' });
      c.req.header.mockReturnValue(undefined);
      mockAuthService.logout.mockResolvedValue({ affectedRows: 1 });

      const result = await controller.logout(c);
      expect(result).toBeDefined();
    });
  });

  describe('POST /auth/register', () => {
    it('should register new user successfully', async () => {
      const controller = new AuthController(mockAuthService as any, mockSessionRepo as any);
      const c = mockCtx();
      mockAuthService.register.mockResolvedValue({
        accessToken: 'mock-at',
        refreshToken: 'mock-rt',
        expiresIn: 900,
        sessionId: 'session-456',
        user: { username: 'newuser', id: 'user-2' },
      });

      const result = await controller.register(
        { username: 'newuser', password: 'SecurePass123!' },
        c,
      );
      expect(result.accessToken).toBe('mock-at');
    });

    it('should throw when username already taken', async () => {
      const controller = new AuthController(mockAuthService as any, mockSessionRepo as any);
      const c = mockCtx();
      mockAuthService.register.mockRejectedValue(new Error('Username already taken'));

      await expect(
        controller.register({ username: 'existing', password: 'pass123' }, c),
      ).rejects.toThrow('Username already taken');
    });

    it('should throw on weak password', async () => {
      const controller = new AuthController(mockAuthService as any, mockSessionRepo as any);
      const c = mockCtx();
      mockAuthService.register.mockRejectedValue(new Error('Password too weak'));

      await expect(
        controller.register({ username: 'newuser', password: '123' }, c),
      ).rejects.toThrow('Password too weak');
    });
  });
});

describe('E2E: AuthEmailController', () => {
  const mockAuthService = {
    sendEmailCode: vi.fn(),
    emailLogin: vi.fn(),
    emailResetPassword: vi.fn(),
  };

  function mockCtx(overrides = {}) {
    return {
      req: { header: vi.fn() },
      header: vi.fn(),
      json: vi.fn((data: any) => data),
      get: vi.fn(),
      ...overrides,
    } as any;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /auth/email/send-code', () => {
    it('should send verification code successfully', async () => {
      const controller = new AuthEmailController(mockAuthService as any);
      const c = mockCtx();
      mockAuthService.sendEmailCode.mockResolvedValue({
        ttlSeconds: 300,
        resendCooldownSeconds: 60,
      });

      const result = await controller.sendCode(
        { email: 'user@example.com', purpose: 'login', locale: 'zh-CN' },
        c,
      );
      expect(result.ttlSeconds).toBe(300);
      expect(mockAuthService.sendEmailCode).toHaveBeenCalledWith(
        'user@example.com',
        'login',
        'zh-CN',
      );
    });

    it('should handle rate limited email sending', async () => {
      const controller = new AuthEmailController(mockAuthService as any);
      const c = mockCtx();
      mockAuthService.sendEmailCode.mockRejectedValue(
        new Error('Too many requests. Please wait 60 seconds.'),
      );

      await expect(
        controller.sendCode({ email: 'user@example.com', purpose: 'login', locale: 'zh-CN' }, c),
      ).rejects.toThrow('Too many requests');
    });
  });

  describe('POST /auth/email/login', () => {
    it('should login with email code successfully', async () => {
      const controller = new AuthEmailController(mockAuthService as any);
      const c = mockCtx();
      c.req.header.mockReturnValue(undefined);
      mockAuthService.emailLogin.mockResolvedValue({
        accessToken: 'mock-at',
        refreshToken: 'mock-rt',
        sessionId: 'session-789',
        user: { username: 'alice', id: 'user-1' },
        expiresIn: '900',
      });

      const result = await controller.login({ email: 'alice@example.com', code: '123456' }, c);
      expect(result.accessToken).toBe('mock-at');
    });

    it('should throw with invalid verification code', async () => {
      const controller = new AuthEmailController(mockAuthService as any);
      const c = mockCtx();
      mockAuthService.emailLogin.mockRejectedValue(new Error('Invalid verification code'));

      await expect(
        controller.login({ email: 'alice@example.com', code: '000000' }, c),
      ).rejects.toThrow('Invalid verification code');
    });
  });

  describe('POST /auth/email/reset-password', () => {
    it('should reset password successfully', async () => {
      const controller = new AuthEmailController(mockAuthService as any);
      const c = mockCtx();
      mockAuthService.emailResetPassword.mockResolvedValue({ success: true });

      const result = await controller.resetPassword({
        email: 'user@example.com',
        code: '123456',
        password: 'NewPass123!',
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('E2E: SessionController', () => {
  const mockSessionRepo = {
    listUserSessions: vi.fn(),
    revokeSessionById: vi.fn(),
    getUserSessionIds: vi.fn(),
  };

  function mockCtx(overrides = {}) {
    return {
      req: { header: vi.fn(), param: vi.fn() },
      header: vi.fn(),
      json: vi.fn((data: any) => data),
      body: vi.fn((data: any, status: number) => status),
      get: vi.fn(),
      ...overrides,
    } as any;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /auth/sessions', () => {
    it('should list user sessions', async () => {
      const controller = new SessionController(mockSessionRepo as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1', username: 'alice' });
      mockSessionRepo.listUserSessions.mockResolvedValue([
        { id: 's1', deviceId: null, ip: null, userAgent: null, isCurrent: true, lastActiveAt: '2025-06-01T10:00:00Z', createdAt: '2025-01-01T00:00:00Z' },
        { id: 's2', deviceId: null, ip: null, userAgent: null, isCurrent: false, lastActiveAt: '2025-05-01T10:00:00Z', createdAt: '2025-01-01T00:00:00Z' },
      ]);

      const result = await controller.listSessions(c);
      expect(result.sessions).toHaveLength(2);
    });

    it('should return empty list when no sessions', async () => {
      const controller = new SessionController(mockSessionRepo as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1', username: 'alice' });
      mockSessionRepo.listUserSessions.mockResolvedValue([]);

      const result = await controller.listSessions(c);
      expect(result.sessions).toHaveLength(0);
    });
  });

  describe('DELETE /auth/sessions/:id', () => {
    it('should revoke specific session', async () => {
      const controller = new SessionController(mockSessionRepo as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1', username: 'alice' });
      mockSessionRepo.revokeSessionById.mockResolvedValue({ affectedRows: 1 });

      const result = await controller.revokeSession('s1', c);
      expect(result).toBe(204);
    });

    it('should throw when revoking current session', async () => {
      const controller = new SessionController(mockSessionRepo as any);
      const c = mockCtx();
      c.get.mockImplementation((key: string) => {
        if (key === 'sessionId') return 'current-session';
        return { userId: 'user-1', username: 'alice' };
      });

      await expect(controller.revokeSession('current-session', c)).rejects.toThrow(
        'Cannot revoke current session',
      );
    });
  });

  describe('DELETE /auth/sessions', () => {
    it('should revoke other sessions', async () => {
      const controller = new SessionController(mockSessionRepo as any);
      const c = mockCtx();
      c.get.mockReturnValue({ userId: 'user-1', username: 'alice' });
      mockSessionRepo.getUserSessionIds.mockResolvedValue(['s1', 's2']);
      mockSessionRepo.revokeSessionById.mockResolvedValue({ affectedRows: 1 });

      const result = await controller.revokeOtherSessions(c);
      expect(result).toBe(204);
    });
  });
});
