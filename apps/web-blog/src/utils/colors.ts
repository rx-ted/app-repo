/**
 * Shared unique color palette for tags & categories.
 * 30 visually distinct colors — no repeats, works in light & dark.
 */

export interface PaletteColor {
  solid: string;
  gradient: [string, string];
  light: string;
  lightBorder: string;
}

export const PALETTE: PaletteColor[] = [
  { solid: '#6366f1', gradient: ['#6366f1', '#818cf8'], light: '#eef2ff', lightBorder: '#c7d2fe' },
  { solid: '#ec4899', gradient: ['#ec4899', '#f472b6'], light: '#fdf2f8', lightBorder: '#fbcfe8' },
  { solid: '#10b981', gradient: ['#10b981', '#34d399'], light: '#ecfdf5', lightBorder: '#a7f3d0' },
  { solid: '#f59e0b', gradient: ['#f59e0b', '#fbbf24'], light: '#fffbeb', lightBorder: '#fde68a' },
  { solid: '#8b5cf6', gradient: ['#8b5cf6', '#a78bfa'], light: '#f5f3ff', lightBorder: '#ddd6fe' },
  { solid: '#06b6d4', gradient: ['#06b6d4', '#22d3ee'], light: '#ecfeff', lightBorder: '#a5f3fc' },
  { solid: '#ef4444', gradient: ['#ef4444', '#f87171'], light: '#fef2f2', lightBorder: '#fecaca' },
  { solid: '#14b8a6', gradient: ['#14b8a6', '#5eead4'], light: '#f0fdfa', lightBorder: '#99f6e4' },
  { solid: '#f43f5e', gradient: ['#f43f5e', '#fb7185'], light: '#fff1f2', lightBorder: '#fecdd3' },
  { solid: '#3b82f6', gradient: ['#3b82f6', '#60a5fa'], light: '#eff6ff', lightBorder: '#bfdbfe' },
  { solid: '#22c55e', gradient: ['#22c55e', '#4ade80'], light: '#f0fdf4', lightBorder: '#bbf7d0' },
  { solid: '#a855f7', gradient: ['#a855f7', '#c084fc'], light: '#faf5ff', lightBorder: '#e9d5ff' },
  { solid: '#f97316', gradient: ['#f97316', '#fb923c'], light: '#fff7ed', lightBorder: '#fed7aa' },
  { solid: '#0ea5e9', gradient: ['#0ea5e9', '#38bdf8'], light: '#f0f9ff', lightBorder: '#bae6fd' },
  { solid: '#d946ef', gradient: ['#d946ef', '#e879f9'], light: '#fdf4ff', lightBorder: '#f0abfc' },
  { solid: '#84cc16', gradient: ['#84cc16', '#a3e635'], light: '#f7fee7', lightBorder: '#d9f99d' },
  { solid: '#e11d48', gradient: ['#e11d48', '#fb7185'], light: '#fff1f2', lightBorder: '#fecdd3' },
  { solid: '#0d9488', gradient: ['#0d9488', '#2dd4bf'], light: '#f0fdfa', lightBorder: '#99f6e4' },
  { solid: '#7c3aed', gradient: ['#7c3aed', '#a78bfa'], light: '#f5f3ff', lightBorder: '#ddd6fe' },
  { solid: '#ea580c', gradient: ['#ea580c', '#fb923c'], light: '#fff7ed', lightBorder: '#fed7aa' },
  { solid: '#0284c7', gradient: ['#0284c7', '#38bdf8'], light: '#f0f9ff', lightBorder: '#bae6fd' },
  { solid: '#c026d3', gradient: ['#c026d3', '#e879f9'], light: '#fdf4ff', lightBorder: '#f0abfc' },
  { solid: '#65a30d', gradient: ['#65a30d', '#a3e635'], light: '#f7fee7', lightBorder: '#d9f99d' },
  { solid: '#dc2626', gradient: ['#dc2626', '#f87171'], light: '#fef2f2', lightBorder: '#fecaca' },
  { solid: '#0891b2', gradient: ['#0891b2', '#22d3ee'], light: '#ecfeff', lightBorder: '#a5f3fc' },
  { solid: '#9333ea', gradient: ['#9333ea', '#c084fc'], light: '#faf5ff', lightBorder: '#e9d5ff' },
  { solid: '#ca8a04', gradient: ['#ca8a04', '#facc15'], light: '#fefce8', lightBorder: '#fef08a' },
  { solid: '#2563eb', gradient: ['#2563eb', '#60a5fa'], light: '#eff6ff', lightBorder: '#bfdbfe' },
  { solid: '#db2777', gradient: ['#db2777', '#f472b6'], light: '#fdf2f8', lightBorder: '#fbcfe8' },
  { solid: '#059669', gradient: ['#059669', '#34d399'], light: '#ecfdf5', lightBorder: '#a7f3d0' },
];

/** Get a color by index, wrapping around if needed. */
export function getColor(index: number): PaletteColor {
  return PALETTE[index % PALETTE.length];
}
