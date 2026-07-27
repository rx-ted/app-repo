export function resolveKey(
  key: string,
  source: Record<string, string | undefined>,
  prefixes: string[] = [],
): string | undefined {
  if (key in source) return source[key];
  for (const prefix of prefixes) {
    const prefixed = `${prefix}${key}`;
    if (prefixed in source) return source[prefixed];
  }
  return undefined;
}

export function filterKeys(
  source: Record<string, string | undefined>,
  prefixes: string[],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(source)) {
    for (const prefix of prefixes) {
      if (key.startsWith(prefix)) {
        result[key] = source[key] ?? '';
        break;
      }
    }
  }
  return result;
}
