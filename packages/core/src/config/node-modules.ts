export interface NodeModules {
  readFileSync: (path: string, encoding: string) => string;
  existsSync: (path: string) => boolean;
  resolve: (...parts: string[]) => string;
}

let cached: NodeModules | null = null;

export async function getNodeModules(): Promise<NodeModules | null> {
  if (cached) return cached;
  try {
    const [fs, path] = await Promise.all([import('node:fs'), import('node:path')]);
    cached = {
      readFileSync: fs.readFileSync as (path: string, encoding: string) => string,
      existsSync: fs.existsSync,
      resolve: path.resolve as (...parts: string[]) => string,
    };
    return cached;
  } catch {
    return null;
  }
}
