# @rx-ted/packages-honest

## 1.0.3

### Patch Changes

- 312bbb3: Test changeset to verify automated patch version bump.
- Updated dependencies [312bbb3]
  - @rx-ted/packages-core@1.0.3

## 1.0.2

### Patch Changes

- 32b8b81: Accumulate miscellaneous fixes and refinements.
- Updated dependencies [32b8b81]
  - @rx-ted/packages-core@1.0.2

## 1.0.1

### Patch Changes

- 11bbae7: Remove defunct packages (web-admin, auth, http-client, search) and introduce barrel packages for consolidated exports. Migrate all internal imports from scoped plugin names (`@rx-ted/packages-honest-plugins-db`) to path-based barrel imports (`@rx-ted/packages-honest-plugins/db`). Reset all package versions to 1.0.0 with consolidated changelogs. Clean up obsolete documentation across the monorepo.
- Updated dependencies [11bbae7]
  - @rx-ted/packages-core@1.0.1

## 1.0.0

Initial consolidated release.

### Features

- **HonestJS** — modern web framework built on top of Hono with Node.js support
- `PluginEngine` — unified lifecycle management (Build + Runtime + Health)
- `IPlugin` interface: `beforeModulesRegistered()`, `afterModulesRegistered()`
- `IRuntimePlugin` interface: `bootstrap()`, `shutdown()`
- `IHealthAware` interface: `health()` returning `ServiceHealth`
- `IDependent` interface: `dependsOn: string[]` for dependency ordering
- `ServiceStatus` state machine: STOPPED → STARTING → READY → STOPPING → STOPPED
- Topological sort for dependency-based startup ordering (layered concurrent bootstrap)
- Auto-reconnect with exponential backoff + jitter
- `health()` aggregation across all registered services
- `waitUntil(promise)` on `IApplicationContext` — fire-and-forget background tasks
- `createReconnect()` helper — wraps async connect function with exponential backoff
- `topologicalSort(items, getDependencies)` — orders items by dependency graph
- `@Injectable()` and `@Inject()` decorators for explicit DI metadata
- `@Headers`, `@Ip`, `@Session`, `@HostParam`, `@Next` parameter decorators
- `@Redirect(url, statusCode?)` method decorator
- NestJS-compatible decorator extraction to api-doc plugin
