import { ref } from 'vue';
import type { Ref } from 'vue';

/** Front matter dialog: parse the existing YAML block or build a new one. */
export function useFrontMatter(opts: {
  currentValue: Ref<string>;
  emitValue: (value: string) => void;
}) {
  const frontMatterOpen = ref(false);
  const frontMatterRaw = ref('');

  function parseFrontMatter(md: string): { content: string; start: number; end: number } | null {
    if (!md.startsWith('---\n')) return null;
    const endIdx = md.indexOf('\n---\n', 4);
    if (endIdx === -1) return null;
    return { content: md.slice(4, endIdx), start: 0, end: endIdx + 5 };
  }

  function openFrontMatter() {
    const existing = parseFrontMatter(opts.currentValue.value);
    frontMatterRaw.value = existing
      ? existing.content
      : 'title: \ncover: \ntags: []\nstatus: draft\n';
    frontMatterOpen.value = true;
  }

  function applyFrontMatter() {
    const md = opts.currentValue.value;
    const block = `---\n${frontMatterRaw.value.trimEnd()}\n---\n`;
    const existing = parseFrontMatter(md);
    opts.emitValue(
      existing ? md.slice(0, existing.start) + block + md.slice(existing.end) : block + md,
    );
    frontMatterOpen.value = false;
  }

  function removeFrontMatter() {
    const existing = parseFrontMatter(opts.currentValue.value);
    if (existing) opts.emitValue(opts.currentValue.value.slice(existing.end));
    frontMatterOpen.value = false;
  }

  return { frontMatterOpen, frontMatterRaw, openFrontMatter, applyFrontMatter, removeFrontMatter };
}
