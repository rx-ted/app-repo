import { Inject, Service } from '@rx-ted/packages-honest';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { env } from '@rx-ted/packages-core';
import * as schema from '@/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { parsePostMeta } from '@/lib/post-parser';
import { hashPassword } from '@/modules/auth/auth.utils';

import {
  tags as tagsData,
  permissions as permissionsData,
  roles as rolesData,
  categories as categoriesData,
  discoveries as discoveriesData,
} from '@/seed-data';

import type {
  PermissionSeed,
  RoleSeed,
  TagSeed,
  CategorySeed,
  DiscoverySeed,
  DocSeed,
} from '@/seed-data';

export interface InitResult {
  module: string;
  status: string;
  error?: string;
}

const SEED_HASH_KEY = 'seed_hash';
const SYSTEM_USER_ID = `system_${bytesToHex(sha256(new TextEncoder().encode('system'))).slice(0, 32)}`;
const SYSTEM_USERNAME = 'system';
const SYSTEM_PASSWORD = 'system_init_2024';

let _docsData: DocSeed[] | null = null;

async function loadDocs(): Promise<DocSeed[]> {
  if (_docsData) return _docsData;
  try {
    const mod = await import('@/seed-data/import-docs-output.json', { with: { type: 'json' } });
    _docsData = ((mod as any).default ?? mod) as DocSeed[];
    if (!Array.isArray(_docsData)) _docsData = [];
  } catch {
    _docsData = [];
  }
  return _docsData;
}

@Service()
class SystemInitService {
  constructor(@Inject(DbService) private db: DbService) {}

  private readonly modules: Record<string, () => Promise<void>> = {
    schema: () => this.ensureSchema(),
    indexes: () => this.ensureIndexes(),
    permissions: () => this.runPermissions(),
    roles: () => this.runRoles(),
    system_user: () => this.ensureSystemUser(),
    seed_content: () => this.runSeedContent(),
    seed_discoveries: () => this.runSeedDiscoveries(),
    seed_posts: () => this.runSeedPosts(),
  };

  private async computeSeedHash(): Promise<string> {
    const docs = await loadDocs();
    return bytesToHex(
      sha256(
        new TextEncoder().encode(
          JSON.stringify({
            permissions: permissionsData,
            roles: rolesData,
            tags: tagsData,
            categories: categoriesData,
            discoveries: discoveriesData,
            docs: docs.map((d) => ({ slug: d.slug, doc_hash: d.doc_hash })),
          }),
        ),
      ),
    );
  }

  private async getStoredHash(): Promise<string | null> {
    const [row] = await this.db
      .select({ value: schema.systemMeta.value })
      .from(schema.systemMeta)
      .where(eq(schema.systemMeta.key, SEED_HASH_KEY))
      .limit(1);
    return row?.value ?? null;
  }

  private async storeHash(hash: string): Promise<void> {
    const now = new Date();
    await this.db
      .insert(schema.systemMeta)
      .values({ key: SEED_HASH_KEY, value: hash, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: schema.systemMeta.key, set: { value: hash, updatedAt: now } });
  }

  async runAllIfNeeded(): Promise<InitResult[]> {
    const currentHash = await this.computeSeedHash();
    const storedHash = await this.getStoredHash();

    logger.info(
      `[seed] match=${storedHash === currentHash}\nstoredHash=${storedHash ?? '(none)'}\ncurrentHash=${currentHash}`,
    );

    if (storedHash === currentHash) {
      return [];
    }

    const results = await this.runAll();
    const allOk = results.every((r) => r.status === 'ok');

    if (allOk) {
      await this.storeHash(currentHash);
    }

    return results;
  }

  async runAll(): Promise<InitResult[]> {
    const results: InitResult[] = [];
    for (const [name, run] of Object.entries(this.modules)) {
      try {
        await run();
        results.push({ module: name, status: 'ok' });
      } catch (err) {
        const detailed =
          err instanceof Error
            ? `${err.message}\n${err.stack ?? ''}${err.cause ? `\ncause: ${err.cause}` : ''}`
            : String(err);
        const simple = err instanceof Error ? err.message : String(err);
        logger.error(`[seed] ${name} failed: ${detailed}`);
        results.push({ module: name, status: 'failed', error: env.DEBUG ? detailed : simple });
      }
    }
    return results;
  }

  async runModule(name: string): Promise<InitResult> {
    const run = this.modules[name];
    if (!run) {
      return { module: name, status: 'failed', error: `Init module "${name}" not found` };
    }
    try {
      await run();
      return { module: name, status: 'ok' };
    } catch (err) {
      const detailed =
        err instanceof Error
          ? `${err.message}\n${err.stack ?? ''}${err.cause ? `\ncause: ${err.cause}` : ''}`
          : String(err);
      const simple = err instanceof Error ? err.message : String(err);
      logger.error(`[seed] ${name} failed: ${detailed}`);
      return { module: name, status: 'failed', error: env.DEBUG ? detailed : simple };
    }
  }

  private async runPermissions(): Promise<void> {
    const existing = await this.db.select().from(schema.permissions);
    const existingKeys = new Set(existing.map((p) => `${p.resource}:${p.action}:${p.scope}`));

    for (const perm of permissionsData as unknown as PermissionSeed[]) {
      if (!existingKeys.has(`${perm.resource}:${perm.action}:${perm.scope}`)) {
        await this.db
          .insert(schema.permissions)
          .values({ ...perm, createdAt: new Date(), updatedAt: new Date() });
      }
    }
  }

  private async runRoles(): Promise<void> {
    const roles = rolesData as unknown as RoleSeed[];
    const existingRoles = await this.db.select().from(schema.roles);
    const existingNames = new Set(existingRoles.map((r) => r.name));

    for (const role of roles) {
      if (!existingNames.has(role.name)) {
        await this.db.insert(schema.roles).values({
          name: role.name,
          description: role.description,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    const adminRole = await this.db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.name, 'admin'))
      .limit(1);

    const userRole = await this.db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.name, 'user'))
      .limit(1);

    const systemRole = await this.db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.name, 'system'))
      .limit(1);

    const existingMappings = await this.db.select().from(schema.rolePermissionMappings);
    const mappingKeys = new Set(existingMappings.map((m) => `${m.roleId}:${m.permissionId}`));
    const allPermissions = await this.db.select().from(schema.permissions);

    // system — all permissions
    if (systemRole[0]) {
      for (const perm of allPermissions) {
        const key = `${systemRole[0].id}:${perm.id}`;
        if (!mappingKeys.has(key)) {
          await this.db
            .insert(schema.rolePermissionMappings)
            .values({ roleId: systemRole[0].id, permissionId: perm.id });
        }
      }
    }

    // admin — all permissions
    if (adminRole[0]) {
      for (const perm of allPermissions) {
        const key = `${adminRole[0].id}:${perm.id}`;
        if (!mappingKeys.has(key)) {
          await this.db
            .insert(schema.rolePermissionMappings)
            .values({ roleId: adminRole[0].id, permissionId: perm.id });
        }
      }
    }

    // user — post only
    if (userRole[0]) {
      const userPermissions = allPermissions.filter((p) => p.resource === 'post');
      for (const perm of userPermissions) {
        const key = `${userRole[0].id}:${perm.id}`;
        if (!mappingKeys.has(key)) {
          await this.db
            .insert(schema.rolePermissionMappings)
            .values({ roleId: userRole[0].id, permissionId: perm.id });
        }
      }
    }
  }

  private async ensureSystemUser(): Promise<void> {
    const [existing] = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, SYSTEM_USER_ID))
      .limit(1);

    if (existing) return;

    const now = new Date();
    const passwordHash = await hashPassword(SYSTEM_PASSWORD);

    await this.db.insert(schema.users).values({
      id: SYSTEM_USER_ID,
      username: SYSTEM_USERNAME,
      loginType: 'password',
      passwordHash,
      email: null,
      preferredLocale: 'zh-CN',
      status: 'NORMAL',
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    });

    await this.db.insert(schema.userProfiles).values({
      userId: SYSTEM_USER_ID,
      nickname: 'System',
      gender: 'Unknown',
      updatedAt: now,
    });

    logger.info(`[seed] system user created: ${SYSTEM_USER_ID}`);
  }

  private async ensureSchema(): Promise<void> {
    const migrations = [`ALTER TABLE "postCore" ADD COLUMN "reading_time" INTEGER DEFAULT 1`];
    const d1 = (this.db as any).$client;
    for (const sql of migrations) {
      try {
        if (typeof d1.prepare === 'function') {
          await d1.prepare(sql).run();
        } else {
          await (this.db as any).run(sql);
        }
      } catch {
        // column may already exist — skip silently
      }
    }
  }

  private async ensureIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS ptm_tag_id_idx ON post_tag_mappings (tag_id)',
      'CREATE INDEX IF NOT EXISTS ptm_post_id_idx ON post_tag_mappings (post_id)',
      'CREATE INDEX IF NOT EXISTS pcm_category_id_idx ON post_category_mappings (category_id)',
      'CREATE INDEX IF NOT EXISTS pcm_post_id_idx ON post_category_mappings (post_id)',
      'CREATE UNIQUE INDEX IF NOT EXISTS ptm_composite_idx ON post_tag_mappings (post_id, tag_id)',
      'CREATE UNIQUE INDEX IF NOT EXISTS pcm_composite_idx ON post_category_mappings (post_id, category_id)',
    ];
    const d1 = (this.db as any).$client;
    for (const sql of indexes) {
      try {
        if (typeof d1.prepare === 'function') {
          await d1.prepare(sql).run();
        } else {
          await (this.db as any).run(sql);
        }
      } catch {
        // index may already exist or table not yet created — skip silently
      }
    }
  }

  private async runSeedContent(): Promise<void> {
    const tags = tagsData as unknown as TagSeed[];
    const categories = categoriesData as unknown as CategorySeed[];

    const existingTags = await this.db
      .select({ id: schema.postTags.id, slug: schema.postTags.slug })
      .from(schema.postTags);
    const tagsBySlug = new Map(existingTags.map((t) => [t.slug, t.id]));

    for (const tag of tags) {
      const existingId = tagsBySlug.get(tag.slug);
      if (existingId !== undefined) {
        await this.db
          .update(schema.postTags)
          .set({ name: tag.name, updatedAt: new Date() })
          .where(eq(schema.postTags.id, existingId));
      } else {
        await this.db.insert(schema.postTags).values({
          name: tag.name,
          slug: tag.slug,
          usageCount: 0,
          createdBy: SYSTEM_USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    const existingCategories = await this.db
      .select({ id: schema.postCategories.id, slug: schema.postCategories.slug })
      .from(schema.postCategories);
    const catsBySlug = new Map(existingCategories.map((c) => [c.slug, c.id]));

    for (const cat of categories) {
      const existingId = catsBySlug.get(cat.slug);
      if (existingId !== undefined) {
        await this.db
          .update(schema.postCategories)
          .set({ name: cat.name, description: cat.description ?? null, updatedAt: new Date() })
          .where(eq(schema.postCategories.id, existingId));
      } else {
        await this.db.insert(schema.postCategories).values({
          name: cat.name,
          slug: cat.slug,
          description: cat.description ?? null,
          postCount: 0,
          createdBy: SYSTEM_USER_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  private async runSeedDiscoveries(): Promise<void> {
    const data = discoveriesData as unknown as DiscoverySeed[];
    logger.info('[seed] seed_discoveries start');

    for (const link of data) {
      const existing = await this.db
        .select({ id: schema.discoveries.id })
        .from(schema.discoveries)
        .where(and(eq(schema.discoveries.name, link.name), isNull(schema.discoveries.email)))
        .limit(1);

      if (existing.length > 0) {
        await this.db
          .update(schema.discoveries)
          .set({
            url: link.url,
            logo: link.logo,
            description: link.description,
            category: link.category,
            status: link.status,
            sortOrder: link.sortOrder,
            updatedAt: new Date(),
          })
          .where(eq(schema.discoveries.id, existing[0].id));
      } else {
        await this.db.insert(schema.discoveries).values({
          name: link.name,
          url: link.url,
          logo: link.logo,
          description: link.description,
          category: link.category,
          status: link.status,
          sortOrder: link.sortOrder,
          email: null,
          failCount: 0,
          lastCheckedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    logger.info('[seed] seed_discoveries ok');
  }

  private async writeAudit(
    action: string,
    targetType: string,
    targetId: string,
    status: 'SUCCESS' | 'FAILED',
    message?: string,
  ): Promise<void> {
    await this.db.insert(schema.auditLogs).values({
      actorId: SYSTEM_USER_ID,
      actorRole: 'system',
      action,
      targetType,
      targetId,
      status,
      message: message ?? null,
      meta: null,
      createdAt: new Date(),
    });
  }

  private async lookupCategoryId(slug: string): Promise<number | null> {
    const [row] = await this.db
      .select({ id: schema.postCategories.id })
      .from(schema.postCategories)
      .where(eq(schema.postCategories.slug, slug))
      .limit(1);
    return row?.id ?? null;
  }

  private async lookupTagIds(slugs: string[]): Promise<number[]> {
    if (slugs.length === 0) return [];
    const rows = await this.db
      .select({ id: schema.postTags.id, slug: schema.postTags.slug })
      .from(schema.postTags);
    const bySlug = new Map(rows.map((r) => [r.slug, r.id]));
    return slugs.map((s) => bySlug.get(s)).filter((id): id is number => id != null);
  }

  private async runSeedPosts(): Promise<void> {
    const docs = await loadDocs();
    if (docs.length === 0) {
      logger.warn(
        '[seed] seed_posts: docs not available (import-docs-output.json empty or missing)',
      );
      return;
    }

    logger.info(`[seed] seed_posts: ${docs.length} docs to process`);
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const doc of docs) {
      logger.info(`[seed:debug] processing ${doc.slug}...`);
      const existing = await this.db
        .select({ id: schema.postCore.id, slug: schema.postCore.slug })
        .from(schema.postCore)
        .where(eq(schema.postCore.slug, doc.slug))
        .limit(1);

      logger.info(`[seed:debug] parsing ${doc.slug}...`);
      const { data: fm } = parsePostMeta(doc.content_md);
      const categorySlug = fm.category ?? null;
      const tagSlugs = Array.isArray(fm.tags) ? fm.tags.map(String) : [];

      if (existing.length === 0) {
        const docDate = fm.date ? new Date(fm.date) : new Date();
        logger.info(`[seed:debug] inserting postCore for ${doc.slug}...`);
        await this.db.insert(schema.postCore).values({
          userId: SYSTEM_USER_ID,
          slug: doc.slug,
          title: doc.title,
          contentMd: doc.content_md,
          contentHtml: null,
          coverImage: null,
          isPinned: doc.is_pinned ?? false,
          featuredWeight: doc.featured_weight ?? 0,
          status: (doc.status as 'draft' | 'published' | 'archived') ?? 'published',
          visibility: (doc.visibility as 'public' | 'private' | 'password') ?? 'public',
          readingTime: Math.max(1, Math.ceil(doc.content_md.length / 1000)),
          allowComment: doc.allow_comment ?? true,
          publishedAt: doc.status === 'published' ? docDate : null,
          createdAt: docDate,
          updatedAt: docDate,
          createdBy: SYSTEM_USER_ID,
          updatedBy: SYSTEM_USER_ID,
        });

        logger.info(`[seed:debug] selecting inserted post for ${doc.slug}...`);
        const [inserted] = await this.db
          .select({ id: schema.postCore.id })
          .from(schema.postCore)
          .where(eq(schema.postCore.slug, doc.slug))
          .limit(1);

        if (inserted) {
          const postId = Number(inserted.id);
          logger.info(`[seed:debug] inserting postContent for ${doc.slug} (postId=${postId})...`);
          await this.db.insert(schema.postContent).values({
            postId,
            contentMd: doc.content_md,
            contentHtml: null,
          });
          logger.info(`[seed:debug] inserting postStats for ${doc.slug}...`);
          await this.db.insert(schema.postStats).values({
            postId,
            viewCount: 0,
            likeCount: 0,
            commentCount: 0,
          });

          // category / tag mappings
          if (categorySlug) {
            const catId = await this.lookupCategoryId(categorySlug);
            if (catId) {
              await this.db
                .insert(schema.postCategoryMappings)
                .values({ postId, categoryId: catId });
            }
          }
          const tagIds = await this.lookupTagIds(tagSlugs);
          if (tagIds.length > 0) {
            await this.db
              .insert(schema.postTagMappings)
              .values(tagIds.map((tagId) => ({ postId, tagId })));
          }

          await this.writeAudit('CREATE', 'post', String(postId), 'SUCCESS', `seed: ${doc.slug}`);
        }
        created++;
        logger.info(`  [seed] ${doc.slug} → CREATE`);
      } else {
        const existingContent = await this.db
          .select({ contentMd: schema.postCore.contentMd })
          .from(schema.postCore)
          .where(eq(schema.postCore.slug, doc.slug))
          .limit(1);

        const storedHash = existingContent[0]?.contentMd?.match(
          /^---[\s\S]*?\ndoc_hash:\s*(\S+)/m,
        )?.[1];

        if (storedHash === doc.doc_hash) {
          skipped++;
          continue;
        }

        const postId = Number(existing[0].id);
        await this.db
          .update(schema.postCore)
          .set({
            title: doc.title,
            contentMd: doc.content_md,
            coverImage: null,
            isPinned: doc.is_pinned ?? false,
            featuredWeight: doc.featured_weight ?? 0,
            status: (doc.status as 'draft' | 'published' | 'archived') ?? 'published',
            visibility: (doc.visibility as 'public' | 'private' | 'password') ?? 'public',
            allowComment: doc.allow_comment ?? true,
            readingTime: Math.max(1, Math.ceil(doc.content_md.length / 1000)),
            updatedAt: new Date(),
          })
          .where(eq(schema.postCore.slug, doc.slug));

        await this.db
          .update(schema.postContent)
          .set({ contentMd: doc.content_md, contentHtml: null })
          .where(eq(schema.postContent.postId, postId));

        // update category / tag mappings
        await this.db
          .delete(schema.postCategoryMappings)
          .where(eq(schema.postCategoryMappings.postId, postId));
        if (categorySlug) {
          const catId = await this.lookupCategoryId(categorySlug);
          if (catId) {
            await this.db.insert(schema.postCategoryMappings).values({ postId, categoryId: catId });
          }
        }
        await this.db
          .delete(schema.postTagMappings)
          .where(eq(schema.postTagMappings.postId, postId));
        const tagIds = await this.lookupTagIds(tagSlugs);
        if (tagIds.length > 0) {
          await this.db
            .insert(schema.postTagMappings)
            .values(tagIds.map((tagId) => ({ postId, tagId })));
        }

        await this.writeAudit('UPDATE', 'post', String(postId), 'SUCCESS', `seed: ${doc.slug}`);
        updated++;
        logger.info(`  [seed] ${doc.slug} → UPDATE`);
      }
    }

    logger.info(`[seed] seed_posts: ${created} created, ${updated} updated, ${skipped} skipped`);
  }
}

export default SystemInitService;
