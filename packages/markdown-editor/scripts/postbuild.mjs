import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dtsPath = resolve(__dirname, '../dist/index.d.ts');

let content = readFileSync(dtsPath, 'utf8');
const removed = content.includes("import './styles/theme.css'");
content = content.replace("import './styles/theme.css';\n", '');
writeFileSync(dtsPath, content);

if (removed) {
  console.log('[postbuild] stripped side-effect css import from dist/index.d.ts');
}
