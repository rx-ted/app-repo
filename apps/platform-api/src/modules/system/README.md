# System Init

## Auto-seed (首次部署自动运行)

服务首次启动时，`createApp()` 会自动执行 seed 流程：

1. 计算当前 seed 数据（权限 + 角色）的 SHA-256 hash
2. 查询 `system_meta` 表中是否已有相同的 `seed_hash`
3. 无 hash 或 hash 不匹配 → 执行 seed，成功后写入新 hash
4. hash 匹配 → 跳过，零 DB 写入

**后续新增权限**：只需在 `PERMISSIONS_DATA` 中添加条目，hash 将变化，下次启动会自动补充 seed。

### 表结构

`system_meta`：`key VARCHAR PK` + `value TEXT`，记录 `seed_hash`。

## Controller

Protected by `EnvironmentGuard` and `InitKeyGuard`.

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| POST | /system/init | InitKey | - | 200 `{ data: [{ module: string, status: string, error?: string }] }` | 401/403 |
| POST | /system/init/:module | InitKey | `:module` (string) | 200 `{ data: { module: string, status: string, error?: string } }` | 401/403/404 |

HTTP 端点保留作为手动重新触发的 fallback（例如在开发中强制重新 seed）。

## Service

### `runAllIfNeeded()`
auto-seed 入口。比较 hash 决定是否执行。全模块成功后存储 hash。

### `runAll()`
执行所有 seed 模块。收集 `{ module, status }` 结果，每个模块独立捕获异常。

### `runModule(name)`
执行单个 seed 模块。

### Seed Modules

| Module | Description |
|--------|------------|
| `permissions` | Seeds 61 permission entries into `permissions` table |
| `roles` | Creates `admin` and `user` roles. Assigns all permissions to admin role; assigns only `post:*` to user role |

（更多模块待实现。）

## Database Tables Referenced

`permissions`, `roles`, `role_permission_mappings`, `system_meta`
