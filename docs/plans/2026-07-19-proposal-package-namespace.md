# @rx-ted 包命名与发布规范

## 目录结构

```
packages/
├── package.json                    → @rx-ted/packages (private, barrel)
├── core/                           → @rx-ted/packages-core (public)
├── honest/                         → @rx-ted/packages-honest (public)
└── honest-plugins/
    ├── package.json                → @rx-ted/packages-honest-plugins (public, barrel)
    ├── api-doc/                    → @rx-ted/packages-honest-plugins-api-doc (private)
    ├── cache/                      → @rx-ted/packages-honest-plugins-cache (private)
    ├── db/                         → @rx-ted/packages-honest-plugins-db (private)
    ├── mail/                       → @rx-ted/packages-honest-plugins-mail (private)
    └── s3/                         → @rx-ted/packages-honest-plugins-s3 (private)
```

## 命名规则

`@rx-ted` 是组织 scope，包名用 `-` 连接：

| 包名 | 是否发布 | 说明 |
|------|---------|------|
| `@rx-ted/packages-core` | ✅ npm | 核心工具（Env, Logger, Platform） |
| `@rx-ted/packages-honest` | ✅ npm | Web 框架（DI, 路由, 装饰器） |
| `@rx-ted/packages-honest-plugins` | ✅ npm | 插件 barrel，聚合所有插件 |
| `@rx-ted/packages-honest-plugins-db` | ❌ private | 数据库插件（D1/SQLite/MySQL） |
| `@rx-ted/packages-honest-plugins-cache` | ❌ private | 缓存插件（KV/Redis/Local） |
| `@rx-ted/packages-honest-plugins-mail` | ❌ private | 邮件插件（Resend/SMTP） |
| `@rx-ted/packages-honest-plugins-s3` | ❌ private | 对象存储插件 |
| `@rx-ted/packages-honest-plugins-api-doc` | ❌ private | OpenAPI 文档插件 |
| `@rx-ted/packages` | ❌ private | 根 barrel（内部使用） |

## 导入方式

```ts
// core & honest — 直接导入，包名即路径
import { Platform, Env } from '@rx-ted/packages-core'
import { Injectable, Controller } from '@rx-ted/packages-honest'

// plugins — 通过 @rx-ted/packages-honest-plugins barrel
import { DbService, zdb } from '@rx-ted/packages-honest-plugins/db'
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache'
import { MailDriver } from '@rx-ted/packages-honest-plugins/mail'
```

## 为什么不用 @rx-ted/packages/core

npm 包名格式 `@scope/name` 中 `/` 是 scope 分隔符：

- `@rx-ted/packages-core` → scope: `@rx-ted`, name: `packages-core`
- `@rx-ted/packages/core` → scope: `@rx-ted/packages`, name: `core`

后者需要创建 `@rx-ted/packages` scope，且 `package.json` 的 `dependencies` 不允许 `/` 在包名中（pnpm 报错 `Invalid dependency name`）。

因此 core 和 honest 保留 `-` 连接的包名，只有 plugins 通过 barrel 提供 `/` 路径导入。

## pnpm workspace 配置

```yaml
packages:
  - "packages"
  - "packages/core"
  - "packages/honest"
  - "packages/honest-plugins"
  - "packages/honest-plugins/db"
  - "packages/honest-plugins/cache"
  - "packages/honest-plugins/s3"
  - "packages/honest-plugins/mail"
  - "packages/honest-plugins/api-doc"
```

barrel 包（`packages`、`packages/honest-plugins`）需要加入 workspace，子模块独立声明。

## 依赖关系

```
@rx-ted/packages-honest-plugins (barrel)
  ├── @rx-ted/packages-honest-plugins-db (workspace:^)
  ├── @rx-ted/packages-honest-plugins-cache (workspace:^)
  ├── @rx-ted/packages-honest-plugins-mail (workspace:^)
  ├── @rx-ted/packages-honest-plugins-s3 (workspace:^)
  └── @rx-ted/packages-honest-plugins-api-doc (workspace:^)

@rx-ted/packages-honest
  └── @rx-ted/packages-core (workspace:^)

每个 honest-plugins 子模块
  ├── @rx-ted/packages-core (workspace:^)
  └── @rx-ted/packages-honest (workspace:^)
```

消费方（如 platform-api）依赖 barrel 而非子模块：

```json
{
  "dependencies": {
    "@rx-ted/packages-core": "workspace:^",
    "@rx-ted/packages-honest": "workspace:^",
    "@rx-ted/packages-honest-plugins": "workspace:^"
  }
}
```

## 发布

```bash
# 发布三个公开包
npm publish packages/core --access public        # @rx-ted/packages-core
npm publish packages/honest --access public       # @rx-ted/packages-honest
npm publish packages/honest-plugins --access public  # @rx-ted/packages-honest-plugins
```

barrel 包通过 `dependencies` 自动拉取子模块，消费方只需安装 barrel 即可使用所有插件。
