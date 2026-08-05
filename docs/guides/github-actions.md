---
title: GitHub Actions workflows
author: rx-ted
date: 2026-08-05
category: guide
tags:
  - github-actions
  - ci
  - release
  - npm
  - oidc
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: en
---

**English** | [中文](./github-actions.zh.md)

# GitHub Actions workflows

All automation in this repo runs on GitHub Actions, covering **CI checks, PR auto-merge, and npm publishing**. Core principles:

- **GitHub-internal operations** use the automatically injected `GITHUB_TOKEN`; no manual secrets are needed.
- **npm publishing** uses **OIDC Trusted Publishing** (`id-token: write` + npm backend configuration); no npm token is stored.
- The only non-automated step is the one-time OIDC configuration on npmjs.com (details below).

## Workflow overview

| File | Trigger | Purpose |
| --- | --- | --- |
| `ci.yml` | `pull_request` (opened/synchronize/reopened/ready_for_review) + `push` main | lint/format/typecheck/test/build |
| `pr-auto-merge.yml` | `pull_request_target` | enables auto-merge (squash) for every PR |
| `release.yml` | `push` main | Changesets versioning + tag + GitHub Release + npm publishing |
| `publish.yml` | manual `workflow_dispatch` (fill in a tag) | fallback: manually re-publish a single package |

## CI (`ci.yml`)

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
  push:
    branches:
      - main
```

The `versify` job runs in sequence:

1. `pnpm check` — Biome lint + format check
2. `pnpm typecheck` — full type check
3. `pnpm test` — vitest tests
4. `pnpm build` — build all packages

> **Note**: CI must run on both PRs and main. It previously only hooked `pull_request_target`, so PRs never got a status check, the required checks in branch protection stayed pending forever, and auto-merge could never work.

## PR auto-merge (`pr-auto-merge.yml`)

Whenever a PR is opened/updated, `peter-evans/enable-pull-request-automerge@v3` enables auto-merge (squash).

Prerequisites (repo settings, admin required):

1. **Settings → General → Pull Requests → Allow auto-merge**: must be checked.
2. **Settings → Branches → branch protection rule (main)**: **Require status checks to pass before merging** must be enabled, with `versify` (CI) selected.

> Two typical pitfalls:
> - `Auto merge is not allowed for this repository` → Allow auto-merge is not enabled.
> - `Protected branch rules not configured for this branch` → main has no branch protection.
> - `Pull request is in clean status` → branch protection isn't actually tied to a status check, so the PR has nothing pending to satisfy.

## Release (`release.yml`)

Trigger: push to main. Core logic is driven by `changesets/action`:

```
push main → check .changeset/*.md
  ├─ has changesets → create/update the "Version Packages" PR → enable auto-merge
  │     PR merged (after CI passes) → version bump + changelog lands on main → triggers this flow again
  └─ no changesets (after the version PR merges) → Build → Tag → GitHub Release → npm publish (OIDC)
```

### Version changes

- Versions are driven **only by changeset files**; daily development never edits `package.json` by hand.
- When you write `feat` / `fix` changes, remember to commit the corresponding `.changeset/*.md` (patch/minor/major).
- If a changeset is missing, manually add a patch changeset and push; CI versions it automatically.

### npm publishing (OIDC)

The publish step is idempotent: it iterates all non-private packages and only runs `npm publish --access public --provenance` when:

- a git tag exists for the current version (`@rx-ted/packages-<name>@<version>`)
- that version hasn't been published to npm yet

So even if the workflow didn't trigger after the version PR merged (see the FAQ below), re-triggering it once publishes any missing versions.

### One-time npm backend configuration

Configure Trusted Publisher (OIDC) on npmjs.com for **every package you want to publish**:

1. Go to `https://www.npmjs.com/package/<package-name>` → **Settings** → **Trusted publishing**
2. Choose GitHub Actions and fill in:
   - **Organization or user**: `rx-ted`
   - **Repository**: `app-repo`
   - **Workflow filename**: `release.yml` (must match the workflow that actually runs `npm publish`, including the `.yml`)
   - **Allowed actions**: `npm publish`
3. Save, then repeat for every package: `@rx-ted/packages-core`, `@rx-ted/packages-honest`, `@rx-ted/packages-honest-plugins`, `@rx-ted/packages-markdown-editor`

> Common error `404 Not Found ... you do not have permission to access it`: the Trusted Publisher doesn't cover that package, or the workflow filename is wrong (e.g. `publish.yml` was entered). npm doesn't validate on save — the error only appears at publish time.

### `repository` field requirement

Every **non-private** package must have a `repository` field in `package.json` pointing at the real source repo (`git+https://github.com/rx-ted/app-repo.git`). A missing or wrong value fails provenance verification:

```text
Error verifying sigstore provenance bundle: Failed to validate repository information:
  package.json: "repository.url" is "", expected to match "https://github.com/rx-ted/app-repo"
```

```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/rx-ted/app-repo.git"
}
```

## Manual fallback publishing (`publish.yml`)

Normal publishing is integrated into `release.yml`; `publish.yml` only serves as a **manual backfill** tool:

1. Actions → Publish → Run workflow
2. Enter a tag, e.g. `@rx-ted/packages-core@1.0.3`
3. Re-publish that version using OIDC

## Token strategy

| Purpose | Method | Manual config needed? |
| --- | --- | --- |
| CI / PR merge / tagging / creating Releases | `GITHUB_TOKEN` (auto-injected) | No |
| npm publishing | OIDC Trusted Publishing (`id-token: write`) | one-time npm backend configuration |
| cross-repo sync (removed) | used to need `PAT_TOKEN` | deleted, no longer needed |

## FAQ

### No auto-publish after the version PR merges

When changesets' "Version Packages" PR auto-merges into main, the resulting push occasionally doesn't trigger a new workflow run. Fix: push an empty commit to main (`git commit --allow-empty -m "ci: trigger release"`) to re-trigger `release.yml`. The publish step is idempotent and fills in all missing versions.

### CI not running on PRs

`ci.yml` must use `pull_request` (not just `pull_request_target`). The first time this trigger runs, GitHub asks a maintainer to **Approve** it once; after approval, bot-submitted PRs no longer need repeated approval.

### `node:sqlite` error when running pnpm locally

The repo requires Node >= 24 (pnpm 11.5 depends on `node:sqlite`). Locally you need at least Node v22.5+, and Node 24 is recommended.
