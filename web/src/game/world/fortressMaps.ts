import type { ForestMap } from '../data/maps/forest1.map.mjs';
import {
  FORTRESS_BATTLE_RETURN, FORTRESS_DYNAMIC, FORTRESS_INITIAL_DYNAMIC, FORTRESS_SOLIDS, FORTRESS_SPAWN, FORTRESS_STAGE, buildFortressMap,
  type FortressDynamicId,
} from '../data/maps/fortress.map.mjs';
import { CollisionMap, type Rect } from './Collision';
import type { LoadedMap } from './forest1';

/** Warden Fortress (area `fortress`): data di data/maps/fortress.map.mjs (satu sumber untuk geometri, seni, tes). */
export { FORTRESS_SPAWN, FORTRESS_BATTLE_RETURN, FORTRESS_STAGE };

/** Titik pandang kamera untuk adegan menara runtuh (jendela busur di dinding utara Ruang Heart). */
export const FORTRESS_VISTA = { ...FORTRESS_STAGE.vista };

export const dynamicRect = (id: FortressDynamicId): Rect => {
  const d = FORTRESS_DYNAMIC[id];
  return { x: d.x, y: d.y, w: d.w, h: d.h };
};

export function buildFortress(): ForestMap {
  return buildFortressMap();
}

/**
 * Memuat peta benteng. Semua penghalang dinamis keadaan awal (pintu, slab) dipasang; FortressView.apply melepas/memasangnya
 * kembali dari flag dan sesi teka-teki. Patroli tidak punya collision (pemicu melintang di jalan wajib).
 */
export function loadFortress(): LoadedMap {
  const map = buildFortress();
  const solids: Rect[] = FORTRESS_SOLIDS.map((r) => ({ ...r }));
  const collision = new CollisionMap(map.width, map.height, map.walkable, solids);
  for (const id of FORTRESS_INITIAL_DYNAMIC) collision.setDynamic(id, dynamicRect(id));
  return { map, footRects: solids, interactables: map.interactables.map((i) => ({ ...i })), collision };
}
