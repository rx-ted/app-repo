#!/usr/bin/env node
/**
 * Sync an app from the monorepo to its public repository.
 *
 * Usage:
 *   node scripts/sync-public-repo.mjs <app-path> <public-repo> <version>
 *
 * Example:
 *   node scripts/sync-public-repo.mjs apps/blog rx-ted/blog 1.0.1
 *
 * Environment:
 *   GH_TOKEN   — GitHub token with contents:write on the public repo
 *   GITHUB_REPOSITORY — current repo (e.g. rx-ted/app), auto-set in Actions
 */

import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [appPath, publicRepo, version] = process.argv.slice(2);

if (!appPath || !publicRepo || !version) {
  console.error("Usage: node scripts/sync-public-repo.mjs <app-path> <public-repo> <version>");
  process.exit(1);
}

const ghToken = process.env.GH_TOKEN;
if (!ghToken) {
  console.error("GH_TOKEN environment variable is required");
  process.exit(1);
}

const sourceRepo = process.env.GITHUB_REPOSITORY;
if (!sourceRepo) {
  console.error("GITHUB_REPOSITORY environment variable is required");
  process.exit(1);
}

function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

// 1. Clone a bare copy of the monorepo for filter-repo
const workDir = mkdtempSync(join(tmpdir(), "sync-"));
const bareDir = join(workDir, "bare");
const targetDir = join(workDir, "public");

console.log(`\n=== Syncing ${appPath} → ${publicRepo} @ v${version} ===\n`);

run(`git clone --bare https://x-access-token:${ghToken}@github.com/${sourceRepo}.git ${bareDir}`);

// 2. Replace workspace:* deps before extracting
run("git config core.sparseCheckout true", { cwd: bareDir });
run(`git archive HEAD ${appPath}/package.json | tar -xC ${workDir}`, { cwd: bareDir });
const pkgPath = join(workDir, appPath, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const changed = [];

for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
  if (!pkg[key]) continue;
  for (const [name, ver] of Object.entries(pkg[key])) {
    if (!ver.startsWith("workspace:")) continue;
    const shortName = name.split("/").pop();
    const candidates = [
      join(bareDir, `packages/${shortName}/package.json`),
      join(bareDir, `packages/honest-plugins/${shortName}/package.json`),
    ];
    for (const candidate of candidates) {
      if (!existsSync(candidate)) continue;
      const { version: resolvedVersion } = JSON.parse(readFileSync(candidate, "utf8"));
      pkg[key][name] = `^${resolvedVersion}`;
      changed.push(`  ${name}: workspace:* → ^${resolvedVersion}`);
      break;
    }
  }
}

if (changed.length) {
  console.log("Replacing workspace:* deps:");
  changed.forEach((l) => console.log(l));
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
} else {
  console.log("No workspace:* deps to replace.");
}

// 3. Use git filter-repo to extract only the app directory
//    Install filter-repo if not available
try {
  execSync("git filter-repo --help", { stdio: "pipe" });
} catch {
  console.log("Installing git-filter-repo...");
  run("pip install git-filter-repo 2>/dev/null || brew install git-filter-repo 2>/dev/null || (curl -sL https://raw.githubusercontent.com/newren/git-filter-repo/main/git-filter-repo -o /usr/local/bin/git-filter-repo && chmod +x /usr/local/bin/git-filter-repo)");
}

// Reset to a clean state — filter-repo modifies the repo in place
// We use a fresh clone to avoid polluting the original
const cloneDir = join(workDir, "clone");
run(`git clone --no-local ${bareDir} ${cloneDir}`);

// Replace the package.json with our modified version
const origPkg = join(cloneDir, appPath, "package.json");
writeFileSync(origPkg, JSON.stringify(pkg, null, 2) + "\n");
run("git add -A && git commit -m \"chore: replace workspace:* with published versions\"", { cwd: cloneDir });

// Run filter-repo to extract only the app path
run(`git filter-repo --path ${appPath} --path-rename ${appPath}/: --force`, { cwd: cloneDir });

// 4. Push to public repo
const releaseBranch = `release/v${version}`;
const publicUrl = `https://x-access-token:${ghToken}@github.com/${publicRepo}.git`;

run(`git remote add origin ${publicUrl}`, { cwd: cloneDir });
run(`git push origin main:${releaseBranch} --force`, { cwd: cloneDir });

// 5. Create PR (only if not already open)
try {
  execSync(`gh pr view ${releaseBranch} --repo ${publicRepo}`, { stdio: "pipe" });
  console.log(`PR already exists for ${releaseBranch}, skipping creation.`);
} catch {
  run(
    `gh pr create --repo ${publicRepo} --base main --head ${releaseBranch} \
      --title "chore: release v${version}" \
      --body "Automated sync from ${sourceRepo}."`,
  );
}

console.log(`\n✓ ${appPath} synced to ${publicRepo}#${releaseBranch}\n`);
