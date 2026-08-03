# @rx-ted/packages-honest-plugins

## 1.0.3

### Patch Changes

- 32b8b81: Accumulate miscellaneous fixes and refinements.

## 1.0.2

### Patch Changes

- 6f2fb99: New package `@rx-ted/packages-honest-plugins-counter` — Durable Objects backed counter plugin with pending buffer and flush handlers, exposed via `@rx-ted/packages-honest-plugins/counter` subpath export
- Updated dependencies [6f2fb99]
  - @rx-ted/packages-honest-plugins-counter@1.0.1

## 1.0.1

### Patch Changes

- 11bbae7: Remove defunct packages (web-admin, auth, http-client, search) and introduce barrel packages for consolidated exports. Migrate all internal imports from scoped plugin names (`@rx-ted/packages-honest-plugins-db`) to path-based barrel imports (`@rx-ted/packages-honest-plugins/db`). Reset all package versions to 1.0.0 with consolidated changelogs. Clean up obsolete documentation across the monorepo.
- Updated dependencies [11bbae7]
  - @rx-ted/packages-honest-plugins-db@1.0.1
  - @rx-ted/packages-honest-plugins-cache@1.0.1
  - @rx-ted/packages-honest-plugins-mail@1.0.1
  - @rx-ted/packages-honest-plugins-s3@1.0.1
  - @rx-ted/packages-honest-plugins-api-doc@1.0.1
