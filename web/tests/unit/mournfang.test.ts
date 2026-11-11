import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readPng } from './helpers/png';

const dir = resolve(__dirname, '../../public/assets/battle');
const meta = JSON.parse(readFileSync(resolve(dir, 'B01_BATTLE_V4.json'), 'utf8')) as {
  entity_id: string;
  status: string;
  frame_size: [number, number];
  atlas_size: [number, number];
  facing: string;
  frames: Record<string, { index_0_based: number; rect: [number, number, number, number]; pivot: [number, number]; duration_ms: number }>;
  event: { frame_key: string; index_0_based: number };
};
const png = readPng(resolve(dir, 'B01_BATTLE_V4.png'));
const KEYS = ['idle_a', 'idle_b', 'anticipation', 'attack', 'followthrough', 'recovery', 'hit_recoil', 'hit_recover', 'death_start', 'defeated'];
const OUTLINE = [0x1d, 0x16, 0x25];

function px(x: number, y: number): [number, number, number, number] {
  const i = (y * png.width + x) * 4;
  return [png.data[i]!, png.data[i + 1]!, png.data[i + 2]!, png.data[i + 3]!];
}

function frameStats(key: string) {
  const [rx, ry, rw, rh] = meta.frames[key]!.rect;
  let minX = rw, minY = rh, maxX = -1, maxY = -1, opaque = 0;
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      if (px(rx + x, ry + y)[3] > 0) {
        opaque++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { rx, ry, rw, rh, minX, minY, maxX, maxY, opaque };
}

describe('Mournfang B01 battle atlas V4', () => {
  it('atlas dimensions match JSON and metadata is consistent', () => {
    expect(meta.entity_id).toBe('B01');
    expect(meta.status).toBe('NEEDS_REVIEW');
    expect(meta.facing).toBe('right');
    expect(meta.atlas_size).toEqual([png.width, png.height]);
    expect(meta.frame_size).toEqual([160, 128]);
    expect(png.width % 160).toBe(0);
    expect(png.height).toBe(128);
  });

  it('has all 10 frame keys, sequential indices and in-atlas rects', () => {
    expect(Object.keys(meta.frames).sort()).toEqual([...KEYS].sort());
    KEYS.forEach((k, i) => {
      const f = meta.frames[k]!;
      expect(f.index_0_based).toBe(i);
      expect(f.rect).toEqual([i * 160, 0, 160, 128]);
      expect(f.rect[0] + f.rect[2]).toBeLessThanOrEqual(png.width);
      expect(f.duration_ms).toBeGreaterThan(0);
    });
    expect(meta.event.frame_key).toBe('attack');
    expect(meta.event.index_0_based).toBe(meta.frames.attack!.index_0_based);
  });

  it('every frame is substantial, inside its cell with >= 1 px margin', () => {
    for (const k of KEYS) {
      const s = frameStats(k);
      expect(s.maxX).toBeGreaterThan(-1);
      expect(s.minX, `${k} left margin`).toBeGreaterThanOrEqual(1);
      expect(s.minY, `${k} top margin`).toBeGreaterThanOrEqual(1);
      expect(s.maxX, `${k} right margin`).toBeLessThanOrEqual(s.rw - 2);
      expect(s.maxY, `${k} bottom margin`).toBeLessThanOrEqual(s.rh - 2);
      const area = (s.maxX - s.minX + 1) * (s.maxY - s.minY + 1);
      expect(s.opaque / area, `${k} fill ratio`).toBeGreaterThanOrEqual(0.25);
    }
  });

  it('uses hard alpha only (0 or 255)', () => {
    for (let i = 3; i < png.data.length; i += 4) {
      const a = png.data[i]!;
      if (a !== 0 && a !== 255) throw new Error(`soft alpha ${a} at byte ${i}`);
    }
  });

  it('shares one pivot across all frames and the feet sit on it', () => {
    const p0 = meta.frames.idle_a!.pivot;
    for (const k of KEYS) {
      expect(meta.frames[k]!.pivot).toEqual(p0);
      const s = frameStats(k);
      expect(s.maxY, `${k} lowest row == pivot y`).toBe(p0[1]);
    }
    expect(p0[0]).toBeGreaterThan(40);
    expect(p0[0]).toBeLessThan(120);
  });

  it('keeps the palette small (<= 32 colours)', () => {
    const set = new Set<number>();
    for (let i = 0; i < png.data.length; i += 4) {
      if (png.data[i + 3] === 0) continue;
      set.add((png.data[i]! << 16) | (png.data[i + 1]! << 8) | png.data[i + 2]!);
    }
    expect(set.size).toBeLessThanOrEqual(32);
    expect(set.has((OUTLINE[0]! << 16) | (OUTLINE[1]! << 8) | OUTLINE[2]!)).toBe(true);
  });

  it('feet bottom row is identical in every frame', () => {
    const [, ry, rw] = meta.frames.idle_a!.rect;
    const y = meta.frames.idle_a!.pivot[1];
    const ref: number[] = [];
    for (let x = 0; x < rw; x++) ref.push(...px(x, ry + y));
    for (const k of KEYS) {
      const [rx] = meta.frames[k]!.rect;
      const row: number[] = [];
      for (let x = 0; x < rw; x++) row.push(...px(rx + x, ry + y));
      expect(row, k).toEqual(ref);
    }
  });

  it('silhouette edge is the plum outline colour in every frame', () => {
    for (const k of KEYS) {
      const [rx, ry, rw, rh] = meta.frames[k]!.rect;
      let edge = 0, outline = 0;
      for (let y = 0; y < rh; y++) {
        for (let x = 0; x < rw; x++) {
          const p = px(rx + x, ry + y);
          if (p[3] === 0) continue;
          const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
            const nx = x + dx!, ny = y + dy!;
            return nx < 0 || ny < 0 || nx >= rw || ny >= rh || px(rx + nx, ry + ny)[3] === 0;
          });
          if (!nb) continue;
          edge++;
          if (p[0] === OUTLINE[0] && p[1] === OUTLINE[1] && p[2] === OUTLINE[2]) outline++;
        }
      }
      expect(edge, k).toBeGreaterThan(100);
      expect(outline / edge, `${k} outline share on silhouette edge`).toBeGreaterThan(0.97);
    }
  });
});
