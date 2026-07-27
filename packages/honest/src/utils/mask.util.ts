export function maskSensitive(value: string | undefined, visibleChars = 4): string | undefined {
  if (!value) return value;
  if (value.length <= visibleChars) return '*'.repeat(value.length);
  return value.slice(0, visibleChars) + '*'.repeat(value.length - visibleChars);
}
