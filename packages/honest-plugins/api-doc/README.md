# @rx-ted/packages-honest-plugins-api-doc

OpenAPI documentation plugin for [@rx-ted/packages-honest](https://github.com/rx-ted/honest). Generates OpenAPI specs from Honest route metadata with Scalar and Swagger UI renderers.

## Features

- **Auto-generate**: OpenAPI spec from Honest decorator metadata
- **Scalar UI**: modern interactive API documentation
- **Swagger UI**: classic Swagger documentation
- **Plugin-based**: integrates with Honest's plugin lifecycle

## Installation

```bash
pnpm add @rx-ted/packages-honest-plugins-api-doc
```

Peer dependencies: `@rx-ted/packages-honest`, `hono`, `reflect-metadata`

## Usage

### Register as a plugin

```ts
import { ApiDocPlugin } from '@rx-ted/packages-honest-plugins/api-doc';

const plugin = new ApiDocPlugin({
  title: 'My API',
  version: '1.0.0',
  renderer: 'scalar', // 'scalar' | 'swagger'
});

const { hono } = await Application.create(AppModule, {
  plugins: [plugin],
});
```

### Renderers

```ts
import { ScalarRenderer } from '@rx-ted/packages-honest-plugins/api-doc';
import { SwaggerRenderer } from '@rx-ted/packages-honest-plugins/api-doc';

// Scalar UI (default)
const scalar = new ScalarRenderer({ title: 'API Docs' });

// Swagger UI
const swagger = new SwaggerRenderer({ title: 'API Docs' });
```

### Endpoints

Once registered, the plugin adds:

- `GET /openapi.json` — OpenAPI spec
- `GET /docs` — UI rendering (Scalar or Swagger)

## Types

```ts
interface ApiDocPluginOptions {
  title?: string;
  version?: string;
  description?: string;
  renderer?: 'scalar' | 'swagger';
  specPath?: string;
}

interface IDocRenderer {
  render(spec: Record<string, unknown>): string;
}
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm test` | Run tests |
| `pnpm build` | Build |
| `pnpm typecheck` | Type check |
