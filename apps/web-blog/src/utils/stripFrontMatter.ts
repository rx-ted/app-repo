const FRONT_MATTER_RE = /^---\r?\n[\s\S]*?\r?\n?---\r?\n?/;

export function stripFrontMatter(md: string): string {
  return md.replace(FRONT_MATTER_RE, '');
}
