import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  avatar_url: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional(),
  location: z.string().max(100).optional(),
  gender: z.enum(['Male', 'Female', 'Unknown']).optional(),
  birthday: z.string().optional(),
  preferred_locale: z.enum(['zh-CN', 'en']).optional(),
});

export const UpdateEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const UserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(100),
});

export const PublicProfileParamsSchema = z.object({
  username: z.string().min(1).max(50),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdateEmailInput = z.infer<typeof UpdateEmailSchema>;
export type UserListQuery = z.infer<typeof UserListQuerySchema>;
export type PublicProfileParams = z.infer<typeof PublicProfileParamsSchema>;
