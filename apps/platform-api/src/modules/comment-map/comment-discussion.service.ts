import { Inject, Service } from '@rx-ted/packages-honest';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { postDiscussionMaps } from '@/schema';
import { eq, and } from 'drizzle-orm';
import GitHubService from '@/modules/github/github.service';

@Service()
class CommentDiscussionService {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(GitHubService) private github?: GitHubService,
  ) {}

  private guestbookSlug(): string {
    return 'guestbook';
  }

  private normalizeScope(scope?: string): string {
    return scope && ['post', 'guestbook', 'discover', 'about'].includes(scope) ? scope : 'post';
  }

  private normalizeSlug(scope: string, slug?: string): string {
    if (scope === 'guestbook') return this.guestbookSlug();
    return (slug ?? '').trim();
  }

  async resolve(scopeRaw?: string, slugRaw?: string): Promise<any> {
    const scope = this.normalizeScope(scopeRaw);
    const slug = this.normalizeSlug(scope, slugRaw);
    if (!slug) {
      return { status: 'not_initialized', discussionNumber: null, discussionUrl: null };
    }

    const rows = await this.db
      .select()
      .from(postDiscussionMaps)
      .where(and(eq(postDiscussionMaps.scope, scope as any), eq(postDiscussionMaps.postSlug, slug)))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return { status: 'not_initialized', discussionNumber: null, discussionUrl: null };
    }
    if (row.status === 'archived') {
      return {
        status: 'disabled',
        discussionNumber: null,
        discussionUrl: row.discussionUrl ?? null,
      };
    }
    if (row.status !== 'active') {
      return {
        status: row.status === 'failed' ? 'temporarily_unavailable' : 'pending',
        discussionNumber: row.discussionNumber,
        discussionUrl: row.discussionUrl ?? null,
      };
    }
    return {
      status: 'active',
      discussionNumber: row.discussionNumber,
      discussionUrl: row.discussionUrl ?? null,
    };
  }

  async createMapping(input: {
    scope?: string;
    postSlug: string;
    postId?: number | null;
    githubOwner: string;
    githubRepo: string;
    discussionNumber: number;
    discussionNodeId?: string | null;
    discussionUrl?: string | null;
    categorySlug?: string | null;
    status?: 'pending' | 'active' | 'failed' | 'archived';
  }): Promise<any> {
    const scope = this.normalizeScope(input.scope);
    const slug = this.normalizeSlug(scope, input.postSlug);
    const now = new Date();
    const result = await this.db.insert(postDiscussionMaps).values({
      postId: input.postId ?? null,
      postSlug: slug,
      githubOwner: input.githubOwner,
      githubRepo: input.githubRepo,
      discussionNumber: input.discussionNumber,
      discussionNodeId: input.discussionNodeId ?? null,
      discussionUrl: input.discussionUrl ?? null,
      categorySlug: input.categorySlug ?? null,
      scope,
      status: input.status ?? 'active',
      createdAt: now,
      updatedAt: now,
    });
    return { id: Number((result as any).insertId ?? (result as any).lastInsertRowid ?? 0) };
  }

  async updateMapping(id: number, input: Record<string, unknown>): Promise<void> {
    const allowed = new Set([
      'postSlug',
      'githubOwner',
      'githubRepo',
      'discussionNumber',
      'discussionNodeId',
      'discussionUrl',
      'categorySlug',
      'scope',
      'status',
    ]);
    const values: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(input)) {
      if (allowed.has(k) && v !== undefined) values[k] = v;
    }
    await this.db.update(postDiscussionMaps).set(values).where(eq(postDiscussionMaps.id, id));
  }

  async deleteMapping(id: number): Promise<void> {
    await this.db.delete(postDiscussionMaps).where(eq(postDiscussionMaps.id, id));
  }

  async ensureMapping(input: {
    scope?: string;
    slug?: string;
    postTitle: string;
    blogUrl: string;
    githubOwner: string;
    githubRepo: string;
    categoryId?: string;
    categorySlug?: string;
  }): Promise<any> {
    const scope = this.normalizeScope(input.scope);
    const slug = this.normalizeSlug(scope, input.slug);
    if (!slug) throw new Error('slug is required');
    if (!this.github) throw new Error('github service unavailable');

    const existing = (
      await this.db
        .select()
        .from(postDiscussionMaps)
        .where(
          and(eq(postDiscussionMaps.scope, scope as any), eq(postDiscussionMaps.postSlug, slug)),
        )
        .limit(1)
    )[0];
    if (existing) {
      return {
        status: existing.status as any,
        discussionNumber: existing.discussionNumber,
        discussionUrl: existing.discussionUrl ?? null,
        created: false,
      };
    }

    const created = await this.github.createDiscussion(
      input.githubOwner,
      input.githubOwner,
      input.githubRepo,
      input.postTitle,
      '',
      input.categoryId,
      input.categorySlug,
      input.blogUrl,
      input.postTitle,
      slug,
    );

    const mapping = await this.createMapping({
      scope,
      postSlug: slug,
      githubOwner: input.githubOwner,
      githubRepo: input.githubRepo,
      discussionNumber: created.number,
      discussionNodeId: undefined,
      discussionUrl: created.url,
      categorySlug: input.categorySlug ?? null,
      status: 'active',
    });

    return {
      status: 'active',
      discussionNumber: created.number,
      discussionUrl: created.url,
      created: true,
      id: mapping.id,
    };
  }
}

export default CommentDiscussionService;
