export function headingId({ text }: { text: string }): string {
  return (
    text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}_-]/gu, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'heading'
  );
}
