# @rx-ted/packages-honest-plugins-db

## 1.0.2

### Patch Changes

- ecd82a4: Test changeset to verify automated patch version bump.
- Updated dependencies [312bbb3]
- Updated dependencies [312bbb3]
  - @rx-ted/packages-core@1.0.3
  - @rx-ted/packages-honest@1.0.3

## 1.0.1

### Patch Changes

- 11bbae7: Remove defunct packages (web-admin, auth, http-client, search) and introduce barrel packages for consolidated exports. Migrate all internal imports from scoped plugin names (`@rx-ted/packages-honest-plugins-db`) to path-based barrel imports (`@rx-ted/packages-honest-plugins/db`). Reset all package versions to 1.0.0 with consolidated changelogs. Clean up obsolete documentation across the monorepo.
- Updated dependencies [11bbae7]
  - @rx-ted/packages-core@1.0.1
  - @rx-ted/packages-honest@1.0.1

## 1.0.0

Initial consolidated release.

### Features

- Database plugin for @rx-ted/packages-honest
- Schema-builder with Zod integration (`zdb()` helper)
- D1 (SQLite) schema compiler with proper JSON mode
- MySQL schema compiler
- `compileSchema` dispatcher for multi-dialect support
- Lazy Proxy D1 binding resolution for wrangler dev compatibility
- `SqlitePlugin` using better-sqlite3 (WAL mode, foreign keys)
- Normalize SQLite insert results (`{changes,lastInsertRowid}` → `{affectedRows,insertId}`)
- Shared `resolveBinding` utility from core
