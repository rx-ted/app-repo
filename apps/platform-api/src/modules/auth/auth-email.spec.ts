import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import EmailAuthService from '@/modules/auth/services/email-auth.service';
import SessionManagerService from '@/modules/auth/services/session-manager.service';

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
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  updatePasswordByEmail: vi.fn(),
  getSessionUserByUsername: vi.fn(),
  findByUsername: vi.fn(),
  getUserProfile: vi.fn(),
  updateLastLoginAt: vi.fn(),
  invalidateSession: vi.fn(),
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

const mockGeoip = { lookup: vi.fn(() => null) };
const mockAudit = { record: vi.fn() };

function createSessionManager() {
  return new SessionManagerService(
    mockAuthRepo as any,
    mockSessionRepo as any,
    mockGeoip as any,
    mockAudit as any,
  );
}

function createEmailAuth(sessionManager: SessionManagerService) {
  return new EmailAuthService(
    mockAuthRepo as any,
    sessionManager as any,
    mockCache as any,
    mockMailService as any,
  );
}

describe('sendEmailCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw 429 if cooldown key exists', async () => {
    mockCache.get.mockResolvedValue('1');
    const sessionManager = createSessionManager();
    const service = createEmailAuth(sessionManager);

    await expect(service.sendEmailCode('test@example.com', 'login')).rejects.toThrow(HTTPException);
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
