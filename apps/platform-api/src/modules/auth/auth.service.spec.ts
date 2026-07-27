import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { HTTPException } from 'hono/http-exception';
import SessionManagerService from '@/modules/auth/services/session-manager.service';
import PasswordAuthService from '@/modules/auth/services/password-auth.service';
import EmailAuthService from '@/modules/auth/services/email-auth.service';
import { hashPassword, hashRefreshToken } from '@/modules/auth/auth.utils';

vi.mock('@rx-ted/packages-core', () => ({
  env: {
    require: (key: string) => {
      if (key === 'JWT_SECRET') return 'test-jwt-secret';
      throw new Error(`Missing required config: ${key}`);
    },
    get: vi.fn(),
    has: vi.fn(),
  },
  detectRuntime: () => 'node',
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'mock-access-token'),
  },
}));

const mockAuthRepo = {
  getSessionUserByUsername: vi.fn(),
  findByUsername: vi.fn().mockResolvedValue(false),
  createUser: vi.fn(),
  invalidateSession: vi.fn(),
  getUserProfile: vi.fn(),
  updateLastLoginAt: vi.fn(),
  getUserByEmail: vi.fn(),
  updatePasswordByEmail: vi.fn(),
};

const mockSessionRepo = {
  create: vi.fn(),
  addToUserSessions: vi.fn(),
  setRefreshTokenHash: vi.fn(),
  setCurrentHashIndex: vi.fn(),
  findById: vi.fn(),
  deleteSession: vi.fn(),
  revokeUserSessions: vi.fn(),
  getRefreshTokenHash: vi.fn(),
  getCurrentHashIndex: vi.fn(),
  deleteHashKey: vi.fn(),
};

const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

const mockMailService = {
  sendVerificationCode: vi.fn(),
};

const mockGeoipService = {
  lookup: vi.fn(() => null),
};

const mockAuditService = {
  record: vi.fn().mockResolvedValue(undefined),
};

function createSessionManager() {
  return new SessionManagerService(
    mockAuthRepo as any,
    mockSessionRepo as any,
    mockGeoipService as any,
    mockAuditService as any,
  );
}

function createPasswordAuth(sessionManager: SessionManagerService) {
  return new PasswordAuthService(mockAuthRepo as any, sessionManager as any);
}

function createEmailAuth(sessionManager: SessionManagerService) {
  return new EmailAuthService(
    mockAuthRepo as any,
    sessionManager as any,
    mockCache as any,
    mockMailService as any,
  );
}

const baseUser = {
  userId: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  passwordHash: null as string | null,
  roles: ['user'] as string[],
  permissions: ['read'] as string[],
  tokenVersion: 0,
  lastLoginAt: null,
  preferredLocale: 'zh-CN' as const,
  status: 'NORMAL' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockSession = {
  id: 'session-1',
  userId: 'user-1',
  username: 'testuser',
  deviceId: null,
  ip: null,
  city: null,
  userAgent: null,
  refreshTokenHash: 'old-hash',
  createdAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
};

describe('hashPassword', () => {
  it('should return $pbkdf2$salt$hash format with 32-char hex salt and valid hex hash', async () => {
    const result = await hashPassword('my-password');
    expect(result).toMatch(/^\$pbkdf2\$/);
    const parts = result.split('$');
    expect(parts[2]).toHaveLength(32);
    expect(parts[3]).toMatch(/^[a-f0-9]+$/);
  });
});

describe('hashRefreshToken', () => {
  it('should return correct sha256 hex digest', () => {
    const raw = 'test-refresh-token';
    const expected = bytesToHex(sha256(new TextEncoder().encode(raw)));
    expect(hashRefreshToken(raw)).toBe(expected);
  });
});

describe('PasswordAuthService.login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthRepo.getUserProfile.mockResolvedValue(null);
  });

  it('should throw 401 for invalid username', async () => {
    mockAuthRepo.getSessionUserByUsername.mockResolvedValue(null);
    const sessionManager = createSessionManager();
    const service = createPasswordAuth(sessionManager);

    await expect(service.login('unknown', 'password')).rejects.toThrow(HTTPException);
    expect(mockAuthRepo.getSessionUserByUsername).toHaveBeenCalledWith('unknown');
  });

  it('should throw 401 for wrong password', async () => {
    const pwHash = await hashPassword('correct-password');
    mockAuthRepo.getSessionUserByUsername.mockResolvedValue({
      ...baseUser,
      passwordHash: pwHash,
    });
    const sessionManager = createSessionManager();
    const service = createPasswordAuth(sessionManager);

    await expect(service.login('testuser', 'wrong-password')).rejects.toThrow(HTTPException);
  });

  it('should throw 401 for invalid password hash format', async () => {
    mockAuthRepo.getSessionUserByUsername.mockResolvedValue({
      ...baseUser,
      passwordHash: 'garbage',
    });
    const sessionManager = createSessionManager();
    const service = createPasswordAuth(sessionManager);

    await expect(service.login('testuser', 'any-password')).rejects.toThrow(HTTPException);
  });

  it('should return tokens and session for valid credentials', async () => {
    const pwHash = await hashPassword('correct-password');
    mockAuthRepo.getSessionUserByUsername.mockResolvedValue({
      ...baseUser,
      passwordHash: pwHash,
    });
    const sessionManager = createSessionManager();
    const service = createPasswordAuth(sessionManager);

    const result = await service.login('testuser', 'correct-password');

    expect(result).toHaveProperty('accessToken', 'mock-access-token');
    expect(result).toHaveProperty('refreshToken');
    expect(result).toHaveProperty('expiresIn');
    expect(result).toHaveProperty('sessionId');
    expect(mockSessionRepo.create).toHaveBeenCalled();
    expect(mockSessionRepo.addToUserSessions).toHaveBeenCalled();
    expect(mockSessionRepo.setRefreshTokenHash).toHaveBeenCalled();
    expect(mockSessionRepo.setCurrentHashIndex).toHaveBeenCalled();
  });
});

describe('SessionManagerService.refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw 401 for invalid refresh token', async () => {
    mockSessionRepo.getRefreshTokenHash.mockResolvedValue(null);
    const service = createSessionManager();

    await expect(service.refresh('invalid-token')).rejects.toThrow(HTTPException);
  });

  it('should throw 401 if session not found', async () => {
    mockSessionRepo.getRefreshTokenHash.mockResolvedValue('session-1');
    mockSessionRepo.findById.mockResolvedValue(null);
    const service = createSessionManager();

    await expect(service.refresh('some-token')).rejects.toThrow(HTTPException);
  });

  it('should detect reuse and revoke all user sessions', async () => {
    const rawToken = 'reused-token';
    mockSessionRepo.getRefreshTokenHash.mockResolvedValue('session-1');
    mockSessionRepo.findById.mockResolvedValue(mockSession);
    mockSessionRepo.getCurrentHashIndex.mockResolvedValue('different-hash');
    const service = createSessionManager();

    await expect(service.refresh(rawToken)).rejects.toThrow(HTTPException);
    expect(mockSessionRepo.revokeUserSessions).toHaveBeenCalledWith('user-1');
  });

  it('should rotate token and return new access/refresh pair', async () => {
    const rawToken = 'valid-refresh-token';
    const tokenHash = bytesToHex(sha256(new TextEncoder().encode(rawToken)));
    mockSessionRepo.getRefreshTokenHash.mockResolvedValue('session-1');
    mockSessionRepo.findById.mockResolvedValue(mockSession);
    mockSessionRepo.getCurrentHashIndex.mockResolvedValue(tokenHash);
    const service = createSessionManager();

    const result = await service.refresh(rawToken);

    expect(result).toHaveProperty('accessToken', 'mock-access-token');
    expect(result).toHaveProperty('refreshToken');
    expect(mockSessionRepo.deleteHashKey).toHaveBeenCalled();
    expect(mockSessionRepo.create).toHaveBeenCalled();
    expect(mockSessionRepo.setRefreshTokenHash).toHaveBeenCalled();
    expect(mockSessionRepo.setCurrentHashIndex).toHaveBeenCalled();
  });
});

describe('SessionManagerService.logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete session and invalidate when sessionId provided', async () => {
    const service = createSessionManager();

    const result = await service.logout('testuser', 'session-1');

    expect(mockSessionRepo.deleteSession).toHaveBeenCalledWith('session-1');
    expect(mockAuthRepo.invalidateSession).toHaveBeenCalledWith('testuser');
    expect(result).toEqual({ affectedRows: 1, rows: [] });
  });

  it('should invalidate without deleting session when no sessionId', async () => {
    const service = createSessionManager();

    const result = await service.logout('testuser');

    expect(mockSessionRepo.deleteSession).not.toHaveBeenCalled();
    expect(mockAuthRepo.invalidateSession).toHaveBeenCalledWith('testuser');
    expect(result).toEqual({ affectedRows: 1, rows: [] });
  });
});

describe('PasswordAuthService.register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthRepo.getUserProfile.mockResolvedValue(null);
  });

  it('should throw conflict if username exists', async () => {
    mockAuthRepo.findByUsername.mockResolvedValue(true);
    const sessionManager = createSessionManager();
    const service = createPasswordAuth(sessionManager);

    await expect(
      service.register({
        login_type: 'password',
        username: 'existing',
        password: 'password123',
      }),
    ).rejects.toMatchObject({ status: 409, code: 'USERNAME_ALREADY_EXISTS' });
    expect(mockAuthRepo.findByUsername).toHaveBeenCalledWith('existing');
  });

  it('should create user and return tokens with session', async () => {
    mockAuthRepo.findByUsername.mockResolvedValue(false);
    mockAuthRepo.createUser.mockResolvedValue({
      ...baseUser,
      username: 'newuser',
      passwordHash: 'some-hash',
    });
    const sessionManager = createSessionManager();
    const service = createPasswordAuth(sessionManager);

    const result = await service.register({
      login_type: 'password',
      username: 'newuser',
      password: 'password123',
    });

    expect(result).toHaveProperty('accessToken', 'mock-access-token');
    expect(result).toHaveProperty('sessionId');
    expect(result).toHaveProperty('refreshToken');
    expect(mockAuthRepo.createUser).toHaveBeenCalledWith(
      'newuser',
      'password',
      expect.objectContaining({
        passwordHash: expect.stringContaining('$pbkdf2$'),
      }),
      [],
    );
    expect(mockSessionRepo.create).toHaveBeenCalled();
    expect(mockSessionRepo.addToUserSessions).toHaveBeenCalled();
    expect(mockSessionRepo.setRefreshTokenHash).toHaveBeenCalled();
    expect(mockSessionRepo.setCurrentHashIndex).toHaveBeenCalled();
  });
});

describe('EmailAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendEmailCode', () => {
    it('should throw 429 if cooldown key exists', async () => {
      mockCache.get.mockResolvedValue('1');
      const sessionManager = createSessionManager();
      const service = createEmailAuth(sessionManager);

      await expect(service.sendEmailCode('test@example.com', 'login')).rejects.toThrow(
        HTTPException,
      );
      expect(mockMailService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('should generate code, store in cache, and send email', async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(true);
      const sessionManager = createSessionManager();
      const service = createEmailAuth(sessionManager);

      const result = await service.sendEmailCode('test@example.com', 'login');

      expect(result).toHaveProperty('ttlSeconds');
      expect(result).toHaveProperty('resendCooldownSeconds');
      expect(mockCache.set).toHaveBeenCalledTimes(2);
      expect(mockMailService.sendVerificationCode).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendVerificationCode).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          purpose: 'login',
        }),
      );
    });
  });

  describe('emailLogin', () => {
    it('should throw 401 if code is invalid', async () => {
      mockCache.get.mockResolvedValue('correct-code');
      const sessionManager = createSessionManager();
      const service = createEmailAuth(sessionManager);

      await expect(service.emailLogin('test@example.com', 'wrong-code')).rejects.toThrow(
        HTTPException,
      );
    });

    it('should throw 401 if user not found', async () => {
      mockCache.get.mockResolvedValue('valid-code');
      mockAuthRepo.getUserByEmail.mockResolvedValue(null);
      const sessionManager = createSessionManager();
      const service = createEmailAuth(sessionManager);

      await expect(service.emailLogin('test@example.com', 'valid-code')).rejects.toThrow(
        HTTPException,
      );
    });

    it('should create session and return tokens on success', async () => {
      mockCache.get.mockResolvedValue('valid-code');
      mockAuthRepo.getUserByEmail.mockResolvedValue({
        userId: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: null,
        roles: ['user'],
        permissions: ['read'],
        tokenVersion: 0,
        lastLoginAt: null,
        preferredLocale: 'zh-CN',
        status: 'NORMAL',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      mockAuthRepo.getUserProfile.mockResolvedValue(null);
      const sessionManager = createSessionManager();
      const service = createEmailAuth(sessionManager);

      const result = await service.emailLogin('test@example.com', 'valid-code');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('sessionId');
      expect(mockSessionRepo.create).toHaveBeenCalled();
      expect(mockCache.delete).toHaveBeenCalled();
    });
  });

  describe('emailResetPassword', () => {
    it('should throw 401 if code is invalid', async () => {
      mockCache.get.mockResolvedValue('correct-code');
      const sessionManager = createSessionManager();
      const service = createEmailAuth(sessionManager);

      await expect(
        service.emailResetPassword('test@example.com', 'wrong-code', 'new-pass'),
      ).rejects.toThrow(HTTPException);
    });

    it('should update password on success', async () => {
      mockCache.get.mockResolvedValue('valid-code');
      mockAuthRepo.updatePasswordByEmail.mockResolvedValue(undefined);
      const sessionManager = createSessionManager();
      const service = createEmailAuth(sessionManager);

      const result = await service.emailResetPassword(
        'test@example.com',
        'valid-code',
        'newpassword123',
      );

      expect(result).toEqual({ success: true });
      expect(mockAuthRepo.updatePasswordByEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('$pbkdf2$'),
      );
      expect(mockCache.delete).toHaveBeenCalled();
    });
  });
});
