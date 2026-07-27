import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const e2eDir = path.resolve(dirname, '..');
const rootDir = path.resolve(e2eDir, '..');
const failedFile = path.resolve(e2eDir, '.artifacts/failed-tests.json');

const extraArgs = process.argv.slice(2).join(' ');

function main() {
  if (!fs.existsSync(failedFile)) {
    console.log('No failed test records found (.artifacts/failed-tests.json).');
    process.exit(0);
  }

  let records;
  try {
    records = JSON.parse(fs.readFileSync(failedFile, 'utf-8'));
  } catch {
    console.log('Failed to parse failed-tests.json. It may be corrupted.');
    process.exit(1);
  }

  if (records.length === 0) {
    console.log('No failed tests recorded.');
    process.exit(0);
  }

  const specFiles = [
    ...new Set(
      records.map((r) => {
        const rel = path.relative(rootDir, r.file);
        return rel;
      }),
    ),
  ];

  const existing = specFiles.filter((f) => fs.existsSync(path.resolve(rootDir, f)));

  if (existing.length === 0) {
    console.log('No matching test files found. Clearing failed records.');
    fs.writeFileSync(failedFile, '[]');
    process.exit(0);
  }

  console.log(`Re-running ${records.length} failed test(s) from ${existing.length} file(s):`);
  records.forEach((r) => console.log(`  ${r.title}`));
  console.log();

  execSync(`npx playwright test --config="${e2eDir}/playwright.config.ts" ${extraArgs} ${existing.join(' ')}`, {
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

  fs.writeFileSync(failedFile, '[]');
}

main();
