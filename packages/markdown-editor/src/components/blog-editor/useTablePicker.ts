import { ref } from 'vue';
import { TABLE_MAX_COLS } from './constants';

/** Table picker popover: hover state plus insert on click. */
export function useTablePicker(opts: { insertTable: (rows: number, cols: number) => void }) {
  const tablePickerOpen = ref(false);
  const hoverRows = ref(2);
  const hoverCols = ref(2);

  function onTableCellHover(i: number) {
    hoverRows.value = Math.floor((i - 1) / TABLE_MAX_COLS) + 1;
    hoverCols.value = ((i - 1) % TABLE_MAX_COLS) + 1;
  }

  function onTableCellClick(i: number) {
    opts.insertTable(Math.floor((i - 1) / TABLE_MAX_COLS) + 1, ((i - 1) % TABLE_MAX_COLS) + 1);
    tablePickerOpen.value = false;
  }

  return { tablePickerOpen, hoverRows, hoverCols, onTableCellHover, onTableCellClick };
}
