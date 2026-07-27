import { z } from 'zod';
import {
  DISCOVER_CATEGORIES,
  DISCOVER_STATUSES,
} from '@/modules/discover/entities/discover.entity';

export const CreateDiscoverySchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url().max(500),
  logo: z.string().url().max(500).optional(),
  description: z.string().max(200).optional(),
  category: z.enum(DISCOVER_CATEGORIES).optional(),
  email: z.string().email(),
  code: z.string().length(6),
});

export const UpdateDiscoverySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().max(500).optional(),
  logo: z.string().url().max(500).optional().nullable(),
  description: z.string().max(200).optional().nullable(),
  category: z.enum(DISCOVER_CATEGORIES).optional(),
  status: z.enum(DISCOVER_STATUSES).optional(),
  sortOrder: z.number().int().optional(),
});

export const DiscoveryResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string(),
  logo: z.string().nullable(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  status: z.string().nullable(),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const SendFriendLinkCodeSchema = z.object({
  email: z.string().email(),
});

export type CreateDiscoveryInput = z.infer<typeof CreateDiscoverySchema>;
export type UpdateDiscoveryInput = z.infer<typeof UpdateDiscoverySchema>;
export type DiscoveryResponse = z.infer<typeof DiscoveryResponseSchema>;
export type SendFriendLinkCodeInput = z.infer<typeof SendFriendLinkCodeSchema>;
