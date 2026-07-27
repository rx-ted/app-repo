import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'node:fs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const e2eDir = path.resolve(dirname, '..');
const rootDir = path.resolve(e2eDir, '..');
const testDir = path.resolve(e2eDir, 'tests/web-blog');

const SHARED_DIRS = [
  'src/http/',
  'src/router/',
  'src/config/',
  'src/constants/',
  'src/i18n/',
  'src/layouts/',
  'src/styles/',
  'src/theme/',
  'src/types/',
  'src/utils/',
  'src/composables/',
  'src/components/ui/',
  'src/components/ads/',
  'src/App.vue',
  'src/main.ts',
];

const PAGE_MAP = {
  'pages/HomePage.vue': 'home',
  'pages/LoginPage.vue': 'login',
  'pages/RegisterPage.vue': 'register',
  'pages/ForgotPasswordPage.vue': 'forgot-password',
  'pages/PostListPage.vue': 'posts',
  'pages/PostDetailPage.vue': 'posts',
  'pages/DashboardPage.vue': 'dashboard',
  'pages/EditorPage.vue': 'editor',
  'pages/ProfilePage.vue': 'profile',
  'pages/AuthorPage.vue': 'author',
  'pages/SearchPage.vue': 'search',
  'pages/AboutPage.vue': 'static-pages',
  'pages/ChangelogPage.vue': 'static-pages',
  'pages/CopyrightPage.vue': 'static-pages',
  'pages/TaxonomyPage.vue': 'static-pages',
  'pages/NotFoundPage.vue': null,
};

const SUBPAGE_MAP = {
  'pages/dashboard/DraftsPage.vue': ['dashboard', 'editor'],
  'pages/dashboard/PostsPage.vue': ['posts', 'dashboard'],
  'pages/dashboard/CategoriesPage.vue': 'dashboard',
  'pages/dashboard/TagsPage.vue': 'dashboard',
  'pages/dashboard/SettingsPage.vue': 'dashboard',
};

const COMPONENT_MAP = {
  'components/auth/': ['login', 'register'],
  'components/blog/': ['home', 'posts', 'author'],
  'components/search/': ['search'],
  'components/dashboard/': ['dashboard'],
  'components/editor/': ['editor'],
  'components/editors/': ['editor'],
  'components/comment/': ['posts'],
  'components/users/': ['login', 'register', 'author', 'profile'],
};

const STORE_MAP = {
  'stores/blog.ts': ['home', 'posts'],
  'stores/session.ts': ['login', 'register', 'dashboard', 'editor', 'profile'],
  'stores/postDetail.ts': ['posts'],
  'stores/comment.ts': ['posts'],
};

function getChangedFiles() {
  const baseBranch = process.env.BASE_BRANCH || 'origin/main';

  const results = new Set();

  try {
    const mergeBase = execSync(`git merge-base HEAD ${baseBranch}`, {
      encoding: 'utf-8',
    }).trim();
    const branchDiff = execSync(`git diff --name-only ${mergeBase}...HEAD`, {
      encoding: 'utf-8',
    }).trim();
    branchDiff
      .split('\n')
      .filter(Boolean)
      .forEach((f) => results.add(f));
  } catch {
    // no upstream branch, fall through
  }

  try {
    const staged = execSync('git diff --name-only --cached', {
      encoding: 'utf-8',
    }).trim();
    staged
      .split('\n')
      .filter(Boolean)
      .forEach((f) => results.add(f));
  } catch {
    // no staged changes
  }

  try {
    const unstaged = execSync('git diff --name-only', {
      encoding: 'utf-8',
    }).trim();
    unstaged
      .split('\n')
      .filter(Boolean)
      .forEach((f) => results.add(f));
  } catch {
    // no unstaged changes
  }

  return [...results];
}

function getRelativePath(file) {
  const normalised = file.replace(/\\/g, '/');

  const marker = '/apps/web-blog/';
  const idx = normalised.indexOf(marker);
  if (idx !== -1) {
    return normalised.slice(idx + marker.length);
  }

  if (normalised.startsWith('src/')) {
    return normalised;
  }

  if (normalised.startsWith('e2e/')) {
    return normalised;
  }

  return null;
}

function resolveTestNames(changedFiles) {
  const matched = new Set();
  let needsAll = false;

  for (const file of changedFiles) {
    const rel = getRelativePath(file);
    if (!rel) continue;

    if (rel.startsWith('e2e/')) continue;

    for (const dir of SHARED_DIRS) {
      if (rel.startsWith(dir)) {
        needsAll = true;
        break;
      }
    }
    if (needsAll) break;

    if (rel.startsWith('packages/')) {
      needsAll = true;
      break;
    }

    const srcPath = rel.startsWith('src/') ? rel.slice(4) : rel;

    for (const [pattern, testNames] of Object.entries(PAGE_MAP)) {
      if (srcPath === pattern || srcPath.endsWith(`/${pattern}`)) {
        if (testNames) {
          if (Array.isArray(testNames)) {
            testNames.forEach((n) => matched.add(n));
          } else {
            matched.add(testNames);
          }
        }
      }
    }

    for (const [pattern, testNames] of Object.entries(SUBPAGE_MAP)) {
      if (srcPath === pattern || srcPath.endsWith(`/${pattern}`)) {
        if (Array.isArray(testNames)) {
          testNames.forEach((n) => matched.add(n));
        } else {
          matched.add(testNames);
        }
      }
    }

    for (const [dir, testNames] of Object.entries(COMPONENT_MAP)) {
      if (srcPath.startsWith(dir)) {
        if (testNames === '*') {
          needsAll = true;
          break;
        }
        if (Array.isArray(testNames)) {
          testNames.forEach((n) => matched.add(n));
        } else {
          matched.add(testNames);
        }
      }
    }
    if (needsAll) break;

    for (const [store, testNames] of Object.entries(STORE_MAP)) {
      if (srcPath === store || srcPath.endsWith(`/${store}`)) {
        if (testNames === '*') {
          needsAll = true;
          break;
        }
        if (Array.isArray(testNames)) {
          testNames.forEach((n) => matched.add(n));
        } else {
          matched.add(testNames);
        }
      }
    }
    if (needsAll) break;
  }

  if (needsAll) {
    return fs
      .readdirSync(testDir, { recursive: true })
      .filter((f: string) => typeof f === 'string' && f.endsWith('.spec.ts'))
      .map((f: string) => f.replace('.spec.ts', ''));
  }

  return [...matched];
}

function findSpecFile(name: string): string | null {
  const files = globSync(`**/${name}.spec.ts`, { cwd: testDir });
  return files.length > 0 ? files[0] : null;
}

const extraArgs = process.argv.slice(2).join(' ');

function main() {
  const changedFiles = getChangedFiles();

  if (changedFiles.length === 0) {
    console.log('No changed files detected. Running all e2e tests.');
    execSync(`npx playwright test --config="${e2eDir}/playwright.config.ts" ${extraArgs}`, {
      stdio: 'inherit',
      cwd: rootDir,
      env: {
        ...process.env,
        PLAYWRIGHT_PORT: process.env.PLAYWRIGHT_PORT || '5173',
        http_proxy: '',
        https_proxy: '',
        HTTP_PROXY: '',
        HTTPS_PROXY: '',
        all_proxy: '',
        ALL_PROXY: '',
      },
    });
    return;
  }

  console.log('Changed files:');
  changedFiles.forEach((f) => console.log(`  ${f}`));

  const testNames = resolveTestNames(changedFiles);

  if (testNames.length === 0) {
    console.log('\nNo affected e2e tests found. Skipping.');
    return;
  }

  const specFiles = testNames
    .map((name) => findSpecFile(name))
    .filter(Boolean) as string[];

  if (specFiles.length === 0) {
    console.log('\nNo matching test files exist. Skipping.');
    return;
  }

  console.log(`\nRunning ${specFiles.length} affected test(s):`);
  specFiles.forEach((f) => console.log(`  e2e/tests/web-blog/${f}`));

  const paths = specFiles.map((f) => `e2e/tests/web-blog/${f}`);
  execSync(`npx playwright test --config="${e2eDir}/playwright.config.ts" ${extraArgs} ${paths.join(' ')}`, {
    stdio: 'inherit',
    cwd: rootDir,
    env: {
      ...process.env,
      PLAYWRIGHT_PORT: process.env.PLAYWRIGHT_PORT || '5173',
      http_proxy: '',
      https_proxy: '',
      HTTP_PROXY: '',
      HTTPS_PROXY: '',
      all_proxy: '',
      ALL_PROXY: '',
    },
  });
}

main();
