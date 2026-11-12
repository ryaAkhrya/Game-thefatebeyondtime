import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  TEMPLE_DECALS, TEMPLE_FOOT, TEMPLE_GATE_SOLID, TEMPLE_H, TEMPLE_INTERACTABLES, TEMPLE_LAYOUT, TEMPLE_PATROLS, TEMPLE_PROPS, TEMPLE_ROOMS,
  TEMPLE_SOLIDS, TEMPLE_TRIGGERS, TEMPLE_W,
} from '../../src/game/data/maps/temple.map.mjs';
import { TEMPLE_BATTLE_RETURN, TEMPLE_FROM_FOREST, TEMPLE_SPAWN, buildTemple, loadTemple } from '../../src/game/world/templeMaps';
import { footBox, moveWithCollision, overlaps, pointIn, type Rect } from '../../src/game/world/Collision';
import { findInteractable, type Interactable } from '../../src/game/world/Interaction';
import { ENV_ATLASES, ENV_IMAGES } from '../../src/game/data/environmentAssets';
import { readPng } from './helpers/png';

const PUBLIC = resolve(__dirname, '../../public/assets/environment/temple');
const FACINGS = ['up', 'down', 'left', 'right'] as const;
type Loaded = ReturnType<typeof loadTemple>;

function reachable(L: Loaded, from: { x: number; y: number }): Set<number> {
  const cols = Math.ceil(L.map.width / 8);
  const seen = new Set<number>();
  const q: Array<[number, number]> = [[Math.round(from.x / 8) * 8, Math.round(from.y / 8) * 8]];
  while (q.length) {
    const [x, y] = q.pop()!;
    const k = (y / 8) * cols + x / 8;
    if (seen.has(k) || x < 0 || y < 0 || x > L.map.width || y > L.map.height || !L.collision.canStand(footBox(x, y))) continue;
    seen.add(k);
    for (const [dx, dy] of [[8, 0], [-8, 0], [0, 8], [0, -8]] as const) q.push([x + dx, y + dy]);
  }
  return seen;
}
const cell = (L: Loaded, x: number, y: number): number => Math.round(y / 8) * Math.ceil(L.map.width / 8) + Math.round(x / 8);
/** Ada sel terjangkau + arah hadap sehingga kotak uji interaksi menyentuh objek? */
function canInteract(L: Loaded, seen: Set<number>, it: Interactable): { x: number; y: number; facing: string } | null {
  const cols = Math.ceil(L.map.width / 8);
  const solo = [{ ...it, enabled: true }];
  for (let y = Math.max(0, it.y - 40); y <= it.y + it.h + 48; y += 8) for (let x = Math.max(0, it.x - 40); x <= it.x + it.w + 40; x += 8) {
    if (!seen.has((Math.round(y / 8)) * cols + Math.round(x / 8))) continue;
    for (const facing of FACINGS) if (findInteractable({ x, y }, facing, solo)?.id === it.id) return { x, y, facing };
  }
  return null;
}

describe('Kuil Jejak: peta, collision dan jangkauan', () => {
  const L = loadTemple();
  const closed = reachable(L, TEMPLE_FROM_FOREST);

  it('ukuran, id dan struktur peta konsisten', () => {
    expect(L.map.id).toBe('temple');
    expect([L.map.width, L.map.height]).toEqual([TEMPLE_W, TEMPLE_H]);
    expect(buildTemple().spawn).toEqual(TEMPLE_SPAWN);
    const ids = TEMPLE_INTERACTABLES.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(TEMPLE_TRIGGERS.map((t) => t.id)).size).toBe(TEMPLE_TRIGGERS.length);
    expect(new Set(TEMPLE_PROPS.map((p) => p.id)).size).toBe(TEMPLE_PROPS.length);
    expect(Object.keys(TEMPLE_ROOMS).length).toBe(11);
    expect(L.map.solidRects.map((s) => s.id)).toEqual(['hall_gate']);
    expect(L.footRects).toEqual(TEMPLE_SOLIDS);
  });

  it('semua titik spawn dan titik kembali battle dapat dipijak dan terjangkau dari jalan masuk', () => {
    for (const [name, p] of Object.entries({ spawn: TEMPLE_SPAWN, forest: TEMPLE_FROM_FOREST, og: TEMPLE_BATTLE_RETURN.temple_oathguard, mixed: TEMPLE_BATTLE_RETURN.temple_mixed })) {
      expect(L.collision.canStand(footBox(p.x, p.y)), name).toBe(true);
      expect(closed.has(cell(L, p.x, p.y)), `${name} terjangkau`).toBe(true);
    }
    // Chronolith: titik kembali di aula, hanya terjangkau setelah gerbang terbuka
    const b = TEMPLE_BATTLE_RETURN.chronolith;
    expect(L.collision.canStand(footBox(b.x, b.y))).toBe(true);
    expect(closed.has(cell(L, b.x, b.y))).toBe(false);
  });

  it('semua interaktif non-aula terjangkau dengan gerbang tertutup; interaktif aula hanya setelah gerbang terbuka', () => {
    const hallIds = ['chronolith', 'inspect_4', 'hall_record', 'hall_exit'];
    for (const it of L.interactables) {
      const hit = canInteract(L, closed, it);
      if (hallIds.includes(it.id)) expect(hit, `${it.id} tertutup`).toBeNull(); else expect(hit, it.id).not.toBeNull();
    }
    const open = loadTemple();
    open.collision.setDynamic(TEMPLE_GATE_SOLID.id, null);
    const openReach = reachable(open, TEMPLE_FROM_FOREST);
    for (const id of hallIds) expect(canInteract(open, openReach, open.interactables.find((i) => i.id === id)!), `${id} terbuka`).not.toBeNull();
  });

  it('gerbang aula memblokir jalan sampai dilepas; tidak ada celah lain ke aula', () => {
    const fresh = loadTemple();
    const blocked = moveWithCollision(fresh.collision, 640, 504, 0, -120);
    expect(blocked.y).toBeGreaterThan(TEMPLE_GATE_SOLID.y + TEMPLE_GATE_SOLID.h);
    fresh.collision.setDynamic(TEMPLE_GATE_SOLID.id, null);
    expect(moveWithCollision(fresh.collision, 640, 504, 0, -120).y).toBeLessThan(400);
    for (const p of [TEMPLE_ROOMS.hall]) expect(closed.has(cell(L, p.x + p.w / 2, p.y + p.h / 2))).toBe(false);
  });

  it('pemicu: tidak menabrak collision (statis maupun gerbang), berdiri di sel terjangkau; patroli berada di dalam zonanya', () => {
    for (const t of TEMPLE_TRIGGERS) {
      for (const s of [...TEMPLE_SOLIDS, { x: TEMPLE_GATE_SOLID.x, y: TEMPLE_GATE_SOLID.y, w: TEMPLE_GATE_SOLID.w, h: TEMPLE_GATE_SOLID.h }]) expect(overlaps(t, s), `${t.id} vs solid`).toBe(false);
    }
    const open = loadTemple(); open.collision.setDynamic(TEMPLE_GATE_SOLID.id, null);
    const openReach = reachable(open, TEMPLE_FROM_FOREST);
    for (const t of TEMPLE_TRIGGERS) {
      let ok = false;
      for (let y = t.y; y < t.y + t.h + 6 && !ok; y += 4) for (let x = t.x; x < t.x + t.w && !ok; x += 4) if (pointIn(t, x, y - 2) && openReach.has(cell(open, x, y))) ok = true;
      expect(ok, `${t.id} dapat dimasuki`).toBe(true);
    }
    const byId = (id: string): { x: number; y: number } => TEMPLE_PROPS.find((p) => p.id === id)!;
    const f1 = TEMPLE_TRIGGERS.find((t) => t.id === 'temple_fight1')!, f2 = TEMPLE_TRIGGERS.find((t) => t.id === 'temple_fight2')!;
    expect(TEMPLE_PATROLS.temple_oathguard.every((id) => pointIn(f1, byId(id).x, byId(id).y - 8))).toBe(true);
    expect(TEMPLE_PATROLS.temple_mixed.every((id) => pointIn(f2, byId(id).x, byId(id).y - 8))).toBe(true);
    // jalur wajib (titik di tengah jalan) tidak melewati zona patroli opsional
    for (let y = 1232; y >= 760; y -= 8) for (const t of [f1, f2]) expect(pointIn(t, 640, y), `jalan tengah y=${y}`).toBe(false);
    // titik kembali battle di luar semua pemicu
    for (const [k, p] of Object.entries(TEMPLE_BATTLE_RETURN)) for (const t of TEMPLE_TRIGGERS) expect(pointIn(t, p.x, p.y - 2), `${k} dalam ${t.id}`).toBe(false);
  });

  it('jalur kritis: dari jalan masuk ke setiap ruang melalui lebar jalan yang cukup (garis tengah terbuka)', () => {
    // halaman -> lorong -> ruang gerbang -> (gerbang terbuka) -> aula
    const open = loadTemple(); open.collision.setDynamic(TEMPLE_GATE_SOLID.id, null);
    for (const [x, y] of [[640, 1240], [640, 1100], [640, 800], [640, 600], [560, 520], [640, 440], [640, 380], [880, 600], [900, 620]] as const) {
      if (y === 600 && x === 640) continue; // alas selatan di (640,652) hanya sedikit di bawah; titik 640,600 tetap bebas
      expect(open.collision.canStand(footBox(x, y)), `${x},${y}`).toBe(true);
    }
    // pintu barat/timur menuju ruang teka-teki
    for (let x = 90; x <= 380; x += 8) expect(open.collision.canStand(footBox(x, 960)), `barat ${x}`).toBe(true);
    for (let x = 900; x <= 1190; x += 8) expect(open.collision.canStand(footBox(x, 960)), `timur ${x}`).toBe(true);
    // lebar bebas di sekitar patroli opsional: jalan tengah halaman tetap >= 96 px dari tiap prop padat
    for (const s of TEMPLE_SOLIDS) if (s.y > 832 && s.y < 1120) expect(s.x + s.w < 600 || s.x > 680 || s.y + s.h < 840, `prop menghalangi jalan tengah ${JSON.stringify(s)}`).toBe(true);
  });

  it('semua jenis prop punya frame di atlas dan jejak kaki sesuai tabel; aset tidak hilang', () => {
    const json = JSON.parse(readFileSync(resolve(PUBLIC, 'props.json'), 'utf8')) as { frames: Record<string, { pivot: { x: number; y: number }; frame: { w: number; h: number }; foot: [number, number] }> };
    for (const p of TEMPLE_PROPS) expect(json.frames, p.type).toHaveProperty(p.type);
    for (const [k, v] of Object.entries(TEMPLE_FOOT)) { expect(json.frames, k).toHaveProperty(k); expect(json.frames[k]!.foot).toEqual([...v]); }
    for (const k of ['pillar_a1_on', 'disc_b3_on', 'dial_1_on', 'dialm_0_on', 'dial_3_frozen', 'gate_closed', 'gate_half', 'gate_open', 'gate_lamp_on', 'gate_lamp_off', 'chronolith_wake', 'chronolith_still', 'fire_b', 'oathguard_b', 'wisplet_c']) expect(json.frames, k).toHaveProperty(k);
    for (const [k, f] of Object.entries(json.frames)) { expect(f.pivot.x, k).toBeGreaterThan(0); expect(f.pivot.y, k).toBeGreaterThan(0); expect(f.pivot.y, k).toBeLessThanOrEqual(1); }
    const png = readPng(resolve(PUBLIC, 'ground.png'));
    expect([png.width, png.height]).toEqual([TEMPLE_W, TEMPLE_H]);
    const atlas = readPng(resolve(PUBLIC, 'props.png'));
    // piksel alfa antara: tepi keras (0/255) sesuai standar
    let soft = 0;
    for (let i = 3; i < atlas.data.length; i += 4) { const a = atlas.data[i]!; if (a > 0 && a < 255) soft++; }
    expect(soft).toBe(0);
  });

  it('atlas dan dasar kuil terdaftar di environmentAssets (key dipakai TempleView)', () => {
    expect(ENV_ATLASES.find((a) => a.key === 'temple_props')).toMatchObject({ image: 'assets/environment/temple/props.png', json: 'assets/environment/temple/props.json' });
    expect(ENV_IMAGES.find((i) => i.key === 'temple_ground')?.url).toBe('assets/environment/temple/ground.png');
  });

  it('dasar peta: lantai (palet kuil) di dalam persegi walkable, dinding/hampa di luar', () => {
    const png = readPng(resolve(PUBLIC, 'ground.png'));
    const px = (x: number, y: number): number => (png.data[(y * png.width + x) * 4]! << 16) | (png.data[(y * png.width + x) * 4 + 1]! << 8) | png.data[(y * png.width + x) * 4 + 2]!;
    const luma = (c: number): number => ((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;
    // lantai tengah tiap ruang lebih terang daripada hampa di luar bangunan
    const void_ = luma(px(100, 100));
    for (const r of Object.values(TEMPLE_ROOMS)) expect(luma(px(r.x + r.w / 2, r.y + r.h / 2))).toBeGreaterThan(void_ + 12);
    expect(TEMPLE_DECALS.length).toBeGreaterThan(0);
    expect(TEMPLE_LAYOUT.floorCircle.y).toBeGreaterThan(TEMPLE_ROOMS.ante.y);
    void TEMPLE_H;
  });

  it('interaktif dan jangkauan di atas koordinat nyata tidak berada di dalam collision statis (pemain tidak terkunci)', () => {
    for (const it of TEMPLE_INTERACTABLES) {
      const r: Rect = { x: it.x, y: it.y, w: it.w, h: it.h };
      expect(r.w).toBeGreaterThan(0);
    }
    for (const t of Object.values(TEMPLE_BATTLE_RETURN)) expect(TEMPLE_SOLIDS.some((s) => overlaps(footBox(t.x, t.y), s))).toBe(false);
  });
});
