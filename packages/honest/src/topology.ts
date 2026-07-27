/**
 * Topological sort for plugin dependency resolution.
 * Given a list of items with optional dependsOn arrays,
 * returns layers of items that can be started concurrently.
 */
export interface DependsOnItem {
  name: string;
  dependsOn: (string | Function)[];
}

export interface TopologyLayer<T extends DependsOnItem> {
  items: T[];
}

export type TokenResolver = (token: Function) => string | undefined;

/**
 * Performs topological sort and returns layers of items.
 * Items in the same layer have no dependencies on each other and can run concurrently.
 * Throws if a circular dependency or unresolvable dependency is detected.
 *
 * @param items - Items to sort
 * @param resolveToken - Optional function to resolve Function tokens to string names.
 *   If not provided, Function tokens are treated as their constructor name.
 */
export function topologicalSort<T extends DependsOnItem>(
  items: T[],
  resolveToken?: TokenResolver,
): TopologyLayer<T>[] {
  const graph = new Map<string, T>();
  const edges = new Map<string, Set<string>>();

  for (const item of items) {
    graph.set(item.name, item);
    edges.set(item.name, new Set());
  }

  const allNames = new Set(items.map((i) => i.name));

  for (const item of items) {
    for (const dep of item.dependsOn) {
      let depName: string | undefined;

      if (typeof dep === 'function') {
        depName = resolveToken?.(dep);
        if (depName === undefined) {
          const name = dep.name || 'anonymous';
          throw new Error(
            `[${item.name}] dependency "${name}" uses DI Token mode but is not registered. ` +
              'Use a string plugin name (e.g. "app:cache") instead, ' +
              'or call PluginEngine.registerToken(token, pluginName).',
          );
        }
      } else {
        depName = dep;
      }

      if (!allNames.has(depName)) {
        throw new Error(
          `[${item.name}] unknown dependency "${depName}". ` +
            `Available services: ${[...allNames].join(', ') || '(none)'}`,
        );
      }

      edges.get(item.name)!.add(depName);
    }
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function detectCycle(node: string, path: string[]): string | null {
    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const dep of edges.get(node) || []) {
      if (!visited.has(dep)) {
        const result = detectCycle(dep, path);
        if (result) return result;
      } else if (inStack.has(dep)) {
        const cycleStart = path.indexOf(dep);
        const cycle = path.slice(cycleStart).concat(dep);
        return cycle.join(' -> ');
      }
    }

    path.pop();
    inStack.delete(node);
    return null;
  }

  for (const item of items) {
    if (!visited.has(item.name)) {
      const cycle = detectCycle(item.name, []);
      if (cycle) {
        throw new Error(`Circular dependency detected: ${cycle}`);
      }
    }
  }

  const layers: TopologyLayer<T>[] = [];
  const remaining = new Set(items.map((i) => i.name));
  const resolved = new Set<string>();

  while (remaining.size > 0) {
    const layer: T[] = [];

    for (const name of remaining) {
      const item = graph.get(name)!;
      const deps = edges.get(name) || new Set();
      const allResolved = [...deps].every((d) => resolved.has(d));

      if (allResolved) {
        layer.push(item);
      }
    }

    if (layer.length === 0) {
      throw new Error(`Cannot resolve dependencies for: ${[...remaining].join(', ')}`);
    }

    for (const item of layer) {
      remaining.delete(item.name);
      resolved.add(item.name);
    }

    layers.push({ items: layer });
  }

  return layers;
}
