import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { POST_META_KEYS, warnUnknownMetaFields } from '@/lib/post-parser';

// ─── Config ────────────────────────────────────────────────────────
const SOURCE_DIRS = ['docs/architecture', 'docs/guides'];
const POST_PREFIX = '/posts';
const ROOT = resolve(import.meta.dirname, '..');

interface FrontMatter {
  title?: string;
  author?: string;
  date?: string;
  category?: string;
  tags?: string[];
  slug?: string;
  doc_hash?: string;
  status?: string;
  visibility?: string;
  allow_comment?: boolean;
  pinned?: boolean;
  featured_weight?: number;
  lang?: string;
  cover?: string;
}

interface Doc {
  filePath: string;
  absPath: string;
  slug: string;
  docHash: string;
  frontMatter: FrontMatter;
  rawFrontMatter: Record<string, unknown>;
  body: string;
  contentMd: string;
}

// ─── YAML front-matter parser ─────────────────────────────────────
function parseFrontMatter(content: string): { frontMatter: FrontMatter; rawFrontMatter: Record<string, unknown>; body: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) return { frontMatter: {}, rawFrontMatter: {}, body: content };

  const yaml = match[1];
  const body = content.slice(match[0].length);
  const raw: Record<string, unknown> = {};
  let currentKey: string | null = null;

  for (const line of yaml.split('\n')) {
    const keyMatch = line.match(/^(\w+):\s*(.*)/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      let value: unknown = keyMatch[2].trim();
      if (value === '') continue;
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (value === 'null') value = null;
      else if (!isNaN(Number(value))) value = Number(value);
      raw[currentKey] = value;
    } else if (currentKey && line.match(/^\s+- /)) {
      const arrVal = line.replace(/^\s+- /, '').trim();
      if (!Array.isArray(raw[currentKey])) raw[currentKey] = [];
      (raw[currentKey] as string[]).push(arrVal);
    }
  }

  warnUnknownMetaFields(raw);

  const fm: Record<string, unknown> = {};
  for (const key of POST_META_KEYS) {
    if (raw[key] !== undefined) fm[key] = raw[key];
  }

  return { frontMatter: fm as FrontMatter, rawFrontMatter: raw, body };
}

function buildFrontMatterYaml(fm: Record<string, unknown>): string {
  const lines = ['---'];
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) {
      if (v.length > 0) {
        lines.push(`${k}:`);
        for (const item of v) lines.push(`  - ${item}`);
      }
    } else if (v !== undefined && v !== null) {
      const strVal = typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v);
      lines.push(`${k}: ${strVal}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

// ─── Slug generation ─────────────────────────────────────────────
function filePathToSlug(relPath: string, usedSlugs: Set<string>): string {
  const dir = dirname(relPath);
  const name = basename(relPath, '.md');
  const prefix = dir.replace(/^docs\//, '').replace(/\//g, '-');

  let slug: string;
  if (name === 'README') {
    slug = prefix;
  } else {
    slug = prefix ? `${prefix}-${name}` : name;
  }

  if (!usedSlugs.has(slug)) {
    usedSlugs.add(slug);
    return slug;
  }
  let i = 1;
  while (usedSlugs.has(`${slug}-${i}`)) i++;
  usedSlugs.add(`${slug}-${i}`);
  return `${slug}-${i}`;
}

// ─── Hash ─────────────────────────────────────────────────────────
function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

// ─── Language ─────────────────────────────────────────────────────
function deriveLang(slug: string): 'zh-CN' | 'en' {
  return slug.endsWith('.zh') ? 'zh-CN' : 'en';
}

// ─── Image discovery ──────────────────────────────────────────────
const MD_IMG_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

/** Per-doc result: if a doc has local images, list them. */
interface DocImageResult {
  doc: Doc;
  images: string[];  // relative paths of local images
}

function discoverDocImages(docs: Doc[], bodies: Map<string, string>): DocImageResult[] {
  const results: DocImageResult[] = [];

  for (const doc of docs) {
    const body = bodies.get(doc.filePath)!;
    const sourceDir = dirname(doc.absPath);
    MD_IMG_RE.lastIndex = 0;

    const localImages: string[] = [];
    for (const match of body.matchAll(MD_IMG_RE)) {
      const rawPath = match[2].trim();
      if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) continue;

      const resolved = resolve(sourceDir, rawPath);
      const relativePath = relative(ROOT, resolved);

      try {
        if (statSync(resolved).isFile()) {
          localImages.push(relativePath);
        }
      } catch { /* skip */ }
    }

    if (localImages.length > 0) {
      results.push({ doc, images: localImages });
    }
  }

  return results;
}

// ─── Content rewriting ────────────────────────────────────────────
interface LinkMap {
  [absPath: string]: string;
}

const MD_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;

function rewriteBody(
  body: string,
  sourceFileAbsPath: string,
  linkMap: LinkMap,
): string {
  const sourceDir = dirname(sourceFileAbsPath);

  return body.replace(MD_LINK_RE, (match, text, rawPath) => {
    const path = rawPath.trim();
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('#')) return match;

    const resolved = resolve(sourceDir, path);
    const relativePath = relative(ROOT, resolved);

    // Image — skip (user uploads manually via frontend)
    if (match.startsWith('![')) return match;

    // .md link
    if (path.endsWith('.md')) {
      const targetSlug = linkMap[resolved];
      if (targetSlug) return `[${text}](${POST_PREFIX}/${targetSlug})`;
      if (!warnedLinks.has(relativePath)) {
        warnedLinks.add(relativePath);
        console.warn(`  ⚠ No slug for: ${relativePath} (from ${relative(ROOT, sourceFileAbsPath)})`);
      }
      return match;
    }

    return match;
  });
}

const warnedLinks = new Set<string>();

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
  const root = ROOT;

  // ── Phase 1: Discover files ────────────────────────────────────
  console.log('📂 Discovering files...');
  const allMdFiles: string[] = [];
  for (const dir of SOURCE_DIRS) {
    const absDir = join(root, dir);
    for (const entry of readdirSync(absDir, { recursive: true }) as string[]) {
      const absPath = join(absDir, entry);
      if (statSync(absPath).isFile() && entry.endsWith('.md')) {
        allMdFiles.push(relative(root, absPath));
      }
    }
  }

  // ── Phase 2: Parse & build slug map ───────────────────────────
  const usedSlugs = new Set<string>();
  const linkMap: LinkMap = {};
  const docs: Doc[] = [];
  const rawBodies = new Map<string, string>();

  for (const relPath of allMdFiles) {
    const absPath = join(root, relPath);
    const content = readFileSync(absPath, 'utf-8');
    const { frontMatter, rawFrontMatter, body } = parseFrontMatter(content);

    const slug = filePathToSlug(relPath, usedSlugs);
    linkMap[absPath] = slug;
    const docHash = sha256(body);
    rawBodies.set(relPath, body);

    docs.push({ filePath: relPath, absPath, slug, docHash, frontMatter, rawFrontMatter, body, contentMd: '' });
  }

  console.log(`  Found ${docs.length} documents`);

  // ── Phase 3: Discover images → skip docs with local images ────
  const imageResults = discoverDocImages(docs, rawBodies);
  const docPathsWithImages = new Set(imageResults.map((r) => r.doc.filePath));

  if (imageResults.length > 0) {
    console.log('\n🖼  Docs with local images (skipped from seed — edit via frontend):');
    for (const r of imageResults) {
      console.log(`     ${r.doc.filePath}`);
      for (const img of r.images) {
        console.log(`       └─ ${img}`);
      }
    }
  }

  // ── Phase 4: Rewrite content (only .md links, images left as-is) ──
  console.log('\n✏️  Rewriting markdown links...');
  const seededDocs: Doc[] = [];
  const skippedPaths: string[] = [];

  for (const doc of docs) {
    if (docPathsWithImages.has(doc.filePath)) {
      skippedPaths.push(doc.filePath);
      continue;
    }

    const rewritten = rewriteBody(doc.body, doc.absPath, linkMap);
    const fm: Record<string, unknown> = { ...doc.rawFrontMatter, slug: doc.slug, doc_hash: doc.docHash };
    doc.contentMd = buildFrontMatterYaml(fm) + '\n' + rewritten;
    seededDocs.push(doc);
  }

  // ── Phase 5: Output ────────────────────────────────────────────
  const output = seededDocs.map((doc) => ({
    title: doc.frontMatter.title || doc.slug,
    slug: doc.slug,
    doc_hash: doc.docHash,
    content_md: doc.contentMd,
    status: doc.frontMatter.status || 'published',
    visibility: doc.frontMatter.visibility || 'public',
    allow_comment: doc.frontMatter.allow_comment ?? true,
    is_pinned: doc.frontMatter.pinned ?? false,
    featured_weight: doc.frontMatter.featured_weight ?? 0,
    lang: doc.frontMatter.lang ?? deriveLang(doc.slug),
    cover: doc.frontMatter.cover ?? null,
    author: doc.frontMatter.author ?? null,
  }));

  const outputPath = join(root, 'apps', 'platform-api', 'src', 'seed-data', 'import-docs-output.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n✅ ${seededDocs.length} documents ready for seed`);
  console.log(`📝 ${outputPath}`);

  if (skippedPaths.length > 0) {
    console.log(`\n⏭️  ${skippedPaths.length} doc(s) skipped (local images):`);
    for (const p of skippedPaths) {
      console.log(`     ${p}`);
    }
    console.log('\n👉 To finish them: open frontend editor, create post, upload images.');
  }

  console.log('');
  const maxSlugLen = Math.max(...output.map((d) => d.slug.length));
  for (const doc of output) {
    const hashShort = doc.doc_hash.slice(0, 12);
    console.log(`  ${doc.slug.padEnd(maxSlugLen + 2)} ${hashShort}  ${doc.title}`);
  }
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
