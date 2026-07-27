# @rx-ted/packages-honest-plugins

HonestJS 插件集合 — db, cache, mail, s3, api-doc。

## 插件列表

| 插件 | 子包 | 用途 |
| --- | --- | --- |
| `db` | `@rx-ted/packages-honest-plugins-db` | 数据库（Drizzle ORM + MySQL/SQLite/D1/PostgreSQL） |
| `cache` | `@rx-ted/packages-honest-plugins-cache` | 缓存（Redis/KV/Local） |
| `mail` | `@rx-ted/packages-honest-plugins-mail` | 邮件（Resend/Brevo/SMTP） |
| `s3` | `@rx-ted/packages-honest-plugins-s3` | 对象存储（AWS S3） |
| `api-doc` | `@rx-ted/packages-honest-plugins-api-doc` | OpenAPI 文档 + Scalar UI |

## 导入方式

```ts
// 通过 barrel 导入
import { DbService } from '@rx-ted/packages-honest-plugins/db'
import { CacheService } from '@rx-ted/packages-honest-plugins/cache'
import { MailPlugin } from '@rx-ted/packages-honest-plugins/mail'
import { S3Plugin } from '@rx-ted/packages-honest-plugins/s3'
import { ApiDocPlugin } from '@rx-ted/packages-honest-plugins/api-doc'
```

## 子包结构

```
packages/honest-plugins/
├── db/          @rx-ted/packages-honest-plugins-db      (private)
├── cache/       @rx-ted/packages-honest-plugins-cache   (private)
├── mail/        @rx-ted/packages-honest-plugins-mail    (private)
├── s3/          @rx-ted/packages-honest-plugins-s3      (private)
└── api-doc/     @rx-ted/packages-honest-plugins-api-doc (private)
```

子包为 `private: true`，仅通过 barrel 包 `@rx-ted/packages-honest-plugins` 发布。

## 开发

```bash
pnpm build       # 构建所有插件
pnpm test        # 运行所有测试
pnpm typecheck   # 类型检查
```
