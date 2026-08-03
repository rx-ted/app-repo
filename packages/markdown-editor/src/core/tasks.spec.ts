import { describe, it, expect } from 'vitest';
import { isTaskChecked, toggleTask } from './tasks';

describe('toggleTask', () => {
  const md = '# Title\n\n- [ ] todo a\n- [x] done b\n';

  it('checks an unchecked task item', () => {
    const blockStart = md.indexOf('- [ ]');
    const next = toggleTask(md, blockStart, true);
    expect(next).toContain('- [x] todo a');
    expect(next).toContain('- [x] done b');
  });

  it('unchecks a checked task item', () => {
    const blockStart = md.indexOf('- [x]');
    const next = toggleTask(md, blockStart, false);
    expect(next).toContain('- [ ] done b');
    expect(next).toContain('- [ ] todo a');
  });

  it('preserves the rest of the document', () => {
    const next = toggleTask(md, md.indexOf('- [x]'), true);
    expect(next.startsWith('# Title\n')).toBe(true);
  });

  it('supports bullet variants and uppercase checked marker', () => {
    const m = '* [X] caps\n+ [ ] plus\n1. [ ] ordered';
    expect(toggleTask(m, m.indexOf('[X]') - 2, false)).toContain('* [ ] caps');
    expect(toggleTask(m, m.indexOf('+ [ ]') + 2, true)).toContain('+ [x] plus');
    expect(toggleTask(m, m.indexOf('1. [ ]') + 3, true)).toContain('1. [x] ordered');
  });

  it('only rewrites the targeted list item, not later text', () => {
    const next = toggleTask(md, md.indexOf('- [ ]'), true);
    expect(next).toContain('- [x] todo a');
    expect(next).toContain('done b');
  });

  it('returns the document unchanged when no task marker is present in the block', () => {
    const m = '- just an item';
    expect(toggleTask(m, 0, true)).toBe(m);
  });

  it('returns the document unchanged for an out-of-range offset', () => {
    expect(toggleTask(md, md.length + 5, true)).toBe(md);
  });
});

describe('isTaskChecked', () => {
  const md = '# Title\n\n- [ ] todo a\n- [x] done b\n';

  it('reads the checked state from the source marker', () => {
    expect(isTaskChecked(md, md.indexOf('- [ ]'))).toBe(false);
    expect(isTaskChecked(md, md.indexOf('- [x]'))).toBe(true);
  });

  it('supports uppercase X as checked', () => {
    const m = '* [X] caps';
    expect(isTaskChecked(m, m.indexOf('[X]') - 2)).toBe(true);
  });

  it('returns null when the item has no task marker', () => {
    expect(isTaskChecked('- just an item', 0)).toBeNull();
  });

  it('returns null for an out-of-range offset', () => {
    expect(isTaskChecked(md, md.length + 5)).toBeNull();
  });
});
