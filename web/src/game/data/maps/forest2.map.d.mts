import type { ForestMap, MapProp, WalkableShape } from './forest1.map.mjs';

export const FOREST2_W: number;
export const FOREST2_H: number;
export const FOREST2_WALKABLE: WalkableShape[];
export const FOREST2_SOLIDS: { x: number; y: number; w: number; h: number }[];
export const FOREST2_EXTRA_SOLIDS: { x: number; y: number; w: number; h: number }[];
export const FOREST2_FOOT: Readonly<Record<string, readonly [number, number]>>;
export const BARRICADE_STAKES: { type: string; x: number; y: number }[];
export function inWalkable(x: number, y: number, pad?: number): boolean;
export function buildForest2Art(): ForestMap & { props: MapProp[] };
