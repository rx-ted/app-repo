import { Inject, Service } from '@rx-ted/packages-honest';
import { eq, desc, count } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';
import { computeOffset } from '@/common/utils/pagination';
import { postCore, postStats, users, postTags, postTagMappings, userProfiles } from '@/schema';
import type { BlogAuthorResponse } from '@/modules/blog/dtos/blog.response.dto';
import { BlogMapper } from '@/modules/blog/mappers/blog.mapper';

@Service()
export class AuthorService {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  async getByUsername(username: string): Promise<BlogAuthorResponse | null> {
    return this.getAuthor(username);
  }

  async getAuthor(
    username: string,
    page = 1,
    pageSize = 12,
    _tag?: string,
  ): Promise<BlogAuthorResponse | null> {
    return cacheable(this.cache, `blog:author:${username}:${page}`, 120, async () => {
      const [author] = await this.db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      if (!author) return null;

      const [profile] = await this.db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, author.id))
        .limit(1);

      const postRows: any[] = await this.db
        .select()
        .from(postCore)
        .leftJoin(postStats, eq(postCore.id, postStats.postId))
        .where(eq(postCore.userId, author.id))
        .orderBy(desc(postCore.createdAt))
        .limit(pageSize)
        .offset(computeOffset({ page, pageSize }));

      const [totalResult] = await this.db
        .select({ total: count() })
        .from(postCore)
        .where(eq(postCore.userId, author.id));

      const authorTagRows = await this.db
        .select({ name: postTags.name })
        .from(postTags)
        .innerJoin(postTagMappings, eq(postTags.id, postTagMappings.tagId))
        .innerJoin(postCore, eq(postCore.id, postTagMappings.postId))
        .where(eq(postCore.userId, author.id))
        .groupBy(postTags.name);

      return {
        author: {
          id: author.id,
          username: author.username,
          created_at: author.createdAt.toISOString(),
          last_login_at: author.lastLoginAt?.toISOString() ?? null,
          nickname: profile?.nickname ?? null,
          avatar_url: profile?.avatarUrl ?? null,
          bio: profile?.bio ?? null,
          website: profile?.website ?? null,
          location: profile?.location ?? null,
        },
        posts: {
          list: await BlogMapper.enrichPostsWithTaxonomy(
            this.db,
            postRows.map((r) => BlogMapper.mapPostRow(r.postCore, author, r.postStats)),
          ),
          total: totalResult.total,
          page,
          pageSize,
          tags: authorTagRows.map((t) => t.name),
          activeTag: null,
        },
      };
    });
  }
}
