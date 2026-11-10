import { FOOT, buildForest1, type ForestMap } from '../data/maps/forest1.map.mjs';
import { CollisionMap, type Rect } from './Collision';
import type { Interactable } from './Interaction';

export interface LoadedMap {
  map: ForestMap;
  collision: CollisionMap;
  interactables: Interactable[];
  /** Kotak kaki prop statis (sudah dimasukkan ke collision), untuk debug/tes. */
  footRects: Rect[];
}

export function footRectOf(type: string, x: number, y: number): Rect | null {
  const f = FOOT[type];
  if (!f || f[0] <= 0) return null;
  return { x: x - f[0] / 2, y: y - f[1], w: f[0], h: f[1] };
}

/** Membangun peta Hutan 1: collision (terpisah dari render), daftar interaktif, dan blocker dinamis awal. */
export function loadForest1(): LoadedMap {
  const map = buildForest1();
  const footRects: Rect[] = [];
  for (const p of map.props) {
    const r = footRectOf(p.type, p.x, p.y);
    if (r) footRects.push(r);
  }
  const collision = new CollisionMap(map.width, map.height, map.walkable, footRects);
  const interactables: Interactable[] = map.interactables.map((i) => ({ ...i }));
  return { map, collision, interactables, footRects };
}
