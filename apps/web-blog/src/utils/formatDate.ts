export function formatDate(date?: string): string {
  if (!date) return '';
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

export function formatDateTime(date?: string, locale?: string): string {
  if (!date) return '';
  return new Date(date).toLocaleString(locale);
}
