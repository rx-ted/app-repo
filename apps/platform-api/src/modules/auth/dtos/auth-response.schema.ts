import { z } from 'zod';

export const UserProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  preferredLocale: z.enum(['zh-CN', 'en']),
  status: z.enum(['NORMAL', 'MUTED', 'BANNED', 'DELETED']),
  tokenVersion: z.number(),
  lastLoginAt: z.string().nullable(),
  nickname: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  gender: z.enum(['Male', 'Female', 'Unknown']).nullable(),
  birthday: z.string().nullable(),
  bio: z.string().nullable(),
  website: z.string().nullable(),
  location: z.string().nullable(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UserSelfResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  preferred_locale: z.enum(['zh-CN', 'en']),
  status: z.enum(['NORMAL', 'MUTED', 'BANNED', 'DELETED']),
  created_at: z.string(),
  updated_at: z.string(),
  last_login_at: z.string().nullable(),
});

export const UserProfileResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  github_connected: z.boolean(),
  preferred_locale: z.enum(['zh-CN', 'en']),
  nickname: z.string().nullable(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  website: z.string().nullable(),
  location: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export const UserPublicProfileResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  github_connected: z.boolean(),
  preferred_locale: z.enum(['zh-CN', 'en']),
  nickname: z.string().nullable(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  website: z.string().nullable(),
  location: z.string().nullable(),
  updated_at: z.string().nullable(),
  created_at: z.string(),
});

export const UserAdminResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  preferred_locale: z.enum(['zh-CN', 'en']),
  status: z.enum(['NORMAL', 'MUTED', 'BANNED', 'DELETED']),
  created_at: z.string(),
  updated_at: z.string(),
  last_login_at: z.string().nullable(),
  login_type: z.literal('password'),
});

export type UserSelfResponse = z.infer<typeof UserSelfResponseSchema>;
export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>;
export type UserPublicProfileResponse = z.infer<typeof UserPublicProfileResponseSchema>;
export type UserAdminResponse = z.infer<typeof UserAdminResponseSchema>;
