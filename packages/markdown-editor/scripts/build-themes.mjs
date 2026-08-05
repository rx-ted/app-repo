import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from 'sass';

const __dirname = dirname(fileURLToPath(import.meta.url));
const themesDir = resolve(__dirname, '../src/themes');
const outDir = join(themesDir, '__gen');

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const sources = (await readdir(themesDir))
  .filter((f) => f.endsWith('.scss') && !f.startsWith('_'))
  .sort();

for (const file of sources) {
  const result = compile(join(themesDir, file), {
    style: 'expanded',
    url: new URL(`file://${join(themesDir, file)}`),
  });
  await writeFile(join(outDir, file.replace(/\.scss$/, '.css')), result.css);
}

console.log(`[build-themes] compiled ${sources.length} theme(s) into ${outDir}`);
