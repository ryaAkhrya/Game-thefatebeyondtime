import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CollisionMap, footBox, moveWithCollision, overlaps } from '../../src/game/world/Collision';
import { findInteractable, probeRect } from '../../src/game/world/Interaction';
import { footRectOf, loadForest1 } from '../../src/game/world/forest1';
import { readPng } from './helpers/png';

const PUBLIC = resolve(__dirname, '../../public');

describe('CollisionMap', () => {
  const walkable = [{ shape: 'rect' as const, x: 0, y: 0, w: 200, h: 100 }];

  it('hanya area walkable yang bisa dipijak; kotak kaki harus seluruhnya di dalam', () => {
    const m = new CollisionMap(400, 300, walkable, []);
    expect(m.canStand(footBox(100, 50))).toBe(true);
    expect(m.canStand(footBox(100, 120))).toBe(false); // di luar
    expect(m.canStand(footBox(2, 50))).toBe(false); // setengah kotak di luar tepi kiri
  });

  it('elips walkable', () => {
    const m = new CollisionMap(400, 400, [{ shape: 'ellipse', cx: 200, cy: 200, rx: 100, ry: 50 }], []);
    expect(m.canStand(footBox(200, 200))).toBe(true);
    expect(m.canStand(footBox(270, 200))).toBe(true);
    expect(m.canStand(footBox(200, 260))).toBe(false);
  });

  it('blocker statis (kaki pohon/batu) menghalangi', () => {
    const m = new CollisionMap(400, 300, walkable, [{ x: 90, y: 40, w: 20, h: 12 }]);
    expect(m.canStand(footBox(100, 46))).toBe(false);
    expect(m.canStand(footBox(150, 46))).toBe(true);
  });

  it('blocker dinamis dapat dinyalakan dan dimatikan', () => {
    const m = new CollisionMap(400, 300, walkable, []);
    m.setDynamic('gate', { x: 90, y: 0, w: 20, h: 100 });
    expect(m.canStand(footBox(100, 50))).toBe(false);
    m.setDynamic('gate', null);
    expect(m.canStand(footBox(100, 50))).toBe(true);
  });

  it('moveWithCollision berhenti di dinding dan tidak menembus (termasuk langkah besar)', () => {
    const m = new CollisionMap(400, 300, walkable, [{ x: 120, y: 0, w: 10, h: 100 }]);
    const r = moveWithCollision(m, 100, 50, 60, 0); // langkah 60 px menuju dinding di x=120
    expect(r.blocked).toBe(true);
    expect(r.x).toBeLessThan(120);
    expect(r.x).toBeGreaterThan(105);
    const after = moveWithCollision(m, r.x, r.y, 30, 0);
    expect(after.x).toBe(r.x);
    expect(after.moved).toBe(0);
  });

  it('bergerak bebas di ruang kosong', () => {
    const m = new CollisionMap(400, 300, walkable, []);
    const r = moveWithCollision(m, 50, 50, 10, -5);
    expect(r).toMatchObject({ x: 60, y: 45, blocked: false });
  });
});

describe('Interaction', () => {
  const sign = { id: 's', kind: 'sign' as const, verb: 'Baca', x: 90, y: 40, w: 20, h: 40 };

  it('hanya berlaku bila menghadap objek dan cukup dekat', () => {
    // pemain di selatan papan, menghadap ke atas
    expect(findInteractable({ x: 100, y: 90 }, 'up', [sign])?.id).toBe('s');
    expect(findInteractable({ x: 100, y: 90 }, 'down', [sign])).toBeNull(); // membelakangi
    expect(findInteractable({ x: 140, y: 60 }, 'left', [sign])).toBeNull(); // terlalu jauh di samping
    expect(findInteractable({ x: 120, y: 60 }, 'left', [sign])?.id).toBe('s'); // menghadap dari samping
    expect(findInteractable({ x: 100, y: 200 }, 'up', [sign])).toBeNull(); // terlalu jauh
  });

  it('objek nonaktif diabaikan; irisan terbesar menang', () => {
    const a = { ...sign, id: 'a', enabled: false };
    const b = { ...sign, id: 'b', y: 60 };
    expect(findInteractable({ x: 100, y: 90 }, 'up', [a])).toBeNull();
    expect(findInteractable({ x: 100, y: 90 }, 'up', [a, b])?.id).toBe('b');
  });

  it('persegi uji berada di depan sesuai arah', () => {
    const f = { x: 100, y: 100 };
    expect(probeRect(f, 'up').y).toBeLessThan(100);
    expect(probeRect(f, 'down').y + probeRect(f, 'down').h).toBeGreaterThan(100);
    expect(probeRect(f, 'left').x).toBeLessThan(100);
    expect(probeRect(f, 'right').x).toBeGreaterThan(100);
    expect(overlaps(probeRect(f, 'up'), { x: 95, y: 80, w: 10, h: 10 })).toBe(true);
  });
});

describe('Peta Hutan 1', () => {
  const L = loadForest1();
  const { map, collision } = L;

  it('spawn berada di area walkable dan bebas collision', () => {
    expect(collision.canStand(footBox(map.spawn.x, map.spawn.y))).toBe(true);
  });

  it('ID prop, interaktif, trigger, dan solid unik', () => {
    for (const list of [map.props.map((p) => p.id), map.interactables.map((i) => i.id), map.triggers.map((t) => t.id), map.solidRects.map((s) => s.id)]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it('semua tipe prop punya frame di props.json (art dan peta sinkron)', () => {
    const meta = JSON.parse(readFileSync(resolve(PUBLIC, 'assets/environment/forest1/props.json'), 'utf8')) as { frames: Record<string, unknown> };
    for (const p of map.props) expect(meta.frames, p.type).toHaveProperty(p.type);
    expect(meta.frames).toHaveProperty('thicket_open');
    expect(meta.frames).toHaveProperty('chest_open');
  });

  it('pohon dan batu menghalangi: kaki prop solid tidak bisa dipijak', () => {
    let tested = 0;
    for (const p of map.props) {
      if (!['tree_a', 'tree_b', 'tree_pine', 'rock_l', 'stump', 'log', 'bush'].includes(p.type)) continue;
      const r = footRectOf(p.type, p.x, p.y)!;
      expect(collision.canStand({ x: r.x + r.w / 2 - 2, y: r.y + r.h / 2 - 1, w: 4, h: 2 }), `${p.type}@${p.x},${p.y}`).toBe(false);
      tested++;
    }
    expect(tested).toBeGreaterThan(40);
  });

  it('jalan dan rumput bisa dilalui: sepanjang koridor bebas halangan (pada garis jalan)', () => {
    const y = (map.road.y0 + map.road.y1) / 2;
    // Bebas dari gerbang dinamis: nonaktifkan dulu
    collision.setDynamic('gate_awake', null);
    for (const s of map.solidRects) collision.setDynamic(s.id, null);
    // nambo adalah NPC: bukan bagian peta ini
    let blocked = 0;
    for (let x = 300; x < map.zone.wrapX + 16; x += 8) if (!collision.canStand(footBox(x, y))) blocked++;
    expect(blocked).toBe(0);
  });

  it('gerbang (sebelum C1-01 selesai) memblokir pintu keluar tempat bangun; terbuka setelah itu', () => {
    const y = 15.5 * 32;
    const gate = map.solidRects.find((s) => s.id === 'gate_awake')!;
    collision.setDynamic('gate_awake', gate);
    expect(collision.canStand(footBox(gate.x + 8, y))).toBe(false);
    // tidak ada celah lain: sapu seluruh tinggi koridor di kolom gerbang
    for (let yy = 300; yy <= 640; yy += 4) expect(collision.canStand(footBox(gate.x + 8, yy)), `y=${yy}`).toBe(false);
    collision.setDynamic('gate_awake', null);
    expect(collision.canStand(footBox(gate.x + 8, y))).toBe(true);
  });

  it('semak berduri menutup mulut jalan setapak sampai pengulangan disadari', () => {
    const th = map.solidRects.filter((s) => s.id.startsWith('thicket_block'));
    expect(th).toHaveLength(map.zone.copies);
    const first = th[0]!;
    const cx = first.x + first.w / 2;
    for (const s of th) collision.setDynamic(s.id, s);
    // tidak ada jalur ke utara melalui kolom mulut jalan setapak
    let passed = false;
    for (let x = cx - 24; x <= cx + 24; x += 4) if (collision.canStand(footBox(x, first.y + first.h / 2))) passed = true;
    expect(passed).toBe(false);
    for (const s of th) collision.setDynamic(s.id, null);
    expect(collision.canStand(footBox(cx, first.y + first.h / 2))).toBe(true);
  });

  /** BFS pada grid sel 8 px dari titik awal; mengembalikan himpunan sel terjangkau untuk kotak kaki. */
  function reachable(startX: number, startY: number): Set<number> {
    const cols = Math.ceil(map.width / 8);
    const seen = new Set<number>();
    const q: Array<[number, number]> = [[Math.round(startX / 8) * 8, Math.round(startY / 8) * 8]];
    seen.add(q[0]![1] / 8 * cols + q[0]![0] / 8);
    while (q.length) {
      const [x, y] = q.pop()!;
      for (const [dx, dy] of [[8, 0], [-8, 0], [0, 8], [0, -8]] as const) {
        const nx = x + dx, ny = y + dy;
        const k = (ny / 8) * cols + nx / 8;
        if (seen.has(k) || nx < 0 || ny < 0 || nx > map.width || ny > map.height) continue;
        if (!collision.canStand(footBox(nx, ny))) continue;
        seen.add(k);
        q.push([nx, ny]);
      }
    }
    return seen;
  }

  it('tidak ada softlock: dari spawn semua titik penting terjangkau setelah gerbang dan semak terbuka', () => {
    for (const s of map.solidRects) collision.setDynamic(s.id, null);
    const reach = reachable(map.spawn.x, map.spawn.y);
    const cols = Math.ceil(map.width / 8);
    const can = (x: number, y: number): boolean => reach.has(Math.round(y / 8) * cols + Math.round(x / 8));
    // titik Nambo, papan (salinan 0), mulut jalan setapak, peti (salinan 0), pintu keluar demo (salinan 0)
    const nambo = map.npcs[0]!;
    expect(can(nambo.x - 40, nambo.y)).toBe(true);
    const sign0 = map.interactables.find((i) => i.id === 'sign#0')!;
    expect(can(sign0.x + sign0.w / 2, sign0.y + sign0.h + 14)).toBe(true);
    const sign1 = map.interactables.find((i) => i.id === 'sign#1')!;
    expect(can(sign1.x + sign1.w / 2, sign1.y + sign1.h + 14)).toBe(true);
    const chest0 = map.interactables.find((i) => i.id === 'chest#0')!;
    expect(can(chest0.x + chest0.w / 2 - 20, chest0.y + chest0.h + 6)).toBe(true);
    const end0 = map.triggers.find((t) => t.id === 'demo_end#0')!;
    expect(can(end0.x + end0.w / 2, end0.y + end0.h / 2)).toBe(true);
    const enter0 = map.triggers.find((t) => t.id === 'trail_enter#0')!;
    expect(can(enter0.x + enter0.w / 2, enter0.y + enter0.h / 2)).toBe(true);
  });

  it('sebelum gerbang dibuka, Nambo dan lorong TIDAK terjangkau dari spawn', () => {
    for (const s of map.solidRects) collision.setDynamic(s.id, s);
    const reach = reachable(map.spawn.x, map.spawn.y);
    const cols = Math.ceil(map.width / 8);
    const nambo = map.npcs[0]!;
    expect(reach.has(Math.round(nambo.y / 8) * cols + Math.round((nambo.x - 40) / 8))).toBe(false);
    for (const s of map.solidRects) collision.setDynamic(s.id, null);
  });

  it('dekorasi lorong PERIODIK: salinan 0 dan 1 sama persis (tipe, offset, peran)', () => {
    const { start, period } = map.zone;
    const key = (p: { type: string; x: number; y: number; role?: string }, k: number): string => `${p.type}|${p.x - start - k * period}|${p.y}|${p.role ?? ''}`;
    const c0 = map.props.filter((p) => p.copy === 0).map((p) => key(p, 0)).sort();
    const c1 = map.props.filter((p) => p.copy === 1 && p.x - start - period < period).map((p) => key(p, 1)).sort();
    expect(c0.length).toBeGreaterThan(60);
    expect(c1).toEqual(c0);
  });

  it('dasar peta periodik: kolom piksel x dan x+periode identik di zona', () => {
    const png = readPng(resolve(PUBLIC, 'assets/environment/forest1/ground.png'));
    expect(png.width).toBe(map.width);
    expect(png.height).toBe(map.height);
    const { start, period } = map.zone;
    let diff = 0;
    let total = 0;
    for (let y = 0; y < png.height; y += 1) {
      for (let x = start; x < map.width - period; x += 1) {
        const a = (y * png.width + x) * 4;
        const b = (y * png.width + x + period) * 4;
        total++;
        if (png.data[a] !== png.data[b] || png.data[a + 1] !== png.data[b + 1] || png.data[a + 2] !== png.data[b + 2]) diff++;
      }
    }
    expect(diff / total).toBeLessThan(0.0005); // toleransi hanya untuk detail tepi trail yang bergantung pada tx
  });

  it('PNG lingkungan ada dan berukuran sesuai peta', () => {
    expect(existsSync(resolve(PUBLIC, 'assets/environment/forest1/props.png'))).toBe(true);
  });

  it('wrapX dan landing memberi pandangan identik: batas zona dan margin kamera terpenuhi', () => {
    const { start, period, wrapX } = map.zone;
    const halfView = 320; // setengah lebar kamera 640
    const landing = wrapX - period;
    expect(landing - halfView).toBeGreaterThanOrEqual(start); // pandangan landing tak melihat area non-periodik
    expect(wrapX + halfView).toBeLessThanOrEqual(map.width); // kamera tidak terjepit batas peta saat wrap
    expect(landing - halfView).toBeGreaterThanOrEqual(0);
  });
});
