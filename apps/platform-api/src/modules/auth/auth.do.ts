export { UserProfileSchema, type UserProfile } from './dtos/auth-response.schema';

import { LOCALE } from '@/constants';

export interface UserProfileInput {
  userId: string;
  username: string;
  email: string | null;
  preferredLocale: 'zh-CN' | 'en';
  status: 'NORMAL' | 'MUTED' | 'BANNED' | 'DELETED';
  tokenVersion: number;
  lastLoginAt: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  gender: 'Male' | 'Female' | 'Unknown' | null;
  birthday: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
}

export function toUserProfile(input: UserProfileInput) {
  return {
    id: input.userId,
    username: input.username,
    email: input.email,
    preferredLocale: input.preferredLocale ?? LOCALE.DEFAULT,
    status: input.status,
    tokenVersion: input.tokenVersion,
    lastLoginAt: input.lastLoginAt,
    nickname: input.nickname ?? input.username,
    avatarUrl: input.avatarUrl ?? null,
    gender: input.gender ?? null,
    birthday: input.birthday ?? null,
    bio: input.bio ?? null,
    website: input.website ?? null,
    location: input.location ?? null,
  };
}
