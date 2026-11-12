export interface CatalogEntry {
  id: string; category: string; variants: number; phase: number; minIntervalMs: number; gain: number; trigger: string; desc: string; recipe: string;
}
export const CATALOG: CatalogEntry[];
export const CATEGORY_LIMITS: Record<string, { minMs: number; maxMs: number; rmsMin: number; rmsMax: number }>;
