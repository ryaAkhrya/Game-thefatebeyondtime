import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FORTRESS_BATTLE_RETURN, FORTRESS_DECALS, FORTRESS_DYNAMIC, FORTRESS_FOOT, FORTRESS_H, FORTRESS_INITIAL_DYNAMIC, FORTRESS_INTERACTABLES, FORTRESS_PATROLS,
  FORTRESS_PROPS, FORTRESS_ROOMS, FORTRESS_SOLIDS, FORTRESS_SPAWN, FORTRESS_STAGE, FORTRESS_TRIGGERS, FORTRESS_TRIGGER_ENCOUNTER, FORTRESS_W,
} from '../../src/game/data/maps/fortress.map.mjs';
import { buildFortress, loadFortress, dynamicRect } from '../../src/game/world/fortressMaps';
import { FortressPuzzleSession, activeBlockers } from '../../src/game/world/fortressPuzzle';
import { C4 } from '../../src/game/story/chapter4Flags';
import { FORT } from '../../src/game/story/c4/fortressFlags';
import { footBox, moveWithCollision, overlaps, pointIn, type Rect } from '../../src/game/world/Collision';
import { findInteractable, type Interactable } from '../../src/game/world/Interaction';
import { C4_ENCOUNTERS } from '../../src/game/story/chapter4Flags';
import { FORTRESS_ATLASES, FORTRESS_IMAGES } from '../../src/game/data/fortressAssets';
import { readPng } from './helpers/png';

const PUBLIC = resolve(__dirname, '../../public/assets/environment/fortress');
const FACINGS = ['up', 'down', 'left', 'right'] as const;
type Loaded = ReturnType<typeof loadFortress>;
type Flags = Record<string, boolean>;

// Tahap kemajuan (flag minimal). Tiap tahap membuka satu bagian benteng; dipakai untuk uji jangkauan.
const S0: Flags = {};
const S1: Flags = { [C4.aegisLearned]: true };
const S2: Flags = { ...S1, [FORT.sealsSolved]: true };
const S3: Flags = { ...S2, [FORT.riftAligned]: true };
const S4: Flags = { ...S3, [C4.aegisTrial]: true, [C4.checkpoint]: true };
const S5: Flags = { ...S4, [C4.heartOpen]: true };
const S6: Flags = { ...S5, [FORT.shortcutOpen]: true };

/** Memuat peta dengan penghalang dinamis sesuai flag (aturan sama dengan FortressView.apply). */
function loadAt(flags: Flags): Loaded {
  const L = loadFortress();
  const active = activeBlockers(flags, new FortressPuzzleSession());
  for (const id of Object.keys(FORTRESS_DYNAMIC) as Array<keyof typeof FORTRESS_DYNAMIC>) L.collision.setDynamic(id, active.has(id) ? dynamicRect(id) : null);
  return L;
}
const cols = Math.ceil(FORTRESS_W / 8);
const cellKey = (x: number, y: number): number => Math.round(y / 8) * cols + Math.round(x / 8);
function reachable(L: Loaded, from: { x: number; y: number }, avoid: readonly Rect[] = []): Set<number> {
  const seen = new Set<number>();
  const q: Array<[number, number]> = [[Math.round(from.x / 8) * 8, Math.round(from.y / 8) * 8]];
  while (q.length) {
    const [x, y] = q.pop()!;
    const k = cellKey(x, y);
    if (seen.has(k) || x < 0 || y < 0 || x > L.map.width || y > L.map.height || !L.collision.canStand(footBox(x, y))) continue;
    if (avoid.some((r) => pointIn(r, x, y - 2) || overlaps(footBox(x, y), r))) continue;
    seen.add(k);
    for (const [dx, dy] of [[8, 0], [-8, 0], [0, 8], [0, -8]] as const) q.push([x + dx, y + dy]);
  }
  return seen;
}
function canInteract(seen: Set<number>, it: Interactable): boolean {
  const solo = [{ ...it, enabled: true }];
  for (let y = Math.max(0, it.y - 40); y <= it.y + it.h + 48; y += 8) for (let x = Math.max(0, it.x - 40); x <= it.x + it.w + 40; x += 8) {
    if (!seen.has(cellKey(x, y))) continue;
    for (const facing of FACINGS) if (findInteractable({ x, y }, facing, solo)?.id === it.id) return true;
  }
  return false;
}
const trig = (id: string): Rect => FORTRESS_TRIGGERS.find((t) => t.id === id)!;
function canEnter(seen: Set<number>, t: Rect): boolean {
  for (let y = t.y; y < t.y + t.h + 6; y += 4) for (let x = t.x; x < t.x + t.w; x += 4) if (pointIn(t, x, y - 2) && seen.has(cellKey(x, y))) return true;
  return false;
}

describe('Warden Fortress: peta, collision dan jangkauan', () => {
  const reach = [S0, S1, S2, S3, S4, S5, S6].map((f) => { const L = loadAt(f); return { L, seen: reachable(L, FORTRESS_SPAWN) }; });
  const at = (i: number): { L: Loaded; seen: Set<number> } => reach[i]!;

  it('ukuran, id dan struktur peta konsisten dengan kontrak', () => {
    const L = loadFortress();
    expect(L.map.id).toBe('fortress');
    expect([L.map.width, L.map.height]).toEqual([FORTRESS_W, FORTRESS_H]);
    expect(buildFortress().spawn).toEqual(FORTRESS_SPAWN);
    for (const list of [FORTRESS_INTERACTABLES.map((i) => i.id), FORTRESS_TRIGGERS.map((t) => t.id), FORTRESS_PROPS.map((p) => p.id)]) expect(new Set(list).size).toBe(list.length);
    expect(Object.keys(FORTRESS_ROOMS)).toHaveLength(20);
    expect(L.map.solidRects.map((s) => s.id).sort()).toEqual([...FORTRESS_INITIAL_DYNAMIC].sort());
    expect(L.footRects).toEqual(FORTRESS_SOLIDS);
    // kerangka kontrak: Gerbang Luar, Aula Lonceng, Arsip, Ruang Uji, Koridor Retakan, Serambi, Ruang Heart, Ruang Gema
    for (const r of ['outer', 'bellhall', 'archive', 'trial', 'rift', 'serambi', 'heart', 'echo', 'barracks', 'sc_v']) expect(FORTRESS_ROOMS, r).toHaveProperty(r);
    expect(Object.keys(FORTRESS_BATTLE_RETURN).sort()).toEqual([...C4_ENCOUNTERS].sort());
  });

  it('spawn, titik kembali battle dan titik adegan dapat dipijak', () => {
    for (const [name, p] of Object.entries({ spawn: FORTRESS_SPAWN, ...FORTRESS_BATTLE_RETURN })) expect(at(6).L.collision.canStand(footBox(p.x, p.y)), name).toBe(true);
    for (const k of ['varlgrim', 'varlgrimWall', 'velthiaLock', 'yaricLock', 'threshold'] as const) {
      const p = FORTRESS_STAGE[k];
      expect(pointInAnyRoom(p.x, p.y), k).toBe(true);
    }
  });

  it('titik kembali battle terjangkau pada tahap yang benar dan berada di luar semua pemicu', () => {
    const stage: Record<string, number> = { fortress_riftborn: 0, fortress_gravorn: 0, fortress_guardpost: 0, fortress_aegis_trial: 1, fortress_rift: 3, varlgrim: 4 };
    for (const [enc, p] of Object.entries(FORTRESS_BATTLE_RETURN)) {
      const s = stage[enc]!;
      expect(at(s).seen.has(cellKey(p.x, p.y)), `${enc} terjangkau di tahap ${s}`).toBe(true);
      if (s > 0) expect(at(s - 1).seen.has(cellKey(p.x, p.y)), `${enc} belum terjangkau sebelum tahap ${s}`).toBe(false);
      for (const t of FORTRESS_TRIGGERS) expect(pointIn(t, p.x, p.y - 2) || overlaps(footBox(p.x, p.y), t), `${enc} dalam ${t.id}`).toBe(false);
      expect(FORTRESS_SOLIDS.some((r) => overlaps(footBox(p.x, p.y), r))).toBe(false);
    }
  });

  it('setiap interaktif terjangkau tepat pada tahap yang diharapkan (tidak ada objek yang tak terjangkau, tidak ada pintas)', () => {
    const stage: Record<string, number> = {
      courier_a: 0, outer_gate: 0, outer_statue: 0, outer_cart: 0, bell: 0, hall_lantern: 0, seal_dawn: 0, seal_noon: 0, seal_dusk: 0, seal_night: 0, bell_dial: 0, door_seal: 0,
      trial_gate: 0, door_shortcut: 0, barracks_names: 0, barracks_bunk: 0, barracks_table: 0, chest_potion: 0, archive_log: 0, archive_relic: 0,
      archive_memorial: 0, archive_cloak: 0, archive_shelf: 0, chest_robe: 0,
      trial_pedestal: 1, trial_plaque: 1, chest_plate: 1,
      anchor_a: 2, anchor_b: 2, corridor_lantern: 2,
      lantern_rest: 3, courier_b: 3, door_heart: 3, shortcut_lever: 3, shortcut_window: 3, shortcut_note: 3,
      heart_lock_yaric: 4, heart_lock_velthia: 4, heart_emblem: 4, heart_window: 4, heart_seal: 4,
      echo_a: 5, echo_b: 5,
    };
    expect(Object.keys(stage).sort()).toEqual(FORTRESS_INTERACTABLES.map((i) => i.id).sort());
    for (const it of FORTRESS_INTERACTABLES) {
      const s = stage[it.id]!;
      expect(canInteract(at(s).seen, it), `${it.id} tahap ${s}`).toBe(true);
      if (s > 0) expect(canInteract(at(s - 1).seen, it), `${it.id} belum boleh sebelum tahap ${s}`).toBe(false);
    }
  });

  it('pemicu: tidak menabrak collision, dapat dimasuki pada tahapnya, dan pemicu wajib melintang penuh di jalan', () => {
    const stage: Record<string, number> = { fortress_court_fight: 0, fortress_hall_fight: 0, fortress_guardpost: 0, fortress_rift_fight: 3, heart_confront: 4, echo_enter: 5 };
    for (const t of FORTRESS_TRIGGERS) {
      for (const s of FORTRESS_SOLIDS) expect(overlaps(t, s), `${t.id} vs solid`).toBe(false);
      for (const d of Object.values(FORTRESS_DYNAMIC)) expect(overlaps(t, d), `${t.id} vs ${d.id}`).toBe(false);
      expect(canEnter(at(stage[t.id]!).seen, t), `${t.id} dapat dimasuki`).toBe(true);
      if (stage[t.id]! > 0) expect(canEnter(at(stage[t.id]! - 1).seen, t), `${t.id} belum dapat dimasuki`).toBe(false);
    }
    // tiap encounter wajib: tanpa melewati pemicunya, bagian sesudahnya tidak terjangkau
    const gatehall = { x: 896, y: 1900 }, hallNorth = { x: 896, y: 1480 }, hallWest = { x: 480, y: 1712 }, hallEast = { x: 1312, y: 1712 };
    const noGo = (s: number, from: { x: number; y: number }, id: string, to: Array<{ x: number; y: number }>): void => {
      const seen = reachable(at(s).L, from, [trig(id)]);
      for (const p of to) expect(seen.has(cellKey(p.x, p.y)), `${id} -> (${p.x},${p.y}) harus tertutup`).toBe(false);
    };
    noGo(0, FORTRESS_SPAWN, 'fortress_court_fight', [gatehall, hallNorth]);
    noGo(0, gatehall, 'fortress_hall_fight', [hallNorth, hallWest, hallEast, { x: 300, y: 1700 }]);
    noGo(0, { x: 480, y: 1712 }, 'fortress_guardpost', [{ x: 300, y: 1700 }, { x: 304, y: 1400 }]);
    noGo(3, { x: 896, y: 1100 }, 'fortress_rift_fight', [{ x: 896, y: 600 }]);
    noGo(4, { x: 896, y: 600 }, 'heart_confront', [{ x: 896, y: 200 }, { x: 1250, y: 256 }]);
    noGo(5, { x: 896, y: 300 }, 'echo_enter', [{ x: 1472, y: 300 }]);
    // lentera istirahat bebas: Aula (hub) hanya sesudah pemicu Gravorn; Koridor sesudah Pintu Segel dan di depan pemicu koridor
    const hl = FORTRESS_INTERACTABLES.find((i) => i.id === 'hall_lantern')!, cl = FORTRESS_INTERACTABLES.find((i) => i.id === 'corridor_lantern')!;
    expect(canInteract(reachable(at(0).L, FORTRESS_SPAWN, [trig('fortress_hall_fight')]), hl)).toBe(false);
    expect(canInteract(reachable(at(2).L, { x: 896, y: 1400 }, [trig('fortress_rift_fight')]), cl)).toBe(true);
    expect(canInteract(at(1).seen, cl)).toBe(false);
    const hp = FORTRESS_PROPS.find((p) => p.id === 'hall_lantern')!, cp = FORTRESS_PROPS.find((p) => p.id === 'corridor_lantern')!;
    expect(pointIn(FORTRESS_ROOMS.bellhall, hp.x, hp.y)).toBe(true);
    expect(cp.y).toBeGreaterThan(1264); expect(cp.y).toBeLessThan(1332 - 12); // antara slab S1 dan jangkar: tidak menutup jalur
    for (const t of FORTRESS_TRIGGERS) expect(pointIn(t, hp.x, hp.y) || pointIn(t, cp.x, cp.y)).toBe(false);
    for (const [trigId, enc] of Object.entries(FORTRESS_TRIGGER_ENCOUNTER)) { expect(trig(trigId)).toBeTruthy(); expect(C4_ENCOUNTERS as readonly string[]).toContain(enc); }
  });

  it('patroli berada di dalam zona pemicunya dan encounter uji ada di ruang uji', () => {
    const p = (id: string): { x: number; y: number } => FORTRESS_PROPS.find((q) => q.id === id)!;
    const near = (z: Rect, id: string): boolean => pointIn({ x: z.x - 24, y: z.y - 24, w: z.w + 48, h: z.h + 48 }, p(id).x, p(id).y - 8);
    expect(near(trig('fortress_court_fight'), 'patrol_riftborn')).toBe(true);
    expect(near(trig('fortress_hall_fight'), 'patrol_gravorn')).toBe(true);
    for (const id of FORTRESS_PATROLS.fortress_guardpost) expect(near(trig('fortress_guardpost'), id), id).toBe(true);
    for (const id of FORTRESS_PATROLS.fortress_rift) expect(near(trig('fortress_rift_fight'), id), id).toBe(true);
    expect(pointIn(FORTRESS_ROOMS.trial, p('patrol_trial_rb').x, p('patrol_trial_rb').y - 8)).toBe(true);
  });

  it('pintu dan penghalang: memblokir sampai dilepas, dan tidak ada jalan lain (tahap tertutup)', () => {
    const north = (L: Loaded, x: number, y: number, dy: number): number => moveWithCollision(L.collision, x, y, 0, dy).y;
    const s0 = at(0).L, s2 = at(2).L;
    expect(north(s0, 896, 1440, -80)).toBeGreaterThan(1424); // Pintu Segel
    expect(north(s2, 896, 1440, -80)).toBeLessThan(1400);
    expect(moveWithCollision(s0.collision, 1290, 1712, 60, 0).x).toBeLessThan(1306); // gerbang Ruang Uji
    expect(moveWithCollision(at(1).L.collision, 1290, 1712, 60, 0).x).toBeGreaterThan(1340);
    expect(north(at(3).L, 896, 500, -60)).toBeGreaterThan(480); // Pintu Heart sebelum titik simpan
    expect(north(at(4).L, 896, 500, -100)).toBeLessThan(420);
    // slab: awal S1 dan S3 menutup, S2 terbuka
    const rift = loadAt(S2);
    expect(north(rift, 896, 1290, -100)).toBeGreaterThan(1260);
    // semua area dalam keadaan tertutup tidak mencapai Ruang Heart, Serambi, Gema
    for (const r of ['serambi', 'heart', 'echo', 'rift'] as const) expect(at(1).seen.has(cellKey(FORTRESS_ROOMS[r].x + FORTRESS_ROOMS[r].w / 2, FORTRESS_ROOMS[r].y + FORTRESS_ROOMS[r].h / 2)), r).toBe(false);
    expect(at(6).seen.has(cellKey(1472, 250))).toBe(true);
  });

  it('pintasan: dari Serambi ke Aula Lonceng hanya setelah tuas ditarik; sebaliknya terbuka sebagai jalan pulang', () => {
    const closed = loadAt({ [FORT.riftAligned]: true });
    const fromSerambi = reachable(closed, { x: 896, y: 600 });
    expect(fromSerambi.has(cellKey(624, 1352))).toBe(true); // lorong pintasan terjangkau dari Serambi
    expect(fromSerambi.has(cellKey(624, 1440))).toBe(false); // pintu pintasan menutup
    const open = loadAt({ [FORT.riftAligned]: true, [FORT.shortcutOpen]: true });
    const back = reachable(open, { x: 896, y: 600 });
    expect(back.has(cellKey(624, 1440))).toBe(true);
    expect(back.has(cellKey(896, 1700))).toBe(true); // sampai ke Aula Lonceng tanpa melewati Pintu Segel/Koridor
    // dari Aula Lonceng (Pintu Segel tertutup) ke Serambi lewat pintasan
    const hall = reachable(open, { x: 700, y: 1500 });
    expect(hall.has(cellKey(896, 600))).toBe(true);
    // tanpa tuas: dari Aula Lonceng tidak ada jalan ke Serambi
    expect(reachable(loadAt({ [FORT.riftAligned]: true }), { x: 700, y: 1500 }).has(cellKey(896, 600))).toBe(false);
  });

  it('tahap akhir: tidak ada kantong yang menjebak (semua sel terpijak terjangkau dari spawn)', () => {
    const { L, seen } = at(6);
    let stuck = 0;
    const samples: string[] = [];
    for (let y = 0; y < FORTRESS_H; y += 8) for (let x = 0; x < FORTRESS_W; x += 8) {
      if (L.collision.canStand(footBox(x, y)) && !seen.has(cellKey(x, y))) { stuck++; if (samples.length < 6) samples.push(`${x},${y}`); }
    }
    expect(stuck, `sel terisolasi: ${samples.join(' ')}`).toBe(0);
  });

  it('lebar jalan utama cukup (garis tengah bebas) dan prop padat tidak menutup jalan wajib', () => {
    const L = at(6).L;
    for (const [x, y] of [[896, 2400], [896, 2200], [896, 1950], [896, 1840], [896, 1440], [896, 1200], [896, 700], [896, 440], [896, 380], [1240, 256], [1400, 300]] as const) {
      // beri tempat untuk kotak kaki 16 px dengan sisa kiri/kanan
      expect(L.collision.canStand(footBox(x, y)), `${x},${y}`).toBe(true);
    }
    for (let x = 840; x <= 952; x += 8) expect(L.collision.canStand(footBox(x, 1990)), `gerbang ${x}`).toBe(true);
    for (let x = 456; x <= 504; x += 8) expect(L.collision.canStand(footBox(x, 1712)), `pintu barat ${x}`).toBe(true);
    for (let x = 1284; x <= 1340; x += 8) expect(L.collision.canStand(footBox(x, 1712)), `pintu timur ${x}`).toBe(true);
  });

  it('footprint collision = tapak visual: kotak kaki prop berada di dalam sprite dan di atas piksel opak', () => {
    const json = JSON.parse(readFileSync(resolve(PUBLIC, 'props.json'), 'utf8')) as { frames: Record<string, { frame: { x: number; y: number; w: number; h: number }; pivot: { x: number; y: number }; foot: [number, number] }> };
    const atlas = readPng(resolve(PUBLIC, 'props.png'));
    const weak = new Set<string>();
    const alpha = (x: number, y: number): number => atlas.data[(y * atlas.width + x) * 4 + 3]!;
    for (const p of FORTRESS_PROPS) {
      const f = FORTRESS_FOOT[p.type];
      if (!f || f[0] <= 0) continue;
      const fr = json.frames[p.type]!;
      expect(f[0], `${p.type} lebar kaki <= lebar sprite`).toBeLessThanOrEqual(fr.frame.w);
      expect(f[1], `${p.type} tinggi kaki <= tinggi sprite`).toBeLessThanOrEqual(fr.frame.h);
      // area kaki dalam koordinat sprite: pusat-bawah = pivot
      const px = Math.round(fr.pivot.x * fr.frame.w), py = Math.round(fr.pivot.y * fr.frame.h);
      let opaque = 0, total = 0;
      for (let y = py - f[1]; y < py; y++) for (let x = px - Math.floor(f[0] / 2); x < px + Math.ceil(f[0] / 2); x++) { total++; if (alpha(fr.frame.x + x, fr.frame.y + y) > 0) opaque++; }
      if (opaque / total <= 0.55) weak.add(`${p.type}=${(opaque / total).toFixed(2)}`);
    }
    expect([...weak], 'tapak kaki harus tertutup sprite').toEqual([]);
    // collision statis = tepat FORTRESS_SOLIDS (tidak ada solid yang tak berprop)
    expect(loadFortress().footRects).toHaveLength(FORTRESS_PROPS.filter((p) => (FORTRESS_FOOT[p.type]?.[0] ?? 0) > 0).length);
  });

  it('semua jenis prop punya frame di atlas; atlas dan dasar terdaftar sebagai aset lingkungan', () => {
    const json = JSON.parse(readFileSync(resolve(PUBLIC, 'props.json'), 'utf8')) as { frames: Record<string, { pivot: { x: number; y: number }; foot: [number, number] }> };
    for (const p of FORTRESS_PROPS) expect(json.frames, p.type).toHaveProperty(p.type);
    for (const [k, v] of Object.entries(FORTRESS_FOOT)) { expect(json.frames, k).toHaveProperty(k); expect(json.frames[k]!.foot).toEqual([...v]); }
    for (const d of FORTRESS_DECALS) expect(json.frames).toHaveProperty(d);
    expect(FORTRESS_ATLASES[0]).toMatchObject({ key: 'fortress_props', image: 'assets/environment/fortress/props.png', json: 'assets/environment/fortress/props.json' });
    expect(FORTRESS_IMAGES[0]?.key).toBe('fortress_ground');
    for (const f of [FORTRESS_ATLASES[0]!.image, FORTRESS_ATLASES[0]!.json, FORTRESS_IMAGES[0]!.url]) expect(existsSync(resolve(__dirname, '../../public', f)), f).toBe(true);
  });
});

function pointInAnyRoom(x: number, y: number): boolean {
  return Object.values(FORTRESS_ROOMS).some((r) => pointIn(r, x, y));
}
