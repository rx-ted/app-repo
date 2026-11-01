# @rx-ted/github-api

Cloudflare Worker that hosts the GitHub integration extracted from `apps/platform-api`.

## Features

- GitHub OAuth login (`/github/auth/url`, `/github/auth/callback`)
- GitHub token storage/refresh helpers
- Repository file operations (`/github/files`)
- Discussion and comment operations (`/github/discussions`, `/github/comments`)
- Designed for future repo CRUD and issue support

## Development

```bash
cd apps/github-api
pnpm install
pnpm dev:vite   # vite dev server
# or
pnpm dev:cf     # cloudflare worker dev
```

Required vars/bindings:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_TOKEN_ENCRYPTION_KEY` (optional but recommended)
- `KV_BINDING` (KV namespace)
- `JWT_SECRET` (optional, used to read the platform user from a bearer token)