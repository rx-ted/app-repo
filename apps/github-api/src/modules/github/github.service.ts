import { Inject, Service } from '@rx-ted/packages-honest';
import { CacheService } from '@rx-ted/packages-honest-plugins/cache';
import { env } from '@rx-ted/packages-core';
import { envParams } from '@/constants/env';
import { HTTPException } from 'hono/http-exception';

interface GitHubTokenRecord {
  accessToken: string;
  tokenType: string;
  githubUserId: number;
  login: string;
  scope: string;
  expiresAt: string;
  refreshToken?: string;
  createdAt: string;
}

const ENCRYPTION_KEY_ENV = 'GITHUB_TOKEN_ENCRYPTION_KEY';
const ALLOWED_REPOS_ENV = 'GITHUB_ALLOWED_REPOS';
const API_VERSION = '2022-11-28';

@Service()
export class GitHubService {
  constructor(@Inject(CacheService) private cache: CacheService) {}

  private normalizeLogin(login: string): string {
    return login.trim().toLowerCase();
  }

  private tokenKey(username: string): string {
    return `github:${this.normalizeLogin(username)}`;
  }

  private stateKey(state: string): string {
    return `github:oauth:state:${state}`;
  }

  private getAllowedRepos(): Set<string> {
    const raw = env.var(ALLOWED_REPOS_ENV, '');
    return new Set(
      raw
        .split(',')
        .map((repo) => repo.trim())
        .filter(Boolean),
    );
  }

  private async deriveKey(secret: string): Promise<CryptoKey> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
    return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }

  private async encryptToken(plain: string): Promise<string> {
    const secret = env.var(ENCRYPTION_KEY_ENV);
    if (!secret) return plain;
    const key = await this.deriveKey(secret);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
    const bytes = new Uint8Array(encrypted);
    return `enc:${btoa(String.fromCharCode(...iv))}:${btoa(String.fromCharCode(...bytes))}`;
  }

  private async decryptToken(stored: string): Promise<string> {
    if (!stored.startsWith('enc:')) return stored;
    const secret = env.var(ENCRYPTION_KEY_ENV);
    if (!secret) throw new Error('Encrypted token but no encryption key configured');
    const [, ivBase64, dataBase64] = stored.split(':');
    const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
    const data = Uint8Array.from(atob(dataBase64), (c) => c.charCodeAt(0));
    const key = await this.deriveKey(secret);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  }

  private resolveFrontend(frontend?: string, source?: string): string {
    const fallback = envParams.FRONTEND_DOMAIN;
    const allowed = envParams.FRONTEND_ALLOWED_ORIGINS;
    const candidate = (frontend && frontend.trim()) || (source === 'github' ? 'github.19981204.xyz' : fallback);
    const normalize = (value: string) => {
      try {
        return new URL(value.includes('://') ? value : `https://${value}`).origin;
      } catch {
        return '';
      }
    };
    const normalizedCandidate = normalize(candidate);
    if (!normalizedCandidate) return fallback;
    const normalizedAllowed = allowed
      .map((origin) => normalize(origin))
      .filter(Boolean);
    return normalizedAllowed.includes(normalizedCandidate) ? normalizedCandidate.replace(/^https?:\/\//, '') : fallback;
  }

  async getAuthUrl(
    clientId: string,
    redirectUri: string,
    username?: string,
    source: string = 'github',
    redirect: string = '/',
    frontend?: string,
    sessionId?: string,
  ): Promise<{ url: string; state: string; source: string; redirect: string; frontend: string }> {
    const state = crypto.randomUUID();
    const resolvedFrontend = this.resolveFrontend(frontend, source);
    // Persist state before returning the authorization URL.
    await this.cache.set(this.stateKey(state), { username, sessionId, source, redirect, frontend: resolvedFrontend }, 600);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'repo user:email read:user',
      state,
    });
    return {
      url: `https://github.com/login/oauth/authorize?${params.toString()}`,
      state,
      source,
      redirect,
      frontend: resolvedFrontend,
    };
  }

  async handleCallback(code: string, state: string): Promise<{
    login: string;
    githubUserId: number;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
    source: string;
    redirect: string;
    frontend: string;
    sessionId: string | null;
    stored: boolean;
  }> {
    const stateRecord = await this.cache.get<{ username?: string; sessionId?: string; source?: string; redirect?: string; frontend?: string }>(this.stateKey(state));
    await this.cache.delete(this.stateKey(state));
    if (!stateRecord) {
      throw new HTTPException(400, { message: 'invalid_state' });
    }
    const username = stateRecord.username;
    const sessionId = stateRecord.sessionId;
    const source = stateRecord.source ?? 'github';
    const redirect = stateRecord.redirect ?? '/';
    const frontend = stateRecord.frontend ?? envParams.FRONTEND_DOMAIN;

    const clientId = env.require('GITHUB_CLIENT_ID');
    const clientSecret = env.var('GITHUB_CLIENT_SECRET') ?? env.var('GITHUB_SECRET');
    if (!clientSecret) throw new HTTPException(500, { message: 'github_not_configured' });

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    if (!tokenRes.ok) throw new HTTPException(502, { message: 'github_unavailable' });
    const tokenJson = await tokenRes.json() as any;
    if (tokenJson.error || !tokenJson.access_token) {
      throw new HTTPException(401, { message: 'github_reauth_required' });
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'rx-ted-app-repo',
        'X-GitHub-Api-Version': API_VERSION,
      },
    });
    if (!userRes.ok) throw new HTTPException(502, { message: 'github_unavailable' });
    const githubUser = await userRes.json() as any;
    const login = String(githubUser.login);

    const expiresIn = Number(tokenJson.expires_in ?? 8 * 60 * 60);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const record: GitHubTokenRecord = {
      accessToken: await this.encryptToken(tokenJson.access_token),
      tokenType: tokenJson.token_type ?? 'bearer',
      githubUserId: githubUser.id,
      login,
      scope: tokenJson.scope ?? '',
      expiresAt,
      refreshToken: tokenJson.refresh_token ? await this.encryptToken(tokenJson.refresh_token) : undefined,
      createdAt: new Date().toISOString(),
    };

    const toStringKey = (value: string): string => this.tokenKey(value);
    await this.cache.set(this.tokenKey(login), record, expiresIn);
    if (username && this.normalizeLogin(username) !== this.normalizeLogin(login)) {
      await this.cache.set(toStringKey(username), record, expiresIn);
    }
    if (sessionId) {
      const existingSession = await this.cache.get<any>(`session:${sessionId}`);
      const now = new Date();
      const tokenExpiryMs = new Date(record.expiresAt).getTime();
      const sessionExpiryMs = tokenExpiryMs + 10 * 60 * 1000;
      const sessionRecord = {
        ...(existingSession || {}),
        sessionId,
        platformUsername: username ?? existingSession?.platformUsername,
        githubLogin: login,
        githubTokenKey: this.tokenKey(login),
        source,
        frontend,
        redirect,
        createdAt: existingSession?.createdAt ?? now.toISOString(),
        lastActiveAt: now.toISOString(),
        expiresAt: new Date(sessionExpiryMs).toISOString(),
      };
      const ttlSeconds = Math.max(60, Math.floor((sessionExpiryMs - Date.now()) / 1000));
      await this.cache.set(`session:${sessionId}`, sessionRecord, ttlSeconds);
    }

    return {
      login,
      githubUserId: githubUser.id,
      name: typeof githubUser.name === 'string' ? githubUser.name : null,
      email: typeof githubUser.email === 'string' ? githubUser.email : null,
      avatarUrl: typeof githubUser.avatar_url === 'string' ? githubUser.avatar_url : null,
      source,
      redirect,
      frontend,
      sessionId: sessionId ?? null,
      stored: true,
    };
  }

  async getToken(ownerOrUsername: string): Promise<GitHubTokenRecord | null> {
    const record = await this.cache.get<GitHubTokenRecord>(this.tokenKey(ownerOrUsername));
    if (!record) return null;
    record.accessToken = await this.decryptToken(record.accessToken);
    if (record.refreshToken) record.refreshToken = await this.decryptToken(record.refreshToken);
    return record;
  }

  async invalidateToken(username: string): Promise<void> {
    await this.cache.delete(this.tokenKey(username));
  }

  private headers(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'rx-ted-app-repo',
      'X-GitHub-Api-Version': API_VERSION,
    };
  }

  private allowedRepoCheck(owner: string, repo: string): void {
    const allowed = this.getAllowedRepos();
    if (allowed.size === 0) return;
    if (!allowed.has(`${owner}/${repo}`)) {
      throw new HTTPException(403, { message: 'forbidden_repo' });
    }
  }

  private normalizePath(path: string): string {
    const normalized = path.replace(/^\/+/, '').replace(/\\/g, '/');
    if (!normalized || normalized.includes('..') || normalized.startsWith('/') || normalized.includes('\0')) {
      throw new HTTPException(400, { message: 'invalid_argument' });
    }
    if (normalized.startsWith('.git/') || normalized === '.git') {
      throw new HTTPException(400, { message: 'invalid_argument' });
    }
    return normalized;
  }

  async getFile(
    username: string,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<{ path: string; sha: string; content: string; htmlUrl?: string }> {
    this.allowedRepoCheck(owner, repo);
    const normalizedPath = this.normalizePath(path);
    const tokenRecord = await this.getToken(username);
    if (!tokenRecord) throw new HTTPException(401, { message: 'github_reauth_required' });
    const expired = new Date(tokenRecord.expiresAt).getTime() <= Date.now();
    if (expired) {
      await this.invalidateToken(username);
      throw new HTTPException(401, { message: 'github_reauth_required' });
    }

    const url = new URL(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(normalizedPath)}`);
    if (ref) url.searchParams.set('ref', ref);
    const res = await fetch(url.toString(), { headers: this.headers(tokenRecord.accessToken) });
    if (res.status === 401) {
      await this.invalidateToken(username);
      throw new HTTPException(401, { message: 'github_reauth_required' });
    }
    if (res.status === 403) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      if (remaining === '0') throw new HTTPException(429, { message: 'github_rate_limited' });
      throw new HTTPException(403, { message: 'forbidden_repo' });
    }
    if (res.status === 404) throw new HTTPException(404, { message: 'discussion_not_found' });
    if (!res.ok) throw new HTTPException(502, { message: 'github_unavailable' });
    const body = await res.json() as any;
    if (Array.isArray(body)) {
      throw new HTTPException(400, { message: 'invalid_argument' });
    }
    const content = body.content ? atob(String(body.content).replace(/\n/g, '')) : '';
    return { path: body.path ?? normalizedPath, sha: body.sha, content, htmlUrl: body.html_url };
  }

  async putFile(
    username: string,
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch?: string,
    sha?: string,
  ): Promise<{ sha: string; commitSha: string; htmlUrl?: string }> {
    this.allowedRepoCheck(owner, repo);
    const normalizedPath = this.normalizePath(path);
    if (new TextEncoder().encode(content).byteLength > 1024 * 1024) {
      throw new HTTPException(400, { message: 'invalid_argument' });
    }

    const tokenRecord = await this.getToken(username);
    if (!tokenRecord) throw new HTTPException(401, { message: 'github_reauth_required' });
    if (new Date(tokenRecord.expiresAt).getTime() <= Date.now()) {
      await this.invalidateToken(username);
      throw new HTTPException(401, { message: 'github_reauth_required' });
    }

    // If no sha is provided, check whether the file already exists to avoid clobbering.
    if (!sha) {
      const existingRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(normalizedPath)}${branch ? `?ref=${branch}` : ''}`,
        { headers: this.headers(tokenRecord.accessToken) },
      );
      if (existingRes.ok) {
        const existing = await existingRes.json() as any;
        const error = new HTTPException(409, { message: 'sha_conflict' });
        (error as any).currentSha = existing?.sha;
        throw error;
      }
    }

    const body: Record<string, unknown> = {
      message: message || `blog(api): update ${normalizedPath} by ${username}`,
      content: btoa(content),
      branch: branch || 'main',
    };
    if (sha) body.sha = sha;

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(normalizedPath)}`, {
      method: 'PUT',
      headers: { ...this.headers(tokenRecord.accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.status === 409) {
      const body = await res.json().catch(() => ({})) as any;
      const currentSha = body?.content?.sha;
      const error = new HTTPException(409, { message: 'sha_conflict' });
      if (currentSha) (error as any).currentSha = currentSha;
      throw error;
    }
    if (res.status === 401) {
      await this.invalidateToken(username);
      throw new HTTPException(401, { message: 'github_reauth_required' });
    }
    if (res.status === 403) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      if (remaining === '0') throw new HTTPException(429, { message: 'github_rate_limited' });
      throw new HTTPException(403, { message: 'forbidden_repo' });
    }
    if (!res.ok) throw new HTTPException(502, { message: 'github_unavailable' });

    const json = await res.json() as any;
    return { sha: json.content?.sha, commitSha: json.commit?.sha, htmlUrl: json.content?.html_url };
  }

  async deleteFile(
    username: string,
    owner: string,
    repo: string,
    path: string,
    sha: string,
    message?: string,
    branch?: string,
  ): Promise<{ commitSha?: string }> {
    this.allowedRepoCheck(owner, repo);
    const normalizedPath = this.normalizePath(path);
    if (!sha) throw new HTTPException(400, { message: 'invalid_argument' });
    const tokenRecord = await this.getToken(username);
    if (!tokenRecord) throw new HTTPException(401, { message: 'github_reauth_required' });
    if (new Date(tokenRecord.expiresAt).getTime() <= Date.now()) {
      await this.invalidateToken(username);
      throw new HTTPException(401, { message: 'github_reauth_required' });
    }

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(normalizedPath)}`, {
      method: 'DELETE',
      headers: { ...this.headers(tokenRecord.accessToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message || `blog(api): delete ${normalizedPath} by ${username}`,
        sha,
        branch: branch || 'main',
      }),
    });
    if (res.status === 401) {
      await this.invalidateToken(username);
      throw new HTTPException(401, { message: 'github_reauth_required' });
    }
    if (res.status === 404) throw new HTTPException(404, { message: 'discussion_not_found' });
    if (!res.ok) throw new HTTPException(502, { message: 'github_unavailable' });
    const json = await res.json().catch(() => ({})) as any;
    return { commitSha: json.commit?.sha };
  }
  // (class methods below)


  private async graphql<T = any>(
    username: string,
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const tokenRecord = await this.getToken(username);
    if (!tokenRecord) throw new HTTPException(401, { message: 'github_reauth_required' });
    if (new Date(tokenRecord.expiresAt).getTime() <= Date.now()) {
      await this.invalidateToken(username);
      throw new HTTPException(401, { message: 'github_reauth_required' });
    }

    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        ...this.headers(tokenRecord.accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
    if (res.status === 401) {
      await this.invalidateToken(username);
      throw new HTTPException(401, { message: 'github_reauth_required' });
    }
    if (res.status === 403) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      if (remaining === '0') throw new HTTPException(429, { message: 'github_rate_limited' });
      throw new HTTPException(403, { message: 'forbidden_repo' });
    }
    if (!res.ok) throw new HTTPException(502, { message: 'github_unavailable' });

    const json = await res.json() as any;
    if (json.errors?.length) {
      const message = String(json.errors[0]?.message ?? 'github_unavailable');
      if (/not found/i.test(message)) throw new HTTPException(404, { message: 'discussion_not_found' });
      throw new HTTPException(502, { message: 'github_unavailable' });
    }
    return json.data as T;
  }

  private appendSourceBlock(body: string, blogUrl?: string, title?: string): string {
    if (!blogUrl) return body;
    if (body.includes('<!-- blog-source:start -->')) return body;
    return `${body}\n\n<!-- blog-source:start -->\n\n> 来源：[${title ?? '博客文章'}](${blogUrl})\n> 页面：\`${blogUrl.replace(/^https?:\/\/[^/]+/, '')}\`\n\n<!-- blog-source:end -->`;
  }

  private async resolveDiscussionNode(username: string, owner: string, repo: string, number: number): Promise<string> {
    const data = await this.graphql(username, `
      query GetDiscussionNode($owner: String!, $name: String!, $number: Int!) {
        repository(owner: $owner, name: $name) {
          discussion(number: $number) { id }
        }
      }
    `, { owner, name: repo, number });
    const id = data?.repository?.discussion?.id;
    if (!id) throw new HTTPException(404, { message: 'discussion_not_found' });
    return id;
  }

  async listDiscussions(
    username: string,
    owner: string,
    repo: string,
    categoryId?: string,
    cursor?: string,
  ): Promise<{ pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: any[] }> {
    this.allowedRepoCheck(owner, repo);
    const data = await this.graphql(username, `
      query ListDiscussions($owner: String!, $name: String!, $first: Int!, $after: String, $categoryId: ID) {
        repository(owner: $owner, name: $name) {
          discussions(first: $first, after: $after, categoryId: $categoryId) {
            pageInfo { hasNextPage endCursor }
            nodes {
              number title url body createdAt updatedAt
              author { login }
              category { id name slug }
            }
          }
        }
      }
    `, { owner, name: repo, first: 20, after: cursor || null, categoryId: categoryId || null });

    if (!data?.repository) throw new HTTPException(404, { message: 'discussion_not_found' });
    return data.repository.discussions;
  }

  async getDiscussion(username: string, owner: string, repo: string, number: number): Promise<any> {
    this.allowedRepoCheck(owner, repo);
    const data = await this.graphql(username, `
      query GetDiscussion($owner: String!, $name: String!, $number: Int!) {
        repository(owner: $owner, name: $name) {
          discussion(number: $number) {
            number title url body createdAt updatedAt
            author { login }
            category { id name slug }
          }
        }
      }
    `, { owner, name: repo, number });
    const discussion = data?.repository?.discussion;
    if (!discussion) throw new HTTPException(404, { message: 'discussion_not_found' });
    return discussion;
  }

  async createDiscussion(
    username: string,
    owner: string,
    repo: string,
    title: string,
    body: string,
    categoryId?: string,
    categorySlug?: string,
    blogUrl?: string,
    postTitle?: string,
    slug?: string,
  ): Promise<any> {
    this.allowedRepoCheck(owner, repo);
    const machineTitle = slug ? `${title}\n\n[blog-post:${slug}]` : title;
    const repositoryData = await this.graphql(username, `
      query RepositoryInfo($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          id
          discussionCategories(first: 50) { nodes { id name slug } }
        }
      }
    `, { owner, name: repo });
    const repository = repositoryData?.repository;
    if (!repository) throw new HTTPException(404, { message: 'discussion_not_found' });

    let resolvedCategoryId = categoryId;
    if (!resolvedCategoryId && categorySlug) {
      const found = repository.discussionCategories.nodes.find((c: any) => c.slug === categorySlug || c.name === categorySlug);
      resolvedCategoryId = found?.id;
    }
    if (!resolvedCategoryId && repository.discussionCategories.nodes.length > 0) {
      resolvedCategoryId = repository.discussionCategories.nodes[0].id;
    }
    if (!resolvedCategoryId) throw new HTTPException(400, { message: 'invalid_argument' });

    const finalBody = this.appendSourceBlock(body, blogUrl, postTitle ?? title);

    const data = await this.graphql(username, `
      mutation CreateDiscussion($input: CreateDiscussionInput!) {
        createDiscussion(input: $input) {
          discussion { number title url body createdAt }
        }
      }
    `, {
      input: {
        repositoryId: repository.id,
        categoryId: resolvedCategoryId,
        title: machineTitle,
        body: finalBody,
      },
    });

    return data.createDiscussion.discussion;
  }

  async updateDiscussion(
    username: string,
    owner: string,
    repo: string,
    number: number,
    title?: string,
    body?: string,
    blogUrl?: string,
    postTitle?: string,
  ): Promise<any> {
    this.allowedRepoCheck(owner, repo);
    const id = await this.resolveDiscussionNode(username, owner, repo, number);
    const finalBody = body ? this.appendSourceBlock(body, blogUrl, postTitle) : undefined;
    const data = await this.graphql(username, `
      mutation UpdateDiscussion($input: UpdateDiscussionInput!) {
        updateDiscussion(input: $input) {
          discussion { number title url body updatedAt }
        }
      }
    `, {
      input: {
        discussionId: id,
        ...(title ? { title } : {}),
        ...(finalBody ? { body: finalBody } : {}),
      },
    });
    return data.updateDiscussion.discussion;
  }

  async closeDiscussion(username: string, owner: string, repo: string, number: number): Promise<void> {
    this.allowedRepoCheck(owner, repo);
    const id = await this.resolveDiscussionNode(username, owner, repo, number);
    await this.graphql(username, `
      mutation CloseDiscussion($input: CloseDiscussionInput!) {
        closeDiscussion(input: $input) { discussion { number } }
      }
    `, { input: { discussionId: id } });
  }

  async listComments(
    username: string,
    owner: string,
    repo: string,
    number: number,
    cursor?: string,
  ): Promise<{ pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: any[] }> {
    this.allowedRepoCheck(owner, repo);
    const data = await this.graphql(username, `
      query ListComments($owner: String!, $name: String!, $number: Int!, $first: Int!, $after: String) {
        repository(owner: $owner, name: $name) {
          discussion(number: $number) {
            comments(first: $first, after: $after) {
              pageInfo { hasNextPage endCursor }
              nodes { id body createdAt updatedAt author { login } }
            }
          }
        }
      }
    `, { owner, name: repo, number, first: 20, after: cursor || null });
    const discussion = data?.repository?.discussion;
    if (!discussion) throw new HTTPException(404, { message: 'discussion_not_found' });
    return discussion.comments;
  }

  async addComment(username: string, owner: string, repo: string, number: number, body: string): Promise<any> {
    this.allowedRepoCheck(owner, repo);
    const id = await this.resolveDiscussionNode(username, owner, repo, number);
    const data = await this.graphql(username, `
      mutation AddComment($input: AddDiscussionCommentInput!) {
        addDiscussionComment(input: $input) {
          comment { id body url createdAt }
        }
      }
    `, { input: { discussionId: id, body } });
    return data.addDiscussionComment.comment;
  }

  async updateComment(username: string, commentId: string, body: string): Promise<any> {
    const data = await this.graphql(username, `
      mutation UpdateComment($input: UpdateDiscussionCommentInput!) {
        updateDiscussionComment(input: $input) {
          comment { id body updatedAt }
        }
      }
    `, { input: { commentId, body } });
    return data.updateDiscussionComment.comment;
  }

  async deleteComment(username: string, commentId: string): Promise<void> {
    await this.graphql(username, `
      mutation DeleteComment($input: DeleteDiscussionCommentInput!) {
        deleteDiscussionComment(input: $input) { clientMutationId }
      }
    `, { input: { id: commentId } });
  }
}

export default GitHubService;
