import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readPng } from './helpers/png';
import { ASSET_MANIFEST } from '../../src/game/data/assetManifest';
import { BATTLE_TEXTURE, fullAtlas, frameKeyFor, REQUIRED_BATTLE_FRAMES, type BattleAtlas } from '../../src/game/combat/BattleAtlas';

const dir = resolve(__dirname, '../../public/assets/battle');
const OUTLINE = (0x1d << 16) | (0x16 << 8) | 0x25;

interface Spec {
  id: 'C02' | 'B03' | 'M05';
  file: string;
  frame: [number, number];
  /** Pose keys that are genuinely different drawings (no aliases). */
  distinct: string[];
  extra: string[];
  alias: Record<string, string>;
  event: string;
  height: [number, number];
  width: [number, number];
  facing: string;
}

const SPECS: Spec[] = [
  { id: 'C02', file: 'C02_BATTLE_V1', frame: [116, 112], facing: 'left', event: 'cast', alias: { attack: 'cast' },
    distinct: ['idle_a', 'idle_b', 'anticipation', 'cast', 'heal', 'shield', 'summon', 'followthrough', 'recovery', 'hit_recoil', 'hit_recover', 'death_start', 'defeated'],
    extra: ['cast', 'heal', 'shield', 'summon'], height: [88, 106], width: [20, 60] },
  { id: 'B03', file: 'B03_BATTLE_V1', frame: [192, 140], facing: 'front', event: 'attack', alias: {},
    distinct: ['idle_a', 'idle_b', 'anticipation', 'charge', 'attack', 'followthrough', 'recovery', 'guard', 'special', 'hit_recoil', 'hit_recover', 'death_start', 'defeated'],
    extra: ['charge', 'guard', 'special'], height: [118, 136], width: [120, 168] },
  { id: 'M05', file: 'M05_BATTLE_V1', frame: [160, 128], facing: 'right', event: 'attack', alias: {},
    distinct: ['idle_a', 'idle_b', 'anticipation', 'attack', 'followthrough', 'recovery', 'hit_recoil', 'hit_recover', 'death_start', 'defeated'],
    extra: [], height: [100, 124], width: [70, 130] },
];

interface Meta {
  entity_id: string; status: string; facing: string; frame_size: [number, number]; atlas_size: [number, number];
  frames: Record<string, { index_0_based: number; rect: [number, number, number, number]; pivot: [number, number]; duration_ms: number }>;
  event: { frame_key: string; index_0_based: number }; notes: string;
}

describe.each(SPECS)('Phase 7 battle atlas $file', (spec) => {
  const meta = JSON.parse(readFileSync(resolve(dir, `${spec.file}.json`), 'utf8')) as Meta;
  const png = readPng(resolve(dir, `${spec.file}.png`));
  const [fw, fh] = spec.frame;
  const a = (x: number, y: number): number => png.data[(y * png.width + x) * 4 + 3]!;
  const rgb = (x: number, y: number): number => { const i = (y * png.width + x) * 4; return (png.data[i]! << 16) | (png.data[i + 1]! << 8) | png.data[i + 2]!; };
  const idx = (k: string): number => meta.frames[k]!.index_0_based;
  const stats = (k: string) => {
    const x0 = idx(k) * fw;
    let minX = fw, minY = fh, maxX = -1, maxY = -1, n = 0;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (a(x0 + x, y) > 0) { n++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    return { minX, minY, maxX, maxY, n, w: maxX - minX + 1, h: maxY - minY + 1 };
  };
  const diff = (p: string, q: string): number => {
    let d = 0;
    const xp = idx(p) * fw, xq = idx(q) * fw;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (rgb(xp + x, y) !== rgb(xq + x, y) || a(xp + x, y) !== a(xq + x, y)) d++;
    return d;
  };

  it('metadata, grid and transparency are consistent', () => {
    expect(meta.entity_id).toBe(spec.id);
    expect(meta.status).toBe('NEEDS_REVIEW');
    expect(meta.facing).toBe(spec.facing);
    expect(meta.notes).toMatch(/DRAFT/);
    expect(meta.frame_size).toEqual(spec.frame);
    expect(meta.atlas_size).toEqual([png.width, png.height]);
    expect(png.height).toBe(fh);
    expect(png.width).toBe(fw * spec.distinct.length);
    for (let i = 3; i < png.data.length; i += 4) { const v = png.data[i]!; if (v !== 0 && v !== 255) throw new Error(`soft alpha ${v}`); }
  });

  it('has the full engine frame contract plus the special keys', () => {
    for (const k of REQUIRED_BATTLE_FRAMES) expect(meta.frames[k], k).toBeDefined();
    for (const k of spec.extra) expect(meta.frames[k], k).toBeDefined();
    spec.distinct.forEach((k, i) => {
      expect(meta.frames[k]!.index_0_based).toBe(i);
      expect(meta.frames[k]!.rect).toEqual([i * fw, 0, fw, fh]);
      expect(meta.frames[k]!.duration_ms).toBeGreaterThan(0);
    });
    for (const [alias, target] of Object.entries(spec.alias)) {
      expect(meta.frames[alias]!.rect).toEqual(meta.frames[target]!.rect);
      expect(meta.frames[alias]!.duration_ms).toBeGreaterThan(0);
    }
    expect(meta.event.frame_key).toBe(spec.event);
    expect(meta.event.index_0_based).toBe(idx(spec.event));
    expect(() => fullAtlas(meta)).not.toThrow();
  });

  it('every pose is inside its cell with >= 1 px margin and is not a flat box', () => {
    for (const k of spec.distinct) {
      const s = stats(k);
      expect(s.maxX, k).toBeGreaterThan(-1);
      expect(s.minX, `${k} left`).toBeGreaterThanOrEqual(1);
      expect(s.minY, `${k} top`).toBeGreaterThanOrEqual(1);
      expect(s.maxX, `${k} right`).toBeLessThanOrEqual(fw - 2);
      expect(s.maxY, `${k} bottom`).toBeLessThanOrEqual(fh - 2);
      expect(s.n / (s.w * s.h), `${k} fill ratio`).toBeGreaterThan(0.3);
      expect(s.n / (s.w * s.h), `${k} fill ratio`).toBeLessThan(0.93);
    }
  });

  it('standing size is within the expected stage range', () => {
    const s = stats('idle_a');
    expect(s.h).toBeGreaterThanOrEqual(spec.height[0]);
    expect(s.h).toBeLessThanOrEqual(spec.height[1]);
    expect(s.w).toBeGreaterThanOrEqual(spec.width[0]);
    expect(s.w).toBeLessThanOrEqual(spec.width[1]);
  });

  it('one shared pivot and the lowest opaque row of every pose is the pivot row (foot baseline)', () => {
    const p0 = meta.frames.idle_a!.pivot;
    for (const k of Object.keys(meta.frames)) expect(meta.frames[k]!.pivot, k).toEqual(p0);
    for (const k of spec.distinct) expect(stats(k).maxY, `${k} foot row`).toBe(p0[1]);
    // pivot x lies on the standing figure
    const s = stats('idle_a');
    expect(p0[0]).toBeGreaterThanOrEqual(s.minX);
    expect(p0[0]).toBeLessThanOrEqual(s.maxX);
  });

  it('closed palette (<= 32 colours) with the plum outline, outline wraps the silhouette', () => {
    const set = new Set<number>();
    for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) if (a(x, y) > 0) set.add(rgb(x, y));
    expect(set.size).toBeLessThanOrEqual(32);
    expect(set.has(OUTLINE)).toBe(true);
    // every opaque pixel that touches transparency (4-neighbour) inside a frame is the outline colour
    for (const k of spec.distinct) {
      const x0 = idx(k) * fw;
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
        if (a(x0 + x, y) === 0) continue;
        const edge = a(x0 + x - 1, y) === 0 || x === 0 || a(x0 + x + 1, y) === 0 || a(x0 + x, y - 1) === 0 || a(x0 + x, y + 1) === 0;
        if (edge) expect(rgb(x0 + x, y), `${k} edge ${x},${y}`).toBe(OUTLINE);
      }
    }
  });

  it('no stray pixels: every 8-connected island has >= 4 px', () => {
    for (const k of spec.distinct) {
      const x0 = idx(k) * fw;
      const seen = new Uint8Array(fw * fh);
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
        if (seen[y * fw + x] || a(x0 + x, y) === 0) continue;
        let n = 0; const stack = [[x, y]]; seen[y * fw + x] = 1;
        while (stack.length) {
          const [cx, cy] = stack.pop()!; n++;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = cx! + dx, ny = cy! + dy;
            if (nx < 0 || ny < 0 || nx >= fw || ny >= fh || seen[ny * fw + nx] || a(x0 + nx, ny) === 0) continue;
            seen[ny * fw + nx] = 1; stack.push([nx, ny]);
          }
        }
        expect(n, `${k} island at ${x},${y}`).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('poses visibly differ from each other (pixel diff), idle breathes, hit and death move the body', () => {
    for (let i = 0; i < spec.distinct.length; i++) for (let j = i + 1; j < spec.distinct.length; j++) {
      expect(diff(spec.distinct[i]!, spec.distinct[j]!), `${spec.distinct[i]} vs ${spec.distinct[j]}`).toBeGreaterThanOrEqual(12);
    }
    expect(diff('idle_a', 'hit_recoil')).toBeGreaterThanOrEqual(120);
    expect(diff('idle_a', 'death_start')).toBeGreaterThanOrEqual(200);
    expect(diff('idle_a', 'defeated')).toBeGreaterThanOrEqual(400);
  });

  it('defeated frame is a fallen/collapsed silhouette (lower and wider than standing)', () => {
    const s = stats('idle_a'), d = stats('defeated');
    expect(d.h).toBeLessThan(s.h * 0.8);
    if (spec.id !== 'B03') expect(d.w).toBeGreaterThan(s.w * 1.2);
  });
});

describe('Phase 7 battle atlas specifics', () => {
  const png = (f: string) => readPng(resolve(dir, `${f}.png`));
  const countColour = (p: ReturnType<typeof readPng>, fw: number, fi: number, cols: number[]): number => {
    let n = 0;
    for (let y = 0; y < p.height; y++) for (let x = fi * fw; x < (fi + 1) * fw; x++) {
      const i = (y * p.width + x) * 4;
      if (p.data[i + 3] === 0) continue;
      if (cols.includes((p.data[i]! << 16) | (p.data[i + 1]! << 8) | p.data[i + 2]!)) n++;
    }
    return n;
  };

  it('Chronolith: the charge tell is visible in the pixels (core/arch ember flare) and the legs never move', () => {
    const p = png('B03_BATTLE_V1');
    const meta = JSON.parse(readFileSync(resolve(dir, 'B03_BATTLE_V1.json'), 'utf8')) as Meta;
    const bright = [0xffc23c, 0xfff0a8];
    const idle = countColour(p, 192, meta.frames.idle_a!.index_0_based, bright);
    const charge = countColour(p, 192, meta.frames.charge!.index_0_based, bright);
    const antic = countColour(p, 192, meta.frames.anticipation!.index_0_based, bright);
    expect(charge).toBeGreaterThanOrEqual(idle + 40);
    expect(antic).toBeGreaterThan(idle);
    // arch rises on charge: topmost opaque row is higher than idle
    const top = (fi: number): number => { for (let y = 0; y < p.height; y++) for (let x = fi * 192; x < (fi + 1) * 192; x++) if (p.data[(y * p.width + x) * 4 + 3]) return y; return -1; };
    expect(top(meta.frames.charge!.index_0_based)).toBeLessThan(top(meta.frames.idle_a!.index_0_based));
    // leg rows (bottom 24 rows) are identical in all standing poses
    const legs = (fi: number): string => { let s = ''; for (let y = 124; y <= 136; y++) for (let x = fi * 192; x < (fi + 1) * 192; x++) { const i = (y * p.width + x) * 4; s += p.data[i + 3] ? `${p.data[i]},${p.data[i + 1]},${p.data[i + 2]};` : '-;'; } return s; };
    for (const k of ['idle_b', 'anticipation', 'charge', 'attack', 'followthrough', 'recovery', 'special']) expect(legs(meta.frames[k]!.index_0_based) === legs(meta.frames.idle_a!.index_0_based), `${k} legs identical`).toBe(true);
  });

  it('Velthia: every cast pose moves the hand (palm region changes) and heal/summon raise it above the waist', () => {
    const p = png('C02_BATTLE_V1');
    const meta = JSON.parse(readFileSync(resolve(dir, 'C02_BATTLE_V1.json'), 'utf8')) as Meta;
    // skin-coloured pixels = hands/face. Lowest skin pixel row below the neck decides where the hand is (hand hangs low in idle).
    const skinRows = (fi: number): number[] => {
      const rows: number[] = [];
      for (let y = 18; y < 80; y++) for (let x = fi * 116; x < (fi + 1) * 116; x++) {
        const i = (y * p.width + x) * 4;
        if (!p.data[i + 3]) continue;
        const r = p.data[i]!, g = p.data[i + 1]!, b = p.data[i + 2]!;
        if (r > 200 && g > 140 && g < 195 && b > 100 && r - g >= 28 && g > b) rows.push(y);
      }
      return rows;
    };
    // idle hand hangs at the hip: almost no skin in rows 30..44 below the face; cast/heal/shield lift the hand there, cast reaches forward (left)
    const inBand = (k: string): number => skinRows(meta.frames[k]!.index_0_based).filter((y) => y >= 30 && y <= 44).length;
    expect(inBand('idle_a')).toBeLessThanOrEqual(3);
    for (const k of ['cast', 'heal', 'shield']) expect(inBand(k), k).toBeGreaterThanOrEqual(10);
    for (const k of ['cast', 'anticipation', 'followthrough']) expect(skinRows(meta.frames[k]!.index_0_based).join()).not.toBe(skinRows(meta.frames.idle_a!.index_0_based).join());
  });

  it('Velthia is on the party side (faces left): the front (nose side) of the head is left of the head centre', () => {
    const p = png('C02_BATTLE_V1');
    // skin pixels in the head band (rows 8..30) must sit left of the opaque head centre
    let sx = 0, sn = 0, hx = 0, hn = 0;
    for (let y = 8; y < 30; y++) for (let x = 0; x < 116; x++) {
      const i = (y * p.width + x) * 4;
      if (!p.data[i + 3]) continue;
      hx += x; hn++;
      const r = p.data[i]!, g = p.data[i + 1]!, b = p.data[i + 2]!;
      if (r > 200 && g > 140 && g < 195 && b > 100 && r - g >= 28) { sx += x; sn++; }
    }
    expect(sn).toBeGreaterThan(5);
    expect(sx / sn).toBeLessThan(hx / hn);
  });

  it('runtime wiring: texture keys, manifest entries and helper fallbacks', () => {
    expect(BATTLE_TEXTURE.C02).toBe('C02_BATTLE_V1');
    expect(BATTLE_TEXTURE.B03).toBe('B03_BATTLE_V1');
    expect(BATTLE_TEXTURE.M05).toBe('M05_BATTLE_V1');
    for (const id of ['C02_BATTLE_V1', 'B03_BATTLE_V1', 'M05_BATTLE_V1']) {
      const m = ASSET_MANIFEST.find((a) => a.id === id)!;
      expect(m, id).toBeDefined();
      expect(m.status).toBe('NEEDS_REVIEW');
      expect(existsSync(resolve(__dirname, '../../public', m.publicPath!))).toBe(true);
      expect(existsSync(resolve(__dirname, '../../public', m.publicPath!.replace(/\.png$/, '.json')))).toBe(true);
      expect(existsSync(resolve(__dirname, '../..', '..', m.sourceImage))).toBe(true);
      const meta = JSON.parse(readFileSync(resolve(__dirname, '../../public', m.publicPath!.replace(/\.png$/, '.json')), 'utf8')) as Meta;
      expect(meta.frame_size).toEqual([...m.frameSize]);
      expect(meta.atlas_size).toEqual([...m.atlasSize]);
      expect(m.eventFrame!.index).toBe(meta.event.index_0_based);
    }
    const atlas = JSON.parse(readFileSync(resolve(dir, 'M05_BATTLE_V1.json'), 'utf8')) as BattleAtlas;
    expect(frameKeyFor(atlas, 'guard')).toBe('attack');
    expect(frameKeyFor(atlas, 'recovery')).toBe('recovery');
  });
});
