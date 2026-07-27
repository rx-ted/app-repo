# @rx-ted/packages-honest-plugins-api-doc

## 1.0.1

### Patch Changes

- 11bbae7: Remove defunct packages (web-admin, auth, http-client, search) and introduce barrel packages for consolidated exports. Migrate all internal imports from scoped plugin names (`@rx-ted/packages-honest-plugins-db`) to path-based barrel imports (`@rx-ted/packages-honest-plugins/db`). Reset all package versions to 1.0.0 with consolidated changelogs. Clean up obsolete documentation across the monorepo.
- Updated dependencies [11bbae7]
  - @rx-ted/packages-core@1.0.1
  - @rx-ted/packages-honest@1.0.1

## 1.0.0

Initial consolidated release.

### Features

- API documentation plugin for @rx-ted/packages-honest
- OpenAPI spec generation
- NestJS-compatible decorators: `@Headers`, `@Ip`, `@Session`, `@HostParam`, `@Next`
- `@Redirect(url, statusCode?)` method decorator
- DESIGN.md documentation
