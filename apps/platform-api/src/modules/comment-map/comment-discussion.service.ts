import { Inject, Service } from '@rx-ted/packages-honest';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { postDiscussionMaps, postCore } from '@/schema';
import { eq, and } from 'drizzle-orm';
import { env } from '@rx-ted/packages-core';
import { envParams } from '@/constants/env';

@Service()
class CommentDiscussionService {
  constructor(@Inject(DbService) private db: DbService) {}

  private guestbookSlug(): string {
    return 'guestbook';
  }

  private normalizeScope(scope?: string): string {
    return scope && ['post', 'guestbook', 'discover', 'about'].includes(scope) ? scope : 'post';
  }

  private normalizeSlug(scope: string, slug?: string): string {
    if (scope === 'guestbook') return this.guestbookSlug();
    if (scope === 'discover') return (slug ?? 'discover').trim() || 'discover';
    if (scope === 'about') return (slug ?? 'about').trim() || 'about';
    return (slug ?? '').trim();
  }

  async ensureForScope(scopeRaw?: string, slugRaw?: string): Promise<any> {
    const scope = this.normalizeScope(scopeRaw);
    const slug = this.normalizeSlug(scope, slugRaw);
    if (!slug) {
      return { status: 'not_initialized', discussionNumber: null, discussionUrl: null };
    }

    const existing = (
      await this.db
        .select()
        .from(postDiscussionMaps)
        .where(and(eq(postDiscussionMaps.scope, scope as any), eq(postDiscussionMaps.postSlug, slug)))
        .limit(1)
    )[0];
    if (existing) {
      return {
        status: existing.status === 'active' ? 'active' : (existing.status === 'archived' ? 'disabled' : 'pending'),
        discussionNumber: existing.discussionNumber,
        discussionUrl: existing.discussionUrl ?? null,
        created: false,
      };
    }

    let title = slug;
    if (scope === 'post') {
      const posts = await this.db.select().from(postCore).where(eq(postCore.slug, slug)).limit(1);
      const post = posts[0];
      if (!post) {
        return { status: 'not_initialized', discussionNumber: null, discussionUrl: null };
      }
      title = String(post.title ?? slug);
    } else if (scope === 'guestbook') {
      title = 'Guestbook';
    } else if (scope === 'discover') {
      title = 'Discover';
    } else if (scope === 'about') {
      title = 'About';
    }

    const owner = env.var('GITHUB_REPO_OWNER', 'rx-ted');
    const repo = env.var('GITHUB_REPO_NAME', 'app-repo');
    const blogUrl = scope === 'post'
      ? `https://${envParams.FRONTEND_DOMAIN}/posts/${slug}`
      : `https://${envParams.FRONTEND_DOMAIN}/${slug === 'guestbook' ? 'guestbook' : slug}`;
    try {
      const ensured = await this.ensureMapping({
        scope,
        slug,
        postTitle: title,
        blogUrl,
        githubOwner: owner,
        githubRepo: repo,
        categorySlug: 'general',
      });
      return {
        ...ensured,
        status: 'active',
      };
    } catch (error) {
      console.error('[comment-discussion] auto ensure failed', error);
      return {
        status: 'temporarily_unavailable',
        discussionNumber: null,
        discussionUrl: null,
      };
    }
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

    const baseUrl = (env.var('GITHUB_API_BASE_URL', 'http://localhost:3001/api/v1') ?? '')
      .trim()
      .replace(/\/$/, '');
    const createdRes = await fetch(`${baseUrl}/github/discussions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Username': input.githubOwner,
      },
      body: JSON.stringify({
        owner: input.githubOwner,
        repo: input.githubRepo,
        title: input.postTitle,
        body: '',
        categoryId: input.categoryId,
        categorySlug: input.categorySlug,
        blogUrl: input.blogUrl,
        postTitle: input.postTitle,
        slug,
      }),
    });
    if (!createdRes.ok) {
      throw new Error(`github-api create discussion failed: ${createdRes.status}`);
    }
    const created = (await createdRes.json()) as { number: number; url: string };

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
