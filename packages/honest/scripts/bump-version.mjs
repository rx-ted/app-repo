import fs from 'node:fs';

const pkgPath = './package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

let newMajor = major;
let newMinor = minor;
let newPatch = patch;

const { execSync } = await import('node:child_process');
const commitMsg = execSync('git log -1 --pretty=%B', {
  encoding: 'utf-8',
}).trim();
const firstLine = commitMsg.split('\n')[0];

const typeMatch = firstLine.match(/^(\w+)(?:\([^)]+\))?[!:]/);

if (!typeMatch || firstLine.startsWith('chore(release):')) {
  console.log('Skipping version bump (not a conventional commit or already a release commit)');
  process.exit(0);
}

const type = typeMatch[1];
const hasBreaking = firstLine.includes('!:') || commitMsg.includes('BREAKING CHANGE');

if (hasBreaking) {
  newMajor = major + 1;
  newMinor = 0;
  newPatch = 0;
  console.log('Breaking change detected, major version bump');
} else if (type === 'feat') {
  newMinor = minor + 1;
  newPatch = 0;
  console.log(`Feature detected (${type}), minor version bump`);
} else {
  newPatch = patch + 1;
  console.log(`Change detected (${type}), patch version bump`);
}

const newVersion = `${newMajor}.${newMinor}.${newPatch}`;
pkg.version = newVersion;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`Version bumped: ${pkg.version} → ${newVersion}`);

try {
  execSync('git add package.json', { stdio: 'inherit' });
  execSync(`git commit -m "chore(release): bump version to ${newVersion}"`, {
    stdio: 'inherit',
  });
  execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, {
    stdio: 'inherit',
  });
  console.log(`Created tag: v${newVersion}`);
  execSync('git push && git push --tags', { stdio: 'inherit' });
  console.log('Pushed commits and tags to remote');
} catch (error) {
  console.error('Failed to commit/tag/push:', error.message);
  process.exit(1);
}
