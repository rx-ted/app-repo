import { z } from 'zod';

export const SendEmailCodeSchema = z.object({
  email: z.email(),
  purpose: z.enum(['login', 'register', 'reset']),
  locale: z.enum(['zh-CN', 'en']).optional().default('zh-CN'),
});

export const EmailLoginSchema = z.object({
  email: z.email(),
  code: z.string().length(6),
});

export const EmailResetPasswordSchema = z.object({
  email: z.email(),
  code: z.string().length(6),
  password: z.string().min(6),
});

export type SendEmailCodeInput = z.infer<typeof SendEmailCodeSchema>;
export type EmailLoginInput = z.infer<typeof EmailLoginSchema>;
export type EmailResetPasswordInput = z.infer<typeof EmailResetPasswordSchema>;
