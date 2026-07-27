import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface WorkspaceAliases {
  [key: string]: string;
}

function getWorkspacePackagePaths(): string[] {
  const yamlPath = resolve(__dirname, 'pnpm-workspace.yaml');
  const yaml = readFileSync(yamlPath, 'utf-8');
  const results: string[] = [];
  const lines = yaml.split('\n');
  let inPackages = false;
  for (const line of lines) {
    if (line.startsWith('packages:')) {
      inPackages = true;
      continue;
    }
    if (!inPackages) continue;
    if (line.trim().startsWith('- ')) {
      const raw = line.trim().slice(2).replace(/["']/g, '');
      const base = raw.replace(/\/\*\*?$/, '');
      const dir = resolve(__dirname, base);
      if (existsSync(dir)) {
        results.push(dir);
      }
    }
  }
  return results;
}

export function getWorkspaceAliases(): WorkspaceAliases {
  const entries: [string, string][] = [];
  for (const pkgDir of getWorkspacePackagePaths()) {
    const pkgPath = resolve(pkgDir, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    if (!pkg.name) continue;
    const exports = pkg.exports as Record<string, unknown> | undefined;
    if (!exports) continue;
    for (const [exportPath, exportEntry] of Object.entries(exports)) {
      if (typeof exportEntry !== 'object' || exportEntry === null) continue;
      const vitestEntry = (exportEntry as Record<string, string>)['vitest'];
      if (!vitestEntry) continue;
      const aliasKey = exportPath === '.' ? pkg.name : `${pkg.name}${exportPath.slice(1)}`;
      entries.push([aliasKey, resolve(pkgDir, vitestEntry)]);
    }
  }
  entries.sort((a, b) => b[0].length - a[0].length);
  const aliases: WorkspaceAliases = {};
  for (const [key, value] of entries) {
    aliases[key] = value;
  }
  return aliases;
}
