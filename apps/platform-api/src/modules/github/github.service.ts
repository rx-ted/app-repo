import { Inject, Service } from '@rx-ted/packages-honest';
import { CacheService } from '@rx-ted/packages-honest-plugins/cache';
import { env } from '@rx-ted/packages-core';
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

  getAuthUrl(clientId: string, redirectUri: string, username: string): { url: string; state: string } {
    const state = crypto.randomUUID();
    // Store state -> username with short TTL.
    void this.cache.set(this.stateKey(state), { username }, 600);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'repo',
      state,
    });
    return { url: `https://github.com/login/oauth/authorize?${params.toString()}`, state };
  }

  async handleCallback(code: string, state: string): Promise<{ login: string; stored: boolean }> {
    const stateRecord = await this.cache.get<{ username: string }>(this.stateKey(state));
    await this.cache.delete(this.stateKey(state));
    if (!stateRecord?.username) {
      throw new HTTPException(400, { message: 'invalid_state' });
    }
    const username = stateRecord.username;

    const clientId = env.require('GITHUB_CLIENT_ID');
    const clientSecret = env.require('GITHUB_CLIENT_SECRET');

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

    await this.cache.set(this.tokenKey(username), record, expiresIn);
    return { login, stored: true };
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
}
export default GitHubService;
