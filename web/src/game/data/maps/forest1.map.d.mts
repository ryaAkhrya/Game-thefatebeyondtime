export const TILE: number;
export const MAP_W_TILES: number;
export const MAP_H_TILES: number;
export const ZONE_START_TILE: number;
export const PERIOD_TILES: number;
export const WRAP_X_TILE: number;
export const FOOT: Readonly<Record<string, readonly [number, number]>>;

export interface MapProp {
  id: string;
  type: string;
  x: number;
  y: number;
  copy?: number;
  role?: 'sign' | 'chest' | 'thicket' | 'sword';
}
export type WalkableShape =
  | { shape: 'rect'; x: number; y: number; w: number; h: number }
  | { shape: 'ellipse'; cx: number; cy: number; rx: number; ry: number };
export interface SolidRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  dynamic?: boolean;
  copy?: number;
}
export interface MapInteractable {
  id: string;
  kind: 'sign' | 'chest' | 'object' | 'npc';
  verb: string;
  x: number;
  y: number;
  w: number;
  h: number;
  copy?: number;
  prop?: string;
}
export interface MapTrigger {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  copy?: number;
}
export interface MapNpc {
  id: string;
  entity: string;
  x: number;
  y: number;
  facing: 'up' | 'down' | 'left' | 'right';
}
export interface ForestMap {
  id: string;
  width: number;
  height: number;
  tile: number;
  spawn: { x: number; y: number; facing: 'up' | 'down' | 'left' | 'right' };
  clearing: { cx: number; cy: number; rx: number; ry: number };
  road: { y0: number; y1: number; startX: number };
  zone: { start: number; period: number; copies: number; wrapX: number };
  trail: { localX: number; gladeCY: number; gladeRX: number; gladeRY: number; topY: number; mouthY: number };
  props: MapProp[];
  walkable: WalkableShape[];
  solidRects: SolidRect[];
  interactables: MapInteractable[];
  triggers: MapTrigger[];
  npcs: MapNpc[];
}
export function buildForest1(): ForestMap;
