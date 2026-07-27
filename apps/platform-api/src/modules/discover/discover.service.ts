import { Inject, Service } from '@rx-ted/packages-honest';
import { eq, asc, or } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';
import { HTTPException } from 'hono/http-exception';
import { discoveries } from '@/schema';

import { DiscoveryMapper } from '@/modules/discover/mappers/discover.mapper';
import type { DiscoveryEntity } from '@/modules/discover/entities/discover.entity';
import { generateEmailCode, codeCacheKey, cooldownCacheKey } from '@/modules/auth/auth.utils';
import MailService from '@/modules/mail/mail.service';
import { AUTH } from '@/constants/auth';

const DISCOVERIES_ACTIVE_KEY = 'discoveries:active';
const DISCOVERIES_ALL_KEY = 'discoveries:all';
const DISCOVERIES_TTL = 300;

function mapRow(row: typeof discoveries.$inferSelect): DiscoveryEntity {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    logo: row.logo ?? null,
    description: row.description ?? null,
    category: row.category ?? null,
    status: row.status ?? null,
    email: row.email ?? null,
    sortOrder: row.sortOrder ?? 0,
    failCount: row.failCount ?? 0,
    lastCheckedAt: row.lastCheckedAt ? row.lastCheckedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Service()
class DiscoverService {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(CacheService) private cache: CacheService,
    @Inject(MailService) private mailService: MailService,
  ) {}

  async listActive(category?: string, status?: string) {
    const list = await cacheable<DiscoveryEntity[]>(
      this.cache,
      DISCOVERIES_ACTIVE_KEY,
      DISCOVERIES_TTL,
      async () => {
        const rows = await this.db
          .select()
          .from(discoveries)
          .orderBy(asc(discoveries.sortOrder), asc(discoveries.createdAt));
        return rows.map((r) => mapRow(r));
      },
    );

    let filtered = list;
    if (category) filtered = filtered.filter((l) => l.category === category);
    if (status) filtered = filtered.filter((l) => l.status === status);

    return filtered.map((r) => DiscoveryMapper.toResponse(r));
  }

  async listAll(status?: string, category?: string) {
    const list = await cacheable<DiscoveryEntity[]>(
      this.cache,
      DISCOVERIES_ALL_KEY,
      DISCOVERIES_TTL,
      async () => {
        const rows = await this.db
          .select()
          .from(discoveries)
          .orderBy(asc(discoveries.sortOrder), asc(discoveries.createdAt));
        return rows.map((r) => mapRow(r));
      },
    );

    let filtered = list;
    if (status) filtered = filtered.filter((l) => l.status === status);
    if (category) filtered = filtered.filter((l) => l.category === category);

    return filtered.map((r) => DiscoveryMapper.toResponse(r));
  }

  async sendCode(email: string) {
    const cooldownKey = cooldownCacheKey(email, 'discovery');
    const existing = await this.cache.get(cooldownKey);
    if (existing) {
      throw new HTTPException(429, { message: '请等待后重新发送验证码' });
    }

    const code = generateEmailCode();
    const codeKey = codeCacheKey(email, 'discovery');
    await this.cache.set(codeKey, code, AUTH.EMAIL_CODE_TTL_SECONDS);
    await this.cache.set(cooldownKey, '1', AUTH.EMAIL_CODE_RESEND_COOLDOWN_SECONDS);

    await this.mailService.sendVerificationCode({
      to: email,
      code,
      purpose: 'discovery',
      ttlSeconds: AUTH.EMAIL_CODE_TTL_SECONDS,
      locale: 'zh-CN',
    });

    return {
      ttlSeconds: AUTH.EMAIL_CODE_TTL_SECONDS,
      resendCooldownSeconds: AUTH.EMAIL_CODE_RESEND_COOLDOWN_SECONDS,
    };
  }

  async create(data: {
    name: string;
    url: string;
    email: string;
    code: string;
    logo?: string;
    description?: string;
    category?: string;
  }) {
    const codeKey = codeCacheKey(data.email, 'discovery');
    const stored = await this.cache.get<string>(codeKey);
    if (!stored || stored !== data.code) {
      throw new HTTPException(401, { message: '验证码错误或已过期' });
    }

    const now = new Date();
    const result = await this.db.insert(discoveries).values({
      name: data.name,
      url: data.url,
      logo: data.logo ?? null,
      description: data.description ?? null,
      category: data.category ?? 'other',
      status: 'pending',
      email: data.email,
      failCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    const insertId = Number(
      (result as any).insertId ??
        (result as any).lastInsertRowid ??
        (result as any).meta?.last_row_id,
    );

    await this.cache.delete(codeKey);
    await this.cache.delete(DISCOVERIES_ACTIVE_KEY);
    await this.cache.delete(DISCOVERIES_ALL_KEY);

    return insertId;
  }

  async update(id: number, data: Record<string, unknown>) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    const allowedFields = [
      'name',
      'url',
      'logo',
      'description',
      'category',
      'status',
      'sortOrder',
    ] as const;
    for (const field of allowedFields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }
    await this.db.update(discoveries).set(updateData).where(eq(discoveries.id, id));
    await this.cache.delete(DISCOVERIES_ACTIVE_KEY);
    await this.cache.delete(DISCOVERIES_ALL_KEY);
  }

  async delete(id: number) {
    await this.db.delete(discoveries).where(eq(discoveries.id, id));
    await this.cache.delete(DISCOVERIES_ACTIVE_KEY);
    await this.cache.delete(DISCOVERIES_ALL_KEY);
  }

  async checkLinkHealth(url: string): Promise<{ ok: boolean }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeout);
      return { ok: res.ok || res.status < 400 };
    } catch {
      return { ok: false };
    }
  }

  async runSingleHealthCheck(id: number) {
    const [row] = await this.db.select().from(discoveries).where(eq(discoveries.id, id)).limit(1);
    if (!row) return;

    const { ok } = await this.checkLinkHealth(row.url);
    const now = new Date();
    const newFailCount = ok ? 0 : (row.failCount ?? 0) + 1;
    const newStatus = ok ? 'active' : newFailCount >= 3 ? 'unreachable' : 'pending';

    await this.db
      .update(discoveries)
      .set({
        status: newStatus,
        failCount: newFailCount,
        lastCheckedAt: now,
        updatedAt: now,
      })
      .where(eq(discoveries.id, id));

    await this.cache.delete(DISCOVERIES_ACTIVE_KEY);
    await this.cache.delete(DISCOVERIES_ALL_KEY);
  }

  async runBatchHealthCheck() {
    const rows = await this.db
      .select()
      .from(discoveries)
      .where(
        or(
          eq(discoveries.status, 'active'),
          eq(discoveries.status, 'pending'),
          eq(discoveries.status, 'unreachable'),
        ),
      );

    for (const row of rows) {
      await this.runSingleHealthCheck(row.id);
    }
  }

  async findStalePendingLinks(limit = 2) {
    const rows = await this.db
      .select()
      .from(discoveries)
      .where(eq(discoveries.status, 'pending'))
      .orderBy(asc(discoveries.lastCheckedAt))
      .limit(limit);
    return rows;
  }
}

export default DiscoverService;
