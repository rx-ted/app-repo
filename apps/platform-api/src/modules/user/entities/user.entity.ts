import { z } from 'zod';
import { zdb } from '@rx-ted/packages-honest-plugins/db';

// ==================== Zod-Centric Schema Definitions ====================

export const UsersSchema = z.object({
  id: zdb(z.string().length(36), { type: 'char', length: 36, primaryKey: true }),
  username: zdb(z.string().min(3).max(20), {
    type: 'varchar',
    length: 20,
    notNull: true,
    unique: true,
  }),
  loginType: zdb(z.enum(['password', 'google', 'github', 'wechat', 'email']), {
    type: 'enum',
    values: ['password', 'google', 'github', 'wechat', 'email'],
    dbName: 'login_type',
    notNull: true,
    default: 'password',
  }),
  passwordHash: zdb(z.string().max(255).nullable(), {
    type: 'varchar',
    length: 255,
    dbName: 'password_hash',
  }),
  email: zdb(z.string().email().nullable(), { type: 'varchar', length: 255, unique: true }),
  preferredLocale: zdb(z.enum(['zh-CN', 'en']), {
    type: 'enum',
    values: ['zh-CN', 'en'],
    dbName: 'preferred_locale',
    notNull: true,
    default: 'zh-CN',
  }),
  status: zdb(z.enum(['NORMAL', 'MUTED', 'BANNED', 'DELETED']), {
    type: 'enum',
    values: ['NORMAL', 'MUTED', 'BANNED', 'DELETED'],
    default: 'NORMAL',
  }),
  tokenVersion: zdb(z.number().int(), { type: 'integer', dbName: 'token_version', default: 0 }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.string(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
  lastLoginAt: zdb(z.string().nullable(), { type: 'timestamp', dbName: 'last_login_at' }),
});

// TODO: composite uniqueIndex on (type, identifier)
export const UserAuthSchema = z.object({
  id: zdb(z.number().int(), { type: 'integer', primaryKey: true, autoIncrement: true }),
  userId: zdb(z.string().length(36), {
    type: 'char',
    length: 36,
    dbName: 'user_id',
    notNull: true,
    references: { table: 'users', column: 'id', onDelete: 'cascade' },
  }),
  type: zdb(z.enum(['password', 'email', 'phone']), {
    type: 'enum',
    values: ['password', 'email', 'phone'],
    notNull: true,
  }),
  identifier: zdb(z.string().max(255), { type: 'varchar', length: 255, notNull: true }),
  credential: zdb(z.string().max(255).nullable(), { type: 'varchar', length: 255 }),
});

export const UserProfilesSchema = z.object({
  userId: zdb(z.string().length(36), {
    type: 'char',
    length: 36,
    dbName: 'user_id',
    primaryKey: true,
    references: { table: 'users', column: 'id', onDelete: 'cascade' },
  }),
  nickname: zdb(z.string().max(100).nullable(), { type: 'varchar', length: 100 }),
  avatarUrl: zdb(z.string().max(1024).nullable(), {
    type: 'varchar',
    length: 1024,
    dbName: 'avatar_url',
  }),
  gender: zdb(z.enum(['Male', 'Female', 'Unknown']).nullable(), {
    type: 'enum',
    values: ['Male', 'Female', 'Unknown'],
    default: 'Unknown',
  }),
  birthday: zdb(z.string().nullable(), { type: 'date' }),
  bio: zdb(z.string().nullable(), { type: 'text' }),
  website: zdb(z.string().max(255).nullable(), { type: 'varchar', length: 255 }),
  location: zdb(z.string().max(100).nullable(), { type: 'varchar', length: 100 }),
  updatedAt: zdb(z.string(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
});

// TODO: composite uniqueIndex on (provider, providerUserId), (userId, provider)
export const UserOauthSchema = z.object({
  id: zdb(z.number().int(), { type: 'integer', primaryKey: true, autoIncrement: true }),
  userId: zdb(z.string().length(36), {
    type: 'char',
    length: 36,
    dbName: 'user_id',
    notNull: true,
    references: { table: 'users', column: 'id', onDelete: 'cascade' },
  }),
  provider: zdb(z.enum(['gitHub', 'google', 'wechat']), {
    type: 'enum',
    values: ['gitHub', 'google', 'wechat'],
    notNull: true,
  }),
  providerUserId: zdb(z.string().max(255), {
    type: 'varchar',
    length: 255,
    dbName: 'provider_user_id',
    notNull: true,
  }),
  accessToken: zdb(z.string().nullable(), { type: 'text', dbName: 'access_token' }),
  refreshToken: zdb(z.string().nullable(), { type: 'text', dbName: 'refresh_token' }),
  expiresAt: zdb(z.string().nullable(), { type: 'timestamp', dbName: 'expires_at' }),
  createdAt: zdb(z.string(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
});

// ==================== Entity Interfaces (业务层使用) ====================

export const UserEntitySchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  loginType: z.enum(['password', 'google', 'github', 'wechat', 'email']),
  preferredLocale: z.enum(['zh-CN', 'en']),
  status: z.enum(['NORMAL', 'MUTED', 'BANNED', 'DELETED']),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLoginAt: z.string().nullable(),
});

export const UserProfileEntitySchema = z.object({
  id: z.string(),
  username: z.string(),
  githubConnected: z.boolean(),
  preferredLocale: z.enum(['zh-CN', 'en']),
  nickname: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  gender: z.enum(['Male', 'Female', 'Unknown']).nullable(),
  birthday: z.string().nullable(),
  bio: z.string().nullable(),
  website: z.string().nullable(),
  location: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const UserPublicProfileEntitySchema = UserProfileEntitySchema.extend({
  createdAt: z.string(),
});

export interface UserEntity {
  id: string;
  username: string;
  email: string | null;
  loginType: 'password' | 'google' | 'github' | 'wechat' | 'email';
  preferredLocale: 'zh-CN' | 'en';
  status: 'NORMAL' | 'MUTED' | 'BANNED' | 'DELETED';
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface UserProfileEntity {
  id: string;
  username: string;
  githubConnected: boolean;
  preferredLocale: 'zh-CN' | 'en';
  nickname: string | null;
  avatarUrl: string | null;
  gender: 'Male' | 'Female' | 'Unknown' | null;
  birthday: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  updatedAt: string | null;
}

export interface UserPublicProfileEntity extends UserProfileEntity {
  createdAt: string;
}
