import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readPng } from './helpers/png';

/** Polish Sprint 2: atlas eksplorasi cast hasil authoring (web/public/assets/characters/final). */
const DIR = resolve(__dirname, '../../public/assets/characters/final');
const IDS = ['C02', 'C03', 'C05', 'C06', 'C07', 'C08', 'C09'].filter((id) => existsSync(resolve(DIR, `${id}_explore.png`)));
const DIRS = ['down', 'left', 'right', 'up'] as const;

interface Anim { frames: number[]; fps: number }
interface Atlas {
  entity_id: string;
  frame_size: [number, number];
  atlas_size: [number, number];
  cols: number;
  pivot: [number, number];
  frames: Record<string, { rect: [number, number, number, number]; pivot: [number, number] }>;
  anims: Record<string, { idle: Anim; walk: Anim }>;
  status: string;
}

function cell(png: { width: number; data: Uint8Array }, idx: number, cols: number): Uint8Array {
  const out = new Uint8Array(32 * 48 * 4);
  const cx = (idx % cols) * 32;
  const cy = Math.floor(idx / cols) * 48;
  for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 32; x++) {
      const s = ((cy + y) * png.width + cx + x) * 4;
      const d = (y * 32 + x) * 4;
      for (let k = 0; k < 4; k++) out[d + k] = png.data[s + k]!;
    }
  }
  return out;
}

function bbox(c: Uint8Array) {
  let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
  for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) {
    if (c[(y * 32 + x) * 4 + 3]! > 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  return { x0, y0, x1, y1, h: y1 - y0 + 1 };
}

describe('cast sprites (Polish Sprint 2)', () => {
  it('Nambo C08 ada', () => {
    expect(IDS).toContain('C08');
  });
  for (const id of IDS) {
    describe(id, () => {
      const png = readPng(resolve(DIR, `${id}_explore.png`));
      const js = JSON.parse(readFileSync(resolve(DIR, `${id}_explore.json`), 'utf8')) as Atlas;
      const rows = Math.floor(png.height / 48);
      const total = js.cols * rows;

      it('dimensi, kolom, pivot, status', () => {
        expect(js.entity_id).toBe(id);
        expect(js.frame_size).toEqual([32, 48]);
        expect(png.width).toBe(js.cols * 32);
        expect(js.atlas_size).toEqual([png.width, png.height]);
        expect(png.height % 48).toBe(0);
        expect(rows).toBeGreaterThanOrEqual(4);
        expect(js.pivot).toEqual([16, 46]);
        expect(['DRAFT', 'NEEDS_REVIEW']).toContain(js.status);
        for (const f of Object.values(js.frames)) {
          expect(f.rect[2]).toBe(32);
          expect(f.rect[3]).toBe(48);
          expect(f.pivot).toEqual([16, 46]);
        }
      });

      it('anim: indeks valid, idle+walk tiap arah, 4 frame idle, baris pertama = berdiri', () => {
        for (let r = 0; r < 4; r++) {
          const a = js.anims[DIRS[r]!]!;
          expect(a).toBeTruthy();
          for (const an of [a.idle, a.walk]) {
            expect(an.fps).toBeGreaterThan(0);
            expect(an.frames.length).toBeGreaterThanOrEqual(2);
            for (const i of an.frames) { expect(Number.isInteger(i)).toBe(true); expect(i).toBeGreaterThanOrEqual(0); expect(i).toBeLessThan(total); }
          }
          expect(a.idle.frames.length).toBe(4);
          expect(a.walk.frames.length).toBe(4);
        }
      });

      it('alfa keras, tanpa piksel di tepi sel, kaki di y=46, tinggi 40-46', () => {
        const used = new Set<number>();
        for (const d of Object.values(js.anims)) for (const an of [d.idle, d.walk]) an.frames.forEach((i) => used.add(i));
        for (let r = 0; r < 4; r++) used.add(r * js.cols);
        for (const idx of used) {
          const c = cell(png, idx, js.cols);
          for (let i = 3; i < c.length; i += 4) expect(c[i] === 0 || c[i] === 255).toBe(true);
          const b = bbox(c);
          expect(b.y1, `${id} frame ${idx} baris kaki`).toBe(46);
          expect(b.h, `${id} frame ${idx} tinggi`).toBeGreaterThanOrEqual(40);
          expect(b.h, `${id} frame ${idx} tinggi`).toBeLessThanOrEqual(46);
          expect(b.x0).toBeGreaterThanOrEqual(1);
          expect(b.x1).toBeLessThanOrEqual(30);
          expect(b.y0).toBeGreaterThanOrEqual(1);
        }
      });

      it('frame idle berpasangan berbeda', () => {
        for (let r = 0; r < 4; r++) {
          const fr = js.anims[DIRS[r]!]!.idle.frames.map((i) => Buffer.from(cell(png, i, js.cols)).toString('base64'));
          expect(new Set(fr).size, `${id} ${DIRS[r]} idle`).toBe(fr.length);
        }
      });

      it('walk berbeda dari berdiri dan palet <= 32 warna', () => {
        for (let r = 0; r < 4; r++) {
          const w = js.anims[DIRS[r]!]!.walk.frames;
          const st = Buffer.from(cell(png, r * js.cols, js.cols)).toString('base64');
          const ws = w.map((i) => Buffer.from(cell(png, i, js.cols)).toString('base64'));
          expect(ws.some((b) => b !== st), `${id} ${DIRS[r]} walk berbeda dari berdiri`).toBe(true);
          expect(new Set(ws).size, `${id} ${DIRS[r]} walk >= 2 frame unik`).toBeGreaterThanOrEqual(2);
        }
        const cols = new Set<number>();
        for (let i = 0; i < png.data.length; i += 4) if (png.data[i + 3]! > 0) cols.add((png.data[i]! << 16) | (png.data[i + 1]! << 8) | png.data[i + 2]!);
        expect(cols.size).toBeLessThanOrEqual(32);
      });
    });
  }
});
