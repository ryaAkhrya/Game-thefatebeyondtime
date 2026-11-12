import { describe, expect, it } from 'vitest';
import { CollisionMap, footBox, overlaps, type Rect } from '../../src/game/world/Collision';
import { buildAveloria, loadAveloria, CITY_SOLIDS } from '../../src/game/world/aveloria';
import {
  AVELORIA_C4_IDS, AVELORIA_C4_SPAWN, C4_FOCUS, C4_GATE_GUARD, C4_NAMED, C4_OBJECTS, C4_RESIDENTS, C4_WALKABLE, c4Solids, loadAveloriaC4, npcInteractRect,
} from '../../src/game/world/aveloriaC4';
import { findInteractable } from '../../src/game/world/Interaction';

const STEP = 4;
type Pt = { x: number; y: number };
function reach(col: CollisionMap, w: number, h: number, start: Pt): Set<number> {
  const seen = new Set<number>(); const key = (x: number, y: number): number => (y / STEP) * 4096 + x / STEP;
  const sx = Math.round(start.x / STEP) * STEP, sy = Math.round(start.y / STEP) * STEP;
  const stack: [number, number][] = [[sx, sy]]; if (!col.canStand(footBox(sx, sy))) return seen; seen.add(key(sx, sy));
  while (stack.length) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of [[STEP, 0], [-STEP, 0], [0, STEP], [0, -STEP]] as const) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx > w || ny > h) continue;
      const k = key(nx, ny); if (seen.has(k) || !col.canStand(footBox(nx, ny))) continue; seen.add(k); stack.push([nx, ny]);
    }
  }
  return seen;
}
const has = (s: Set<number>, x: number, y: number): boolean => s.has((Math.round(y / STEP) * STEP / STEP) * 4096 + Math.round(x / STEP) * STEP / STEP);
const fromKey = (k: number): [number, number] => [(k % 4096) * STEP, Math.floor(k / 4096) * STEP];

/** Peta + semua NPC sebagai blocker (seperti di game: view memasang collision dinamis footBox). */
function withNpcs() {
  const loaded = loadAveloriaC4();
  const npcs: Pt[] = [...Object.values(C4_NAMED), ...C4_RESIDENTS, C4_GATE_GUARD];
  npcs.forEach((p, i) => loaded.collision.setDynamic(`npc${i}`, footBox(p.x, p.y)));
  return loaded;
}

describe('peta Aveloria sesudah runtuh: geometri', () => {
  it('memuat ulang geometri kota tanpa mengubah peta Bab I-III', () => {
    const before = JSON.stringify([buildAveloria().walkable, buildAveloria().solidRects, buildAveloria().interactables, CITY_SOLIDS.length]);
    const c4 = loadAveloriaC4(); const base = loadAveloria();
    expect(JSON.stringify([buildAveloria().walkable, buildAveloria().solidRects, buildAveloria().interactables, CITY_SOLIDS.length])).toBe(before);
    expect(base.map.walkable.length).toBe(5);
    expect(c4.map.walkable.length).toBe(5 + C4_WALKABLE.length);
    expect(c4.map.id).toBe('aveloria');
    expect(c4.footRects.length).toBe(CITY_SOLIDS.length + c4Solids().length);
    expect(c4.map.width).toBe(base.map.width); expect(c4.map.height).toBe(base.map.height);
  });

  it('spawn dapat dipijak, menghadap penampungan, dan terhubung ke kota, istana, dan seluruh penampungan', () => {
    const { map, collision } = loadAveloriaC4();
    expect(AVELORIA_C4_SPAWN).toEqual(map.spawn);
    expect(collision.canStand(footBox(AVELORIA_C4_SPAWN.x, AVELORIA_C4_SPAWN.y))).toBe(true);
    const A = reach(collision, map.width, map.height, AVELORIA_C4_SPAWN);
    for (const [x, y, what] of [[640, 1100, 'gerbang dalam'], [640, 800, 'plaza'], [640, 500, 'halaman istana'], [640, 250, 'ruang pertemuan'], [390, 760, 'pasar'], [1000, 900, 'timur'], [440, 1228, 'penampungan barat'], [820, 1226, 'penampungan timur']] as const) {
      expect(has(A, x, y), what).toBe(true);
    }
    // luas wajar: padang penampungan menambah area, kota tetap utuh
    expect(A.size).toBeGreaterThan(14000);
  });

  it('semua NPC bernama, warga dan penjaga berdiri di titik yang dapat dipijak (tanpa saling tumpang)', () => {
    const { collision } = loadAveloriaC4();
    const all = [...Object.entries(C4_NAMED).map(([id, p]) => ({ id, ...p })), ...C4_RESIDENTS, { id: 'gate_guard', ...C4_GATE_GUARD }];
    for (const p of all) expect(collision.canStand(footBox(p.x, p.y)), `${p.id} berdiri di ${p.x},${p.y}`).toBe(true);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(overlaps(footBox(all[i]!.x, all[i]!.y), footBox(all[j]!.x, all[j]!.y)), `${all[i]!.id}/${all[j]!.id}`).toBe(false);
  });

  it('area reruntuhan dikurung: pagar, rubble dan menara tidak dapat dimasuki; lonceng retak dan tanda dapat didekati', () => {
    const { map, collision } = loadAveloriaC4();
    const A = reach(collision, map.width, map.height, AVELORIA_C4_SPAWN);
    const inside: [number, number][] = [[800, 540], [790, 600], [830, 500], [780, 470], [840, 620]];
    for (const [x, y] of inside) expect(has(A, x, y), `${x},${y} tidak boleh terjangkau`).toBe(false);
    const sign = map.interactables.find(i => i.id === AVELORIA_C4_IDS.fenceSign)!, bell = map.interactables.find(i => i.id === AVELORIA_C4_IDS.bell)!;
    for (const it of [sign, bell]) {
      let ok = false;
      for (const k of A) { const [x, y] = fromKey(k); for (const f of ['up', 'down', 'left', 'right'] as const) if (findInteractable({ x, y }, f, [it])) { ok = true; break; } if (ok) break; }
      expect(ok, it.id).toBe(true);
    }
  });

  it('tidak ada solid baru yang memutus jalan utama (gerbang -> avenue -> istana) dan jalan Liora tetap terbuka', () => {
    const { map, collision } = withNpcs();
    const A = reach(collision, map.width, map.height, AVELORIA_C4_SPAWN);
    for (let y = 1196; y >= 460; y -= 4) expect(has(A, 640, y), `avenue y=${y}`).toBe(true);
    for (let y = 1196; y <= 1372; y += 8) expect(has(A, 640, y) || has(A, 632, y) || has(A, 648, y), `jalan Liora y=${y}`).toBe(true);
  });

  it('semua interactable yang aktif dapat dijangkau dari spawn (posisi + arah hadap yang memicu), dengan NPC sebagai penghalang', () => {
    const { map, collision, interactables } = withNpcs();
    const A = reach(collision, map.width, map.height, AVELORIA_C4_SPAWN);
    const active = interactables.filter(i => i.enabled !== false);
    const ids = active.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const need of ['talric', 'azie', 'velthia', 'derrria', 'c4_roster', 'c4_bell', 'c4_fence_sign', 'city_sign', ...AVELORIA_C4_IDS.residents]) expect(ids, need).toContain(need);
    for (const it of active) {
      let ok = false;
      for (const k of A) { const [x, y] = fromKey(k); for (const f of ['up', 'down', 'left', 'right'] as const) if (findInteractable({ x, y }, f, [it])) { ok = true; break; } if (ok) break; }
      expect(ok, `interactable ${it.id} terjangkau`).toBe(true);
    }
    expect(map.interactables.length).toBeGreaterThanOrEqual(active.length);
  });

  it('interaksi Bab I-III yang tidak dipakai dimatikan; 4-6 warga tanpa nama (+ Derrria bernama) dapat diajak bicara', () => {
    const { interactables } = loadAveloriaC4();
    for (const id of ['reports', 'liora_exit', 'palace_door', 'porter', 'vendor', 'sweeper', 'guard']) expect(interactables.find(i => i.id === id)?.enabled, id).toBe(false);
    expect(C4_RESIDENTS.length).toBeGreaterThanOrEqual(4); expect(C4_RESIDENTS.length).toBeLessThanOrEqual(6);
    expect(C4_RESIDENTS.every(r => r.id.startsWith('c4_res_'))).toBe(true);
    expect(Object.keys(C4_NAMED).sort()).toEqual(['azie', 'derrria', 'talric', 'velthia']); // Torvan tidak hadir
    expect(C4_OBJECTS.map(o => o.id).sort()).toEqual(['c4_bell', 'c4_fence_sign', 'c4_roster']);
  });

  it('kotak interaksi NPC sama dengan pola view: membungkus titik pijak dan dapat dipicu dari bawah', () => {
    for (const p of Object.values(C4_NAMED)) { const r = npcInteractRect(p.x, p.y, true); expect(r.x).toBeLessThan(p.x); expect(r.x + r.w).toBeGreaterThan(p.x); expect(r.y + r.h).toBeGreaterThan(p.y); }
    const p = C4_NAMED.azie; const r: Rect = npcInteractRect(p.x, p.y, true);
    expect(findInteractable({ x: p.x, y: p.y - 12 }, 'down', [{ id: 'azie', kind: 'npc', verb: 'x', ...r }])?.id).toBe('azie');
  });

  it('fokus kamera berada di dalam peta', () => {
    const { map } = loadAveloriaC4();
    for (const [x, y] of Object.values(C4_FOCUS)) { expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(map.width); expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(map.height); }
  });
});
