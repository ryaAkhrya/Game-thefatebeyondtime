import type { ForestMap } from '../data/maps/forest1.map.mjs';
import { TEMPLE_BATTLE_RETURN, TEMPLE_FROM_FOREST, TEMPLE_GATE_SOLID, TEMPLE_SOLIDS, TEMPLE_SPAWN, buildTempleMap } from '../data/maps/temple.map.mjs';
import { CollisionMap, type Rect } from './Collision';
import type { LoadedMap } from './forest1';

/** Kuil Jejak (area `temple`): data di data/maps/temple.map.mjs (satu sumber untuk geometri, seni, tes). */
export { TEMPLE_SPAWN, TEMPLE_FROM_FOREST, TEMPLE_BATTLE_RETURN };
export const TEMPLE_GATE_ID = TEMPLE_GATE_SOLID.id;
export const TEMPLE_GATE_RECT: Rect = { x: TEMPLE_GATE_SOLID.x, y: TEMPLE_GATE_SOLID.y, w: TEMPLE_GATE_SOLID.w, h: TEMPLE_GATE_SOLID.h };
/** Pemicu pertarungan wajib Chronolith (aula) dan titik tengah penjaga. */
export const TEMPLE_BOSS_TRIGGER = 'temple_chronolith';

export function buildTemple(): ForestMap {
  return buildTempleMap();
}

/**
 * Memuat peta kuil. Gerbang aula dipasang sebagai blocker dinamis (TempleView.apply melepasnya saat flag gerbang terbuka).
 * Patroli tidak punya collision (pemicu mengelilingi mereka); kaki prop padat sudah ada di collision.
 */
export function loadTemple(): LoadedMap {
  const map = buildTemple();
  const solids: Rect[] = TEMPLE_SOLIDS.map((r) => ({ ...r }));
  const collision = new CollisionMap(map.width, map.height, map.walkable, solids);
  collision.setDynamic(TEMPLE_GATE_ID, { ...TEMPLE_GATE_RECT });
  return { map, footRects: solids, interactables: map.interactables.map((i) => ({ ...i })), collision };
}
