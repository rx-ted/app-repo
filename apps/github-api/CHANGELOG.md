# @rx-ted/github-api

## 1.1.0

### Minor Changes

- f11a88a: Unify cross-service sessions and add Gitalk integration:
  - unified `session` cookie/KV session storage and session-id rotation on login
  - made refresh-token cookie work over local HTTP
  - added GitHub OAuth token proxy endpoints and path-based GitHub proxy
  - auto-created Discussion mappings for posts and guestbook/discover/about pages
  - integrated Gitalk components on post detail, guestbook, discover, and about pages
  - disabled built-in comment sections in favor of Gitalk
  - updated environment defaults/docs for frontend domain and repository configuration

### Patch Changes

- Updated dependencies [f11a88a]
- Updated dependencies [15dbcbe]
  - @rx-ted/packages-honest-plugins@1.1.1
  - @rx-ted/packages-honest-plugins-swagger@1.0.1
