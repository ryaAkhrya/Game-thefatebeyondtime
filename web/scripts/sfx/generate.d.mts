export const OUT_DIR: string;
export interface RenderedFile { file: string; wav: Buffer; sha256: string; peakDb: number; rmsDb: number; durationMs: number }
export interface RenderedCue { entry: import('./catalog.mjs').CatalogEntry; files: RenderedFile[] }
export function renderAll(): RenderedCue[];
