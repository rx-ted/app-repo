const TASK_MARKER = /\[([ xX])\]/;

/**
 * Read the GFM task-list marker (`[ ]` / `[x]`) on a list item's opening line.
 *
 * `blockStartOffset` is the source offset of the list item (the `data-node`
 * offset captured by the source map). Returns `null` when the item has no task
 * marker.
 */
function readMarker(md: string, blockStartOffset: number): number | null {
  if (blockStartOffset < 0 || blockStartOffset >= md.length) return null;
  const lineEnd = md.indexOf('\n', blockStartOffset);
  const windowEnd = lineEnd === -1 ? md.length : lineEnd;
  const marker = TASK_MARKER.exec(md.slice(blockStartOffset, windowEnd));
  return marker ? blockStartOffset + marker.index : null;
}

/**
 * Whether a GFM task-list item is currently checked, read from the source.
 *
 * Unlike `input.checked` in a DOM `click` handler — where the browser has
 * already flipped the state before the handler runs — this reflects the
 * persisted markdown. Returns `null` when the item has no task marker.
 */
export function isTaskChecked(md: string, blockStartOffset: number): boolean | null {
  const absStart = readMarker(md, blockStartOffset);
  if (absStart === null) return null;
  return md[absStart + 1].toLowerCase() === 'x';
}

/**
 * Toggle a GFM task-list marker (`[ ]` / `[x]`) in a markdown string.
 *
 * `blockStartOffset` is the source offset of the list item (the `data-node`
 * offset captured by the source map); the marker is the first task checkbox
 * found on that item's opening line.
 *
 * Returns a new string; returns the input unchanged when no marker is found.
 */
export function toggleTask(md: string, blockStartOffset: number, checked: boolean): string {
  const absStart = readMarker(md, blockStartOffset);
  if (absStart === null) return md;
  return md.slice(0, absStart) + (checked ? '[x]' : '[ ]') + md.slice(absStart + 3);
}
