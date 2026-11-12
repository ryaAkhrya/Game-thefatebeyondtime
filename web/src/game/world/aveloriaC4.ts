import { CollisionMap, type Rect } from './Collision';
import { buildAveloria, CITY_SOLIDS } from './aveloria';
import type { LoadedMap } from './forest1';
import type { Interactable } from './Interaction';
import { C4_NAMED, C4_OBJECTS, C4_RESIDENTS, C4_SPAWN, C4_WALKABLE, C4_EXTRA_SOLIDS, c4Solids } from '../data/maps/town.c4.mjs';

export * from '../data/maps/town.c4.mjs';

/**
 * Peta Aveloria sesudah menara tua runtuh (C4-07). Dasarnya geometri Aveloria yang ada (`buildAveloria`, tidak diubah) lalu:
 *  - menambah padang di luar gerbang selatan sebagai tempat penampungan warga (C4_WALKABLE),
 *  - menambah solid: pagar/palang darurat, timbunan reruntuhan, tenda, api masak, meja, papan daftar, peti (c4Solids),
 *  - menaruh NPC bernama dan warga tanpa nama, papan daftar, lonceng retak, dan tanda "TUTUP" sebagai interactable.
 * Kota di dalam tembok kosong; jalur utama ke istana tetap terbuka. NPC mendapat collision dinamis dari view; peta ini hanya statis.
 */
export const AVELORIA_C4_SPAWN = C4_SPAWN;

export const AVELORIA_C4_IDS = {
  roster: 'c4_roster', bell: 'c4_bell', fenceSign: 'c4_fence_sign', sign: 'city_sign',
  talric: 'talric', azie: 'azie', velthia: 'velthia', derrria: 'derrria',
  residents: C4_RESIDENTS.map(r => r.id),
} as const;

/** Interaksi Bab I-III yang tidak dipakai di sini (warga grafis lama, meja laporan, portal Liora, pintu istana). */
const DISABLED = new Set(['reports', 'liora_exit', 'palace_door', 'porter', 'vendor', 'sweeper', 'guard']);

/** Kotak interaksi untuk NPC yang berdiri di titik pijak (x,y): sama pola dengan view krisis. */
export function npcInteractRect(x: number, y: number, named: boolean): Rect {
  return named ? { x: x - 24, y: y - 10, w: 48, h: 34 } : { x: x - 14, y: y - 18, w: 28, h: 30 };
}

export function loadAveloriaC4(): LoadedMap {
  const map = buildAveloria();
  map.spawn = { ...C4_SPAWN };
  map.walkable.push(...C4_WALKABLE);
  const extra = c4Solids();
  const footRects: Rect[] = [...CITY_SOLIDS, ...extra];
  for (const s of C4_EXTRA_SOLIDS) map.solidRects.push({ ...s });
  const interactables: Interactable[] = map.interactables.map(i => {
    const it: Interactable = { ...i };
    if (DISABLED.has(it.id)) it.enabled = false;
    const n = (C4_NAMED as Record<string, { x: number; y: number } | undefined>)[it.id];
    if (n) Object.assign(it, npcInteractRect(n.x, n.y, true));
    return it;
  });
  for (const r of C4_RESIDENTS) interactables.push({ id: r.id, kind: 'npc', verb: 'Bicara', ...npcInteractRect(r.x, r.y, false) });
  for (const o of C4_OBJECTS) if (!interactables.some(i => i.id === o.id)) interactables.push({ ...o });
  map.interactables = interactables.map(i => ({ ...i }));
  return { map, footRects, interactables, collision: new CollisionMap(map.width, map.height, map.walkable, footRects) };
}
