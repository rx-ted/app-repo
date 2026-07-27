import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HTTPException } from 'hono/http-exception';

vi.mock('@rx-ted/packages-core', () => ({
  env: {
    require: (key: string) => {
      if (key === 'JWT_SECRET') return 'test-jwt-secret';
      throw new Error(`Missing required config: ${key}`);
    },
    var: (key: string, defaultValue?: string) => {
      if (key === 'API_PREFIX') return '/api/v1';
      return defaultValue;
    },
    get: vi.fn(),
    has: vi.fn(),
  },
}));

vi.mock('@rx-ted/packages-honest', () => ({
  Controller: () => (target: any) => target,
  Get: () => () => {},
  Post: () => () => {},
  Body: () => () => {},
  Ctx: () => () => {},
  Ip: () => () => {},
  UA: () => () => {},
  Service: () => (target: any) => target,
  Inject: () => () => {},
  UseGuards: () => () => {},
  UseMiddleware: () => () => {},
}));

vi.mock('@/common/guards', () => ({
  AuthGuard: vi.fn(),
}));

vi.mock('@/common/middleware', () => ({
  RateLimitMiddleware: vi.fn(),
}));

vi.mock('@/common/decorators', () => ({
  Public: () => () => {},
  RateLimit: () => () => {},
}));

vi.mock('hono/cookie', () => ({
  setCookie: vi.fn(),
}));

vi.mock('@/modules/auth/dtos/auth.schema', () => ({
  LoginSchema: { parse: vi.fn((body: any) => body) },
  RegisterSchema: { parse: vi.fn((body: any) => body) },
}));

vi.mock('@/modules/auth/repositories/session.repository', () => ({
  SessionRepository: vi.fn(),
}));

vi.mock('@/modules/auth/auth.utils', () => ({
  hashRefreshToken: vi.fn((token: string) => `hashed:${token}`),
}));

vi.mock('@/modules/auth/services/session-manager.service', () => ({
  default: vi.fn(),
}));

vi.mock('@/modules/auth/services/password-auth.service', () => ({
  default: vi.fn(),
}));

vi.mock('@/modules/auth/services/email-auth.service', () => ({
  default: vi.fn(),
}));

vi.mock('@/modules/auth/services/oauth.service', () => ({
  default: vi.fn(),
}));

import AuthController from '@/modules/auth/auth.controller';
import { setCookie } from 'hono/cookie';

const mockSessionManager = {
  getSession: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  createSessionAndTokens: vi.fn(),
  recordAuditLogin: vi.fn(),
  recordAuditRegister: vi.fn(),
  recordAuditBind: vi.fn(),
  updateUserProfileFields: vi.fn(),
};

const mockPasswordAuth = {
  login: vi.fn(),
  register: vi.fn(),
};

const mockEmailAuth = {
  registerByEmail: vi.fn(),
};

const mockOAuthService = {
  registerViaOAuth: vi.fn(),
};

const mockSessionRepo = {
  getRefreshTokenHash: vi.fn(),
};

function mockCtx(overrides = {}) {
  return {
    req: { header: vi.fn() },
    json: vi.fn((data: any) => data),
    get: vi.fn(),
    ...overrides,
  } as any;
}

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AuthController(
      mockSessionManager as any,
      mockPasswordAuth as any,
      mockEmailAuth as any,
      mockOAuthService as any,
      mockSessionRepo as any,
    );
  });

  describe('getSession', () => {
    it('should return user session from context', async () => {
      const c = mockCtx();
      c.get.mockReturnValue({ username: 'testuser', userId: 'user-1' });
      const session = {
        userId: 'user-1',
        username: 'testuser',
        roles: ['user'],
        permissions: ['read'],
      };
      mockSessionManager.getSession.mockResolvedValue(session);

      const result = await controller.getSession(c);

      expect(c.get).toHaveBeenCalledWith('user');
      expect(mockSessionManager.getSession).toHaveBeenCalledWith('testuser');
      expect(c.json).toHaveBeenCalledWith(session);
      expect(result).toEqual(session);
    });
  });

  describe('login', () => {
    it('should call passwordAuth.login and set refresh cookie', async () => {
      const c = mockCtx();
      mockPasswordAuth.login.mockResolvedValue({
        accessToken: 'mock-at',
        refreshToken: 'mock-rt',
        expiresIn: '15m',
        sessionId: 'session-1',
        user: { username: 'testuser' },
      });

      const result = await controller.login({ username: 'testuser', password: 'pass' }, c);

      expect(mockPasswordAuth.login).toHaveBeenCalledWith('testuser', 'pass', undefined, undefined);
      expect(setCookie).toHaveBeenCalledWith(
        c,
        'refresh_token',
        'mock-rt',
        expect.objectContaining({ httpOnly: true, secure: true }),
      );
      expect(result).toEqual({
        accessToken: 'mock-at',
        expiresIn: '15m',
        sessionId: 'session-1',
      });
    });
  });

  describe('refresh', () => {
    it('should extract token from Cookie header and call sessionManager.refresh', async () => {
      const c = mockCtx();
      c.req.header.mockImplementation((name: string) => {
        if (name === 'Cookie') return 'refresh_token=my-refresh-token; other=value';
        return undefined;
      });
      mockSessionManager.refresh.mockResolvedValue({
        accessToken: 'new-at',
        refreshToken: 'new-rt',
        expiresIn: '15m',
      });

      const result = await controller.refresh(c);

      expect(mockSessionManager.refresh).toHaveBeenCalledWith(
        'my-refresh-token',
        undefined,
        undefined,
      );
      expect(setCookie).toHaveBeenCalledWith(
        c,
        'refresh_token',
        'new-rt',
        expect.objectContaining({ httpOnly: true, secure: true }),
      );
      expect(result).toEqual({ accessToken: 'new-at', expiresIn: '15m' });
    });

    it('should throw 401 if no refresh token in Cookie header', async () => {
      const c = mockCtx();
      c.req.header.mockReturnValue(undefined);

      await expect(controller.refresh(c)).rejects.toThrow(HTTPException);
    });
  });

  describe('logout', () => {
    it('should resolve sessionId from cookie and call sessionManager.logout', async () => {
      const c = mockCtx();
      c.get.mockReturnValue({ username: 'testuser' });
      c.req.header.mockImplementation((name: string) => {
        if (name === 'Cookie') return 'refresh_token=my-token; other=val';
        return undefined;
      });
      mockSessionRepo.getRefreshTokenHash.mockResolvedValue('session-1');
      mockSessionManager.logout.mockResolvedValue({ affectedRows: 1, rows: [] });

      const result = await controller.logout(c);

      expect(mockSessionManager.logout).toHaveBeenCalledWith('testuser', 'session-1');
      expect(setCookie).toHaveBeenCalledWith(
        c,
        'refresh_token',
        '',
        expect.objectContaining({ maxAge: 0 }),
      );
      expect(result).toEqual({ affectedRows: 1, rows: [] });
    });

    it('should call logout without sessionId when no refresh cookie', async () => {
      const c = mockCtx();
      c.get.mockReturnValue({ username: 'testuser' });
      c.req.header.mockReturnValue(undefined);
      mockSessionManager.logout.mockResolvedValue({ affectedRows: 1, rows: [] });

      const result = await controller.logout(c);

      expect(mockSessionManager.logout).toHaveBeenCalledWith('testuser', undefined);
      expect(result).toEqual({ affectedRows: 1, rows: [] });
    });
  });

  describe('register', () => {
    it('should call passwordAuth.register with full body and set refresh cookie', async () => {
      const c = mockCtx();
      mockPasswordAuth.register.mockResolvedValue({
        accessToken: 'mock-at',
        refreshToken: 'mock-rt',
        expiresIn: '15m',
        sessionId: 'session-1',
        user: { username: 'newuser' },
      });

      const input = {
        login_type: 'password' as const,
        username: 'newuser',
        password: 'password123',
      };
      const result = await controller.register(input, c);

      expect(mockPasswordAuth.register).toHaveBeenCalledWith(input, undefined, undefined);
      expect(setCookie).toHaveBeenCalledWith(
        c,
        'refresh_token',
        'mock-rt',
        expect.objectContaining({ httpOnly: true, secure: true }),
      );
      expect(result).toEqual({
        accessToken: 'mock-at',
        expiresIn: '15m',
        sessionId: 'session-1',
      });
    });
  });
});
