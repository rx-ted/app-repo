import { z } from 'zod';

export const SessionEntitySchema = z.object({
  userId: z.string(),
  username: z.string(),
  preferredLocale: z.enum(['zh-CN', 'en']),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  tokenVersion: z.number(),
  lastLoginAt: z.string().nullable(),
  nickname: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export interface AuthEntity {
  userId: string;
  username: string;
  email: string | null;
  passwordHash: string | null;
  roles: string[];
  permissions: string[];
  tokenVersion: number;
  lastLoginAt: string | null;
  preferredLocale: 'zh-CN' | 'en';
  status: 'NORMAL' | 'MUTED' | 'BANNED' | 'DELETED';
  createdAt: string;
  updatedAt: string;
}

export interface SessionEntity {
  userId: string;
  username: string;
  preferredLocale: 'zh-CN' | 'en';
  roles: string[];
  permissions: string[];
  tokenVersion: number;
  lastLoginAt: string | null;
  nickname: string | null;
  avatarUrl: string | null;
}

export interface JwtPayload {
  username: string;
  sessionId?: string;
  tokenVersion?: number;
}
