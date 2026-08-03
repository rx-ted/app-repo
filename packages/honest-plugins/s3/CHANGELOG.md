# @rx-ted/packages-honest-plugins-s3

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

- S3 plugin for @rx-ted/packages-honest
- AWS S3 client integration (`@aws-sdk/client-s3`)
- S3 request presigner for temporary URLs
