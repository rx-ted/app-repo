# 友链系统设计

## 数据模型

| 字段          | 类型         | 说明                                                 |
| ------------- | ------------ | ---------------------------------------------------- |
| id            | integer PK   | 自增主键                                             |
| name          | varchar(100) | 站点名称                                             |
| url           | varchar(500) | 链接                                                 |
| logo          | varchar(500) | 头像 URL                                             |
| description   | varchar(200) | 描述                                                 |
| category      | varchar(50)  | 分类枚举（见下方）                                   |
| status        | varchar(20)  | 状态枚举（见下方）                                   |
| email         | varchar(200) | 创建者邮箱（用于验证 + 后续联系）                    |
| sortOrder     | integer      | 排序权重（保留现有字段，默认 0，值越小越靠前）       |
| failCount     | integer      | 健康检查连续失败次数（默认 0，用于判断 unreachable） |
| lastCheckedAt | timestamp    | 上次健康检查时间                                     |
| createdAt     | timestamp    | 创建时间                                             |
| updatedAt     | timestamp    | 更新时间                                             |

### Category 枚举

```
blog      - 博客
docs      - 文档
framework - 框架
mail      - 邮箱服务
mall      - 商城
community - 社区论坛
tool      - 工具
other     - 其他
```

### Status 枚举（替代现有 `isActive: boolean`）

```
active      - 正常：可见 + 可访问
pending     - 待检查：刚创建，尚未执行健康检查（默认展示，但标记"待确认"）
unreachable - 无法访问：连续 3 次健康检查失败（自动隐藏，后台仍保留）
disabled    - 已禁用：管理员手动下架（不展示）
```

**删除场景对照 status：**

- `unreachable` 是自动标记的，无需手动删除
- `disabled` 是管理员手动下架
- 物理 `DELETE` 仅适用于：误创建的数据 / 对方要求彻底移除隐私数据 / 垃圾链接

### DB Migration（`isActive` → `status`）

```sql
-- 1. 新增列
ALTER TABLE friend_links ADD COLUMN category varchar(50) DEFAULT 'other';
ALTER TABLE friend_links ADD COLUMN status varchar(20) DEFAULT 'active';
ALTER TABLE friend_links ADD COLUMN email varchar(200) DEFAULT '';
ALTER TABLE friend_links ADD COLUMN fail_count integer DEFAULT 0;
ALTER TABLE friend_links ADD COLUMN last_checked_at timestamp;

-- 2. 回填：is_active = false → status = 'disabled'
UPDATE friend_links SET status = 'disabled' WHERE is_active = FALSE;

-- 3. 删除旧列
ALTER TABLE friend_links DROP COLUMN is_active;
```

对应 Drizzle entity 变更：移除 `isActive` 字段，新增 `category`、`status`、`email`、`failCount`、`lastCheckedAt`。

## API 设计

### 1. 查看友链（公开）

```
GET /friend-links?category=blog
```

- **硬编码**只返回 `status = active` 的友链，不接受 `status` 查询参数（避免外部探测不可用/禁用状态）
- 支持 `?category=` 按分类筛选
- 无需登录

### 2. 查看友链（管理员）

```
GET /friend-links/all?status=pending&category=blog
```

- 返回所有状态的友链
- 支持 `?status=` 和 `?category=` 筛选
- 需要登录 + admin 角色

### 3. 发送验证码（公开）

```
POST /friend-links/send-code
Body: { email: string }
```

- 校验邮箱格式
- 复用现有 `emailCodeCacheKey(email, 'friend-link')` / `emailCooldownCacheKey(email, 'friend-link')` 缓存键模式
- 生成 6 位验证码，存入缓存（TTL 5 分钟）
- 使用 SMTP 发送验证码邮件
- 60 秒冷却（防刷）
- 复用现有 `CacheService`，不新增独立缓存键常量

### 4. 新增友链（公开，需邮箱验证）

```
POST /friend-links
Body: { email, code, name, url, logo?, description?, category? }
```

- 验证邮箱验证码（复用现有 `verifyEmailCode` 逻辑）
- 同步写入 DB（`status = pending`，`failCount = 0`）
- 删除相关缓存键
- 通过 `waitUntil` 后台执行首次 HEAD 健康检查
- 首次检查通过 → `status = active`；失败 → 保持 `pending`（不立即标记 unreachable）

### 5. 修改友链

不提供公开修改接口。需修改时发邮件：

> 发送至 gjy.18sui@gmail.com
> 标题: 「友链修改申请 - {站点名}」
> 内容: 说明来源、原链接、要修改的字段

管理员收到后在管理后台（已有 `PUT /friend-links/:id` admin 接口）手动处理。

### 6. 删除

物理删除仅限于：

1. 对方要求彻底删除（隐私请求）
2. 误创建的垃圾数据
3. 站点内容变为违法/恶意（赌博、色情、诈骗）

其余情况通过 `status` 管理：

- 无法访问 → 系统自动标记 `unreachable`
- 管理员下架 → 手动改为 `disabled`
- 恢复后重新改为 `active`

## 健康检查机制

### 问题：没有 Cron

当前项目是 Cloudflare Workers，`wrangler.jsonc` 没有 `triggers`（cron），也没有定时任务基础设施。

### 方案：组合策略

#### A. 创建时即时检查（基础）

```
用户提交 → waitUntil 执行 HEAD 请求 → 标记 status
```

- 对 url 发 HEAD 请求（超时 5s）
- 2xx/3xx → `status = active`，`failCount = 0`
- 超时/失败 → `status = pending`，`failCount += 1`（暂不标记 unreachable，可能只是瞬时故障）
- 更新 `lastCheckedAt`

#### B. 读取时捎带检查（兜底）

```
GET /friend-links 时，如果发现存在 status = pending 且 lastCheckedAt > 24h 的链接
→ waitUntil 后台检查 1-2 条最旧的
```

- 每次请求 `/friend-links` 时随机检查少量旧链接
- 不阻塞用户响应
- 工作日有流量时能自然完成检查

#### C. 添加 Cloudflare Cron Trigger（可选，推荐）

在 `wrangler.jsonc` 添加：

```jsonc
"triggers": { "crons": ["0 0 * * 0"] }
```

在 `cloudflare.ts` 添加 `scheduled` handler：

```ts
export default {
  async fetch(request, env, ctx) { ... },
  async scheduled(event, env, ctx) {
    await runFriendLinkHealthCheck();
  },
};
```

然后实现 `runFriendLinkHealthCheck()`：

- 查询所有 `status IN (active, pending, unreachable)` 的友链
- 逐条 HEAD 请求检查
- 连续 3 次失败（`failCount >= 3`）→ `status = unreachable`
- 从 unreachable 恢复响应 → `status = active`，`failCount = 0`
- 更新 `lastCheckedAt` 和缓存

**工作量估算：**

- 选项 A（创建时检查）：~0.5 天
- 选项 A + B（捎带检查）：~1 天
- 选项 A + B + C（完整方案）：~1.5 天

### 长期无人创建的冷启动问题

如果一直无人创建友链，没有触发机会——但这不是问题：

- 健康检查仅针对**已存在的友链**
- 没有友链时不需要检查
- 如果有了友链但没人访问（比如个人博客无人问津），建议用选项 C（cron）兜底

## 缓存策略

使用现有 `CacheService`（Cloudflare KV 驱动），参考 `AnnouncementService` 模式。

### Cache Key

```ts
// 友链列表相关（新增）
FRIEND_LINKS_LIST = "friend-links:list"; // 活跃列表（TTL 300s）
FRIEND_LINKS_BY_CAT = "friend-links:category:{cat}"; // 按分类（TTL 300s）
FRIEND_LINKS_ALL = "friend-links:all"; // 全部（admin，TTL 300s）

// 邮箱验证码（复用现有基础设施）
// codeKey  → emailCodeCacheKey(email, 'friend-link')  → 'email:code:{email}:friend-link'
// cooldownKey → emailCooldownCacheKey(email, 'friend-link') → 'email:cooldown:{email}:friend-link'
```

### 读写流程

```
读取：GET /friend-links → cacheable('friend-links:list', TTL, fetchDb)
写入：POST → 同步写 DB → 删除缓存键
更新：PUT → 写 DB → 删除缓存键
健康检查更新 → 更新 DB（status + failCount）→ 删除缓存键
```

KV 最小 TTL 为 60s，`FRIEND_LINKS_LIST` 可用 TTL 300s。

### 现有基础设施复用

| 组件                                              | 复用方式                        |
| ------------------------------------------------- | ------------------------------- |
| `CacheService`                                    | 注入后直接使用 `get/set/delete` |
| `cacheable()`                                     | 读缓存 helper                   |
| `MailService` / `MailProvider`                    | 发送验证码（SMTP）              |
| `emailCodeCacheKey()` / `emailCooldownCacheKey()` | 验证码 + 冷却缓存键生成         |
| `generateEmailCode()`                             | 6 位随机验证码生成              |

## 邮件验证码流程

复用现有模式，新增 `purpose: 'friend-link'`：

```
用户 POST email → generateEmailCode() → cache.set(codeKey(email, 'friend-link'), code, 300)
                                         cache.set(cooldownKey(email, 'friend-link'), '1', 60)
                                         mailService.sendVerificationCode({ to, code, purpose: 'friend-link' })

用户 POST 完整数据 → cache.get(codeKey) 验证 → 通过则创建 → cache.delete(codeKey)
```

### MailService 改动

需扩展 `purpose` 联合类型，涉及以下文件：

```ts
// apps/platform-api/src/modules/mail/mail.service.ts
// 现有：purpose: 'login' | 'register'
// 改为：purpose: 'login' | 'register' | 'friend-link'

// apps/platform-api/src/modules/auth/services/email-auth.service.ts
// 现有：purpose: 'login' | 'register' | 'reset'
// 改为：purpose: 'login' | 'register' | 'reset' | 'friend-link'
```

邮件模板（subject / html）需针对 `friend-link` purpose 定制：

- subject: `「友情链接申请」验证确认`
- body: 验证码 + 说明（用于友链申请验证，非账户操作）

## 前端改动

### FriendsPage.vue

- 使用 OpenAPI-typed `api` 客户端替换自定义 `http` 客户端，获得类型安全
- 补全 `FriendLink` 接口：增加 `category`, `status`, `sortOrder` 字段
- 展示分类标签（badge 样式，Naive UI `NTag` 组件）
- 可选：按分类 tab 切换筛选
- `status != active` 的友链不展示（后端已过滤，前端无需额外处理）

### 新增友链 UI

- 表单组件：email, code, name, url, logo, description, category（下拉选择）
- 两步骤：先填邮箱 → 发送验证码 → 再填完整信息 → 提交
- 复用现有验证码输入 UI（参考登录页）

## 权限常量

新增友链管理权限常量：

```ts
// apps/platform-api/src/constants/permissions.ts
FRIEND_LINK_ACCESS_ANY: 'friend-link:access:any',   // 查看所有状态
FRIEND_LINK_MANAGE: 'friend-link:manage',            // 创建 / 更新 / 删除
```

替换现有 controller 中借用的 `PERMISSIONS.ANNOUNCEMENT_ACCESS_ANY`。

## 实现优先级

| Phase | 内容                                                                                                                                                | 涉及 | 工作量  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------- |
| 1     | 数据模型：新增 `category`、`status`、`email`、`failCount`、`lastCheckedAt` 字段；移除 `isActive`；DB migration + entity + schema 更新；权限常量新增 | 后端 | ~0.5d   |
| 2     | 邮件验证码：扩展 `MailService` purpose 联合类型；实现 `send-code` 接口（复用现有验证码基础设施）                                                    | 后端 | ~0.5d   |
| 3     | 公开创建：`POST /friend-links` 接口（邮箱验证 + 同步写 DB + 缓存失效）                                                                              | 后端 | ~0.5d   |
| 4     | 缓存层：列表查询走 `CacheService`，CRUD 操作后失效缓存                                                                                              | 后端 | ~0.5d   |
| 5     | 健康检查：创建时检查 + 读取时捎带 + cron（可选）                                                                                                    | 后端 | ~1-1.5d |
| 6     | 前端：`api` 客户端切换 + 字段补全 + 分类展示（NTag）+ 新增友链表单（两步流程）                                                                      | 前端 | ~1d     |
