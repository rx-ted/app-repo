# Platform API CLI

统一配置入口 + 命令行启动工具。

## 从根目录运行（推荐）

```bash
pnpm api [key=value...] api <cf|node|bun|deno> [--exec]
```

根 `package.json` 已添加 `api` 脚本，**不需要 cd apps/platform-api**。

在 `apps/platform-api/` 目录下也可以用 `pnpm cli`。

## 配置项

```txt
DEBUG        bool     true, false               默认 false
DB           string   sqlite, d1, mysql         默认 d1
CACHE        string   local, kv, redis          默认 kv
MAILS        array    resend,brevo,smtp         默认 resend,brevo,smtp
APIDOC       bool     true, false               默认 false
LOGGER_LEVEL string   debug, info, warn, error  默认 info
```

**默认**（不传任何 key=value）等于 CF 生产配置：

```txt
DEBUG=false DB=d1 CACHE=kv MAILS=resend,brevo,smtp APIDOC=false LOGGER_LEVEL=info
```

## 示例

**查看 CF 生产的启动命令：**

```bash
pnpm api api cf
# → DEBUG=false DB=d1 CACHE=kv ... pnpm wrangler deploy
```

**CF 本地开发：**

```bash
pnpm api DEBUG=true api cf
# → DEBUG=true DB=d1 CACHE=kv ... pnpm wrangler dev
```

**Node + SQLite 本地开发：**

```bash
pnpm api DEBUG=true DB=sqlite CACHE=local api node
# → DEBUG=true node --experimental-strip-types runtime/serve.ts
```

**Bun + SQLite 本地开发：**

```bash
pnpm api DEBUG=true DB=sqlite CACHE=local api bun
# → DEBUG=true bun run --watch runtime/bun.ts
```

**直接执行（`--exec`）：**

```bash
pnpm api DEBUG=true DB=sqlite CACHE=local api node --exec
```

## 各 Runtime 的启动命令

| Runtime | Debug (Dev) | Production | 传参方式 |
|---------|-------------|------------|---------|
| `cf` | `pnpm wrangler dev --var KEY:val` | `pnpm wrangler deploy --var KEY:val` | `--var`（Worker bindings） |
| `bun` | `KEY=val bun run --watch runtime/bun.ts` | `KEY=val bun run runtime/bun.ts` | env prefix（`process.env`） |
| `node` | `KEY=val node --experimental-strip-types runtime/serve.ts` | `KEY=val node --env-file=../../.env.prod --experimental-strip-types runtime/serve.ts` | env prefix（`process.env`） |
| `deno` | `KEY=val deno run --watch --allow-net --allow-env --allow-read runtime/deno.ts` | `KEY=val deno run --allow-net --allow-env --allow-read runtime/deno.ts` | env prefix（`process.env`） |

> CF 用 `--var` 是因为 Cloudflare Worker 的 `env.get()` 读取的是 Worker bindings，不是 `process.env`。
> Node/Bun/Deno 用 env prefix，应用直接读 `process.env`，两边都能拿到值。

## 架构说明

```
src/config/index.ts        ← PlatformApiConfig 类型 + 默认值 + 解析函数
src/bin/platform-api.ts    ← CLI 入口
src/lib/plugins.ts         ← getPlugins(config) 接收配置，不再直接读 env
src/lib/logger.ts          ← 从 LOGGER_LEVEL env 读取日志级别
src/index.ts               ← parseConfigFromEnv() → getPlugins(config)
runtime/*.ts               ← 各 runtime 入口，不作变动
```

## 常见场景速查

```bash
# CF 生产部署
pnpm api api cf --exec

# CF 本地调试
pnpm api DEBUG=true api cf --exec

# Bun 本地开发
pnpm api DEBUG=true DB=sqlite api bun --exec

# Node 本地开发
pnpm api DEBUG=true DB=sqlite CACHE=local api node --exec

# 只看输出不执行
pnpm api api cf
```
