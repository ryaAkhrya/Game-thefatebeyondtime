import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FOREST2_EXTRA_SOLIDS, FOREST2_SOLIDS, FOREST2_WALKABLE, BARRICADE_STAKES, buildForest2Art } from '../../src/game/data/maps/forest2.map.mjs';
import { buildForestEdgeMap } from '../../src/game/data/maps/forestEdge.map.mjs';
import { buildForest2, loadForest2 } from '../../src/game/world/chapter2Maps';
import { loadForestEdge } from '../../src/game/world/forestEdge';
import { loadForest1 } from '../../src/game/world/forest1';
import { footBox } from '../../src/game/world/Collision';
import { readPng } from './helpers/png';

const PUBLIC = resolve(__dirname, '../../public/assets/environment');
const frames = (file: string): Record<string, { pivot: { x: number; y: number }; frame: { w: number; h: number } }> => (JSON.parse(readFileSync(resolve(PUBLIC, file), 'utf8')) as { frames: Record<string, { pivot: { x: number; y: number }; frame: { w: number; h: number } }> }).frames;

describe('Seni Hutan 2 (Polish Sprint 2)', () => {
  const f2 = loadForest2();
  const art = buildForest2Art();

  it('salinan geometri di forest2.map.mjs sama dengan chapter2Maps (walkable, solid cerita, posisi interaktif/pemicu)', () => {
    expect(f2.map.walkable).toEqual(FOREST2_WALKABLE);
    expect(f2.footRects.slice(0, 3)).toEqual(FOREST2_SOLIDS);
    expect(f2.footRects.slice(3)).toEqual(FOREST2_EXTRA_SOLIDS);
    const story = buildForest2();
    for (const i of art.interactables) {
      const s = story.interactables.find((q) => q.id === i.id);
      expect(s, i.id).toBeDefined();
      expect([s!.x, s!.y, s!.w, s!.h], i.id).toEqual([i.x, i.y, i.w, i.h]);
    }
    for (const t of art.triggers) expect(story.triggers.find((q) => q.id === t.id), t.id).toMatchObject({ x: t.x, y: t.y, w: t.w, h: t.h });
    expect(art.spawn).toEqual(story.spawn);
  });

  it('semua prop punya frame di atlas dan footprint sesuai peta; palisade ada di x~1000 sepanjang jalur jaga', () => {
    const fr = frames('forest2/props.json');
    for (const p of art.props) expect(fr, p.type).toHaveProperty(p.type);
    const stakes = BARRICADE_STAKES;
    expect(Math.min(...stakes.map((s) => s.y))).toBeLessThan(260);
    expect(Math.max(...stakes.map((s) => s.y))).toBeGreaterThan(420);
    for (const s of stakes) expect(fr).toHaveProperty(s.type);
  });

  it('tanda cerita tetap dapat dipijak setelah prop tambahan: spawn, tiap interaktif dari sisi pendekat, pemicu', () => {
    const { collision } = f2;
    expect(collision.canStand(footBox(art.spawn.x, art.spawn.y))).toBe(true);
    for (const [x, y] of [[152, 560], [820, 400], [1040, 320], [684, 520], [336, 548], [344, 552], [110, 576]] as const) expect(collision.canStand(footBox(x, y)), `${x},${y}`).toBe(true);
    // pendekat tiap interaktif cerita: di bawahnya (menghadap ke atas) atau di sisinya harus ada sel yang bisa dipijak
    for (const i of art.interactables) {
      if (i.id === 'veyrath') continue; // berdiri di balik palisade sampai dikalahkan
      const cands = [[i.x + i.w / 2, i.y + i.h + 12], [i.x + i.w / 2, i.y + i.h + 28], [i.x - 12, i.y + i.h], [i.x + i.w + 12, i.y + i.h]];
      expect(cands.some((c) => collision.canStand(footBox(c[0]!, c[1]!))), i.id).toBe(true);
    }
    for (const t of art.triggers) expect(collision.canStand(footBox(t.x + t.w / 2, t.y + t.h - 4)), t.id).toBe(true);
  });

  it('jalur utama dari spawn ke fragmen terhubung tanpa blocker dinamis (BFS 8 px)', () => {
    const { collision, map } = f2;
    const cols = Math.ceil(map.width / 8);
    const seen = new Set<number>();
    const q: Array<[number, number]> = [[Math.round(art.spawn.x / 8) * 8, Math.round(art.spawn.y / 8) * 8]];
    while (q.length) {
      const [x, y] = q.pop()!;
      const k = (y / 8) * cols + x / 8;
      if (seen.has(k) || x < 0 || y < 0 || x > map.width || y > map.height || !collision.canStand(footBox(x, y))) continue;
      seen.add(k);
      for (const [dx, dy] of [[8, 0], [-8, 0], [0, 8], [0, -8]] as const) q.push([x + dx, y + dy]);
    }
    const reach = (x: number, y: number): boolean => seen.has(Math.round(y / 8) * cols + Math.round(x / 8));
    expect(reach(680, 520)).toBe(true); // Torvan
    expect(reach(860, 400)).toBe(true); // marker kedua / tempat istirahat
    expect(reach(1100, 340)).toBe(true); // fragmen
  });

  it('PNG dasar dan atlas Hutan 2 ada dengan ukuran peta', () => {
    const png = readPng(resolve(PUBLIC, 'forest2/ground.png'));
    expect([png.width, png.height]).toEqual([1280, 768]);
  });
});

describe('Seni Tepi Hutan (Polish Sprint 2)', () => {
  const e = loadForestEdge();
  it('geometri cerita tidak berubah (walkable, pemicu, spawn) dan semua prop punya frame di atlas Hutan 1', () => {
    expect(e.map.spawn).toEqual({ x: 96, y: 656, facing: 'right' });
    expect(e.map.triggers.map((t) => t.id).sort()).toEqual(['boss_checkpoint', 'mournfang']);
    expect(e.map.solidRects).toEqual([{ id: 'mournfang_block', x: 896, y: 240, w: 20, h: 336, dynamic: true }]);
    const fr = frames('forest1/props.json');
    for (const p of e.map.props) expect(fr, p.type).toHaveProperty(p.type);
    expect(buildForestEdgeMap().props.length).toBeGreaterThan(120);
  });
  it('spawn, checkpoint dan keluar dapat dipijak; garis tengah jalur terbuka dari spawn ke keluar', () => {
    const { collision } = e;
    expect(collision.canStand(footBox(96, 656))).toBe(true);
    for (let x = 96; x <= 480; x += 8) expect(collision.canStand(footBox(x, 656)), `barat ${x}`).toBe(true);
    for (let y = 656; y >= 392; y -= 8) expect(collision.canStand(footBox(480, y)), `utara ${y}`).toBe(true);
    for (let x = 480; x <= 864; x += 8) expect(collision.canStand(footBox(x, 400)), `timur ${x}`).toBe(true);
    collision.setDynamic('mournfang_block', null);
    for (let x = 864; x <= 1340; x += 8) expect(collision.canStand(footBox(x, 400)), `ke Aveloria ${x}`).toBe(true);
    expect(collision.canStand(footBox(740, 400))).toBe(true); // checkpoint
  });
});

describe('Seni Hutan 1: posisi cerita tetap dapat dicapai (Polish Sprint 2)', () => {
  const L = loadForest1();
  it('spawn, papan, peti, semak, pemicu dan keluar berdiri di sel yang bisa dipijak; tidak ada prop padat di garis tengah jalan', () => {
    const { map, collision } = L;
    for (const s of map.solidRects) collision.setDynamic(s.id, null);
    expect(collision.canStand(footBox(map.spawn.x, map.spawn.y))).toBe(true);
    for (const i of map.interactables) {
      if (['sword', 'ground_tracks', 'nambo'].includes(i.id) || i.id.startsWith('forest_exit')) continue;
      const cands = [[i.x + i.w / 2, i.y + i.h + 10], [i.x + i.w / 2, i.y + i.h + 26], [i.x - 14, i.y + i.h], [i.x + i.w + 14, i.y + i.h]];
      expect(cands.some((c) => collision.canStand(footBox(c[0]!, c[1]!))), i.id).toBe(true);
    }
    for (const t of map.triggers) expect(collision.canStand(footBox(t.x + t.w / 2, t.y + t.h / 2)), t.id).toBe(true);
    const road = (map.road.y0 + map.road.y1) / 2;
    for (let x = 300; x <= map.zone.wrapX + 16; x += 8) expect(collision.canStand(footBox(x, road)), `jalan ${x}`).toBe(true);
    // jalan setapak dari mulut ke glade ke keluar (salinan 0 dan 1)
    for (let k = 0; k < map.zone.copies; k++) {
      const cx = map.zone.start + k * map.zone.period + map.trail.localX;
      for (let y = 470; y >= 60; y -= 8) expect(collision.canStand(footBox(cx, y)), `jalan setapak ${k} y=${y}`).toBe(true);
    }
  });
  it('prop periodik tidak dibuat dari satu jenis berulang: tiap periode memuat >= 7 jenis pohon berbeda', () => {
    const kinds = new Set(L.map.props.filter((p) => p.copy === 0 && p.type.startsWith('tree_')).map((p) => p.type));
    expect(kinds.size).toBeGreaterThanOrEqual(7);
  });
});
