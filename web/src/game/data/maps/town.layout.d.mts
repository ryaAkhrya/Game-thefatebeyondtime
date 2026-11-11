export interface TownItem { f: string; x: number; y: number; d?: number; flip?: boolean; id?: string; sh?: boolean; sol?: [number, number, number, number]; sols?: [number, number, number, number][] }
export const AVELORIA_ATLAS: string;
export const LIORA_ATLAS: string;
export const AVELORIA_ITEMS: TownItem[];
export const LIORA_ITEMS: TownItem[];
export function decorSolids(items: TownItem[]): { x: number; y: number; w: number; h: number }[];
