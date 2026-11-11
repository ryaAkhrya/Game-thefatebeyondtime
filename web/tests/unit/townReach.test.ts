import { describe, expect, it } from 'vitest';
import { CollisionMap, footBox, overlaps, type Rect } from '../../src/game/world/Collision';
import { buildAveloria, CITY_NPCS, CITIZENS, loadAveloria } from '../../src/game/world/aveloria';
import { buildLiora, loadLiora } from '../../src/game/world/chapter2Maps';
import { AVELORIA_ITEMS, LIORA_ITEMS, decorSolids } from '../../src/game/data/maps/town.layout.mjs';
import { findInteractable, probeRect } from '../../src/game/world/Interaction';
import { CITY_SPAWN } from '../../src/game/story/aveloriaFlags';
import { LIORA_SPAWN, RETURN_SPAWN } from '../../src/game/story/chapter2Flags';

// Geometri ASLI sebelum Polish Sprint 2 (disalin dari aveloria.ts/chapter2Maps.ts): dekorasi hanya boleh menambah penghalang kecil.
const AVE_BASE_SOLIDS: Rect[] = [
  { x: 128, y: 1104, w: 448, h: 72 }, { x: 704, y: 1104, w: 448, h: 72 },
  { x: 160, y: 704, w: 176, h: 128 }, { x: 160, y: 960, w: 160, h: 144 }, { x: 960, y: 944, w: 160, h: 152 }, { x: 832, y: 656, w: 288, h: 136 },
  { x: 432, y: 816, w: 80, h: 64 }, { x: 288, y: 864, w: 112, h: 48 }, { x: 208, y: 848, w: 56, h: 72 }, { x: 872, y: 792, w: 80, h: 24 },
  { x: 800, y: 480, w: 48, h: 64 }, { x: 464, y: 160, w: 48, h: 184 }, { x: 768, y: 160, w: 48, h: 184 }, { x: 560, y: 184, w: 160, h: 32 },
];
const LIO_BASE_SOLIDS: Rect[] = [
  { x: 152, y: 160, w: 160, h: 120 }, { x: 648, y: 160, w: 160, h: 120 }, { x: 160, y: 400, w: 144, h: 112 }, { x: 664, y: 408, w: 144, h: 104 },
  { x: 504, y: 304, w: 96, h: 32 }, { x: 344, y: 408, w: 48, h: 32 },
];

const STEP = 4;
function reach(col: CollisionMap, w: number, h: number, start: { x: number; y: number }): Set<number> {
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

function checkMap(name: string, map: ReturnType<typeof buildAveloria>, current: CollisionMap, baseSolids: Rect[], items: typeof AVELORIA_ITEMS, spawns: { x: number; y: number }[], standables: [number, number][]): void {
  describe(`${name}: dekorasi tidak memutus rute, interaksi, trigger dan posisi cerita`, () => {
    const base = new CollisionMap(map.width, map.height, map.walkable, baseSolids);
    const start = spawns[0]!;
    const A = reach(current, map.width, map.height, start), B = reach(base, map.width, map.height, start);
    // CollisionMap membulatkan penghalang keluar ke sel 8 px; uji memakai pembulatan yang sama.
    const decor = decorSolids(items).map(d => { const x0 = Math.floor(d.x / 8) * 8, y0 = Math.floor(d.y / 8) * 8; return { x: x0, y: y0, w: Math.ceil((d.x + d.w) / 8) * 8 - x0, h: Math.ceil((d.y + d.h) / 8) * 8 - y0 }; });
    it('semua titik yang tadinya terjangkau tetap terjangkau, kecuali yang tertutup jejak dekorasi', () => {
      const lost: string[] = [];
      for (const k of B) if (!A.has(k)) { const [x, y] = fromKey(k); const f = footBox(x, y); if (!decor.some(d => overlaps(f, d))) lost.push(`${x},${y}`); }
      expect(lost.slice(0, 12), `${lost.length} sel hilang tanpa penyebab dekorasi`).toEqual([]);
    });
    it('dekorasi hanya menutup sebagian kecil area jalan', () => {
      expect(A.size / B.size).toBeGreaterThan(0.86);
    });
    it('setiap spawn dan posisi cerita dapat dipijak dan terhubung', () => {
      for (const p of [...spawns, ...standables.map(([x, y]) => ({ x, y }))]) { expect(current.canStand(footBox(p.x, p.y)), `standable ${p.x},${p.y}`).toBe(true); expect(has(A, p.x, p.y), `terhubung ${p.x},${p.y}`).toBe(true); }
    });
    it('setiap interactable dapat dijangkau (ada posisi terjangkau + arah hadap yang memicu)', () => {
      for (const it of map.interactables) {
        let ok = false;
        for (const k of A) { const [x, y] = fromKey(k); for (const f of ['up', 'down', 'left', 'right'] as const) { if (findInteractable({ x, y }, f, [it])) { ok = true; break; } } if (ok) break; }
        expect(ok, `interactable ${it.id}`).toBe(true);
      }
    });
    it('setiap trigger dapat disentuh dari area terjangkau', () => {
      for (const t of map.triggers) { let ok = false; for (const k of A) { const [x, y] = fromKey(k); if (overlaps(footBox(x, y), t)) { ok = true; break; } } expect(ok, `trigger ${t.id}`).toBe(true); }
    });
    it('jejak dekorasi tidak menimpa interactable maupun posisi kaki NPC/spawn', () => {
      for (const d of decor) for (const p of [...spawns, ...standables.map(([x, y]) => ({ x, y }))]) expect(overlaps(d, footBox(p.x, p.y)), `dekor ${JSON.stringify(d)} vs ${p.x},${p.y}`).toBe(false);
      void probeRect;
    });
  });
}

const aveNpcFeet: [number, number][] = ([...CITY_NPCS.map(n => [n.x, n.y] as [number, number]), ...CITIZENS.map(n => [n.x, n.y] as [number, number]),
  [848, 824], [752, 552], [672, 552], [704, 576], [560, 280], [720, 280], [640, 304], [640, 560], [640, 920]] as [number, number][])
  .filter(([x, y]) => !(x === 912 && y === 776)); // Azie berdiri di teras arsip (di dalam solid lama), bukan titik pijak pemain
checkMap('Aveloria', buildAveloria(), loadAveloria().collision, AVE_BASE_SOLIDS, AVELORIA_ITEMS, [CITY_SPAWN, { x: 640, y: 1312 }, { x: 648, y: 552 }], aveNpcFeet);
checkMap('Liora', buildLiora(), loadLiora().collision, LIO_BASE_SOLIDS, LIORA_ITEMS, [LIORA_SPAWN, { x: 480, y: 160 }, RETURN_SPAWN].filter((_, i) => i < 2),
  [[480, 320], [428, 584], [348, 464], [480, 112], [480, 640]]);

describe('item art', () => {
  it('semua frame yang dipakai layout ada di atlas yang dibangkitkan', async () => {
    const { readFileSync } = await import('node:fs'); const { resolve } = await import('node:path');
    for (const [file, items] of [['aveloria', AVELORIA_ITEMS], ['liora', LIORA_ITEMS]] as const) {
      const json = JSON.parse(readFileSync(resolve(__dirname, `../../public/assets/environment/town/${file}_atlas.json`), 'utf8')) as { frames: Record<string, { pivot: { x: number; y: number } }> };
      for (const it of items) { expect(json.frames[it.f], `${file}:${it.f}`).toBeTruthy(); expect(json.frames[it.f]!.pivot.y).toBeGreaterThanOrEqual(0); }
    }
  });
});
