import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const PasswordRegister = z.object({
  login_type: z.literal('password'),
  username: z.string().min(3).max(50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  email: z.email().optional(),
  nickname: z.string().max(100).optional(),
  avatar_url: z.string().max(1024).optional(),
  bio: z.string().optional(),
  location: z.string().max(100).optional(),
});

const EmailRegister = z.object({
  login_type: z.literal('email'),
  email: z.email(),
  code: z.string().length(6),
  username: z.string().min(3).max(50).optional(),
  preferred_locale: z.enum(['zh-CN', 'en']).optional().default('zh-CN'),
  nickname: z.string().max(100).optional(),
  avatar_url: z.string().max(1024).optional(),
  bio: z.string().optional(),
  location: z.string().max(100).optional(),
});

const GoogleRegister = z.object({
  login_type: z.literal('google'),
  code: z.string().min(1),
  username: z.string().min(3).max(50).optional(),
  preferred_locale: z.enum(['zh-CN', 'en']).optional().default('zh-CN'),
  nickname: z.string().max(100).optional(),
  avatar_url: z.string().max(1024).optional(),
  bio: z.string().optional(),
  location: z.string().max(100).optional(),
});

const GithubRegister = z.object({
  login_type: z.literal('github'),
  code: z.string().min(1),
  username: z.string().min(3).max(50).optional(),
  preferred_locale: z.enum(['zh-CN', 'en']).optional().default('zh-CN'),
  nickname: z.string().max(100).optional(),
  avatar_url: z.string().max(1024).optional(),
  bio: z.string().optional(),
  location: z.string().max(100).optional(),
});

const WechatRegister = z.object({
  login_type: z.literal('wechat'),
  code: z.string().min(1),
  username: z.string().min(3).max(50).optional(),
  preferred_locale: z.enum(['zh-CN', 'en']).optional().default('zh-CN'),
  nickname: z.string().max(100).optional(),
  avatar_url: z.string().max(1024).optional(),
  bio: z.string().optional(),
  location: z.string().max(100).optional(),
});

export const RegisterSchema = z.discriminatedUnion('login_type', [
  PasswordRegister,
  EmailRegister,
  GoogleRegister,
  GithubRegister,
  WechatRegister,
]);

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
