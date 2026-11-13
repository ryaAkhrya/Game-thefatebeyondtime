import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readPng, type RawPng } from './helpers/png';

// Polish Sprint 2: atlas final Yaric (C01) = public/assets/characters/final/C01_explore.*
// Dihasilkan web/scripts/author-yaric-sprites.py dari atlas ternormalisasi. Status tetap NEEDS_REVIEW.

const PUBLIC = resolve(__dirname, '../../public/assets/characters');
const FW = 32, FH = 48, COLS = 4, ROWS = 14, FOOT = 46;
const DIRS = ['down', 'left', 'right', 'up'] as const;
const STATES = ['idle', 'walk', 'sprint'] as const;
const OUTLINE = ['41,25,27', '43,29,31', '37,27,28'];

interface Anim { frames: number[]; fps: number }
interface Meta {
  status: string; cols: number; frame_size: number[]; atlas_size: number[]; pivot: number[];
  frames: Record<string, { rect: number[]; pivot: number[]; grid_index: number; kind: string }>;
  anims: Record<(typeof DIRS)[number], Record<(typeof STATES)[number], Anim>>;
  notes: string[]; frames_needing_artist_redraw: string[];
}

const meta: Meta = JSON.parse(readFileSync(resolve(PUBLIC, 'final/C01_explore.json'), 'utf8'));
const png: RawPng = readPng(resolve(PUBLIC, 'final/C01_explore.png'));
const norm: RawPng = readPng(resolve(PUBLIC, 'normalized/C01_explore.png'));

const px = (im: RawPng, x: number, y: number) => { const i = (y * im.width + x) * 4; return [im.data[i]!, im.data[i + 1]!, im.data[i + 2]!, im.data[i + 3]!]; };
const frameXY = (idx: number) => ({ ox: (idx % COLS) * FW, oy: Math.floor(idx / COLS) * FH });
const cell = (im: RawPng, idx: number): number[][] => {
  const { ox, oy } = frameXY(idx);
  const rows: number[][] = [];
  for (let y = 0; y < FH; y++) { const r: number[] = []; for (let x = 0; x < FW; x++) r.push(...px(im, ox + x, oy + y)); rows.push(r); }
  return rows;
};
const opaque = (c: number[][], x: number, y: number) => c[y]![x * 4 + 3]! !== 0;
const rowOpaqueXs = (c: number[][], y: number) => { const xs: number[] = []; for (let x = 0; x < FW; x++) if (opaque(c, x, y)) xs.push(x); return xs; };
const diff = (a: number[][], b: number[][], y0 = 0, y1 = FH - 1) => {
  let n = 0;
  for (let y = y0; y <= y1; y++) for (let i = 0; i < FW * 4; i += 4) if (a[y]![i] !== b[y]![i] || a[y]![i + 1] !== b[y]![i + 1] || a[y]![i + 2] !== b[y]![i + 2] || a[y]![i + 3] !== b[y]![i + 3]) n++;
  return n;
};
const footCentre = (c: number[][]) => {
  let s = 0, n = 0;
  for (let y = FOOT - 7; y <= FOOT; y++) for (const x of rowOpaqueXs(c, y)) { s += x; n++; }
  return s / n;
};
const allIdx: number[] = [];
for (const d of DIRS) for (const s of STATES) allIdx.push(...meta.anims[d][s].frames);
const uniqueIdx = [...new Set(allIdx)].sort((a, b) => a - b);

describe('Yaric final atlas: struktur', () => {
  it('dimensi 128x672, 4 kolom x 14 baris, sel 32x48, tetap NEEDS_REVIEW', () => {
    expect(png.width).toBe(COLS * FW);
    expect(png.height).toBe(ROWS * FH);
    expect(meta.cols).toBe(COLS);
    expect(meta.frame_size).toEqual([FW, FH]);
    expect(meta.atlas_size).toEqual([png.width, png.height]);
    expect(meta.pivot).toEqual([16, FOOT]);
    expect(meta.status).toBe('NEEDS_REVIEW');
    expect(meta.notes.length).toBeGreaterThan(0);
    expect(meta.frames_needing_artist_redraw.length).toBeGreaterThan(0);
  });

  it('anims: tiap arah punya idle/walk/sprint dengan indeks grid valid dan fps', () => {
    for (const d of DIRS) for (const s of STATES) {
      const a = meta.anims[d][s];
      expect(a.fps).toBeGreaterThan(0);
      expect(a.frames.length).toBeGreaterThan(0);
      for (const i of a.frames) { expect(Number.isInteger(i)).toBe(true); expect(i).toBeGreaterThanOrEqual(0); expect(i).toBeLessThan(COLS * ROWS); }
    }
    for (const [i, d] of DIRS.entries()) expect(meta.anims[d].walk.frames).toEqual([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 3]);
    for (const d of DIRS) expect(meta.anims[d].sprint.frames).toHaveLength(6);
    for (const d of DIRS) expect(new Set(meta.anims[d].idle.frames).size).toBe(4);
  });

  it('frame JSON konsisten dengan rect/grid_index/pivot', () => {
    expect(Object.keys(meta.frames)).toHaveLength(16 + 16 + 24);
    for (const f of Object.values(meta.frames)) {
      const { ox, oy } = frameXY(f.grid_index);
      expect(f.rect).toEqual([ox, oy, FW, FH]);
      expect(f.pivot).toEqual([16, FOOT]);
    }
  });

  it('alpha keras (0/255) dan tidak ada piksel di baris y=0 atau kolom tepi sel pada semua frame', { timeout: 30000 }, () => {
    for (let i = 0; i < png.data.length; i += 4) expect([0, 255]).toContain(png.data[i + 3]);
    for (const idx of uniqueIdx) {
      const c = cell(png, idx);
      expect(rowOpaqueXs(c, 0), `frame ${idx} y=0`).toHaveLength(0);
      expect(rowOpaqueXs(c, FH - 1), `frame ${idx} y=47`).toHaveLength(0);
      for (let y = 0; y < FH; y++) { expect(opaque(c, 0, y), `frame ${idx} x=0 y=${y}`).toBe(false); expect(opaque(c, FW - 1, y), `frame ${idx} x=31 y=${y}`).toBe(false); }
    }
  });

  it('palet baru = bagian dari palet atlas ternormalisasi', () => {
    const pal = new Set<string>();
    for (let i = 0; i < norm.data.length; i += 4) if (norm.data[i + 3] !== 0) pal.add(`${norm.data[i]},${norm.data[i + 1]},${norm.data[i + 2]}`);
    for (let i = 0; i < png.data.length; i += 4) if (png.data[i + 3] !== 0) expect(pal.has(`${png.data[i]},${png.data[i + 1]},${png.data[i + 2]}`)).toBe(true);
  });
});

describe('Yaric final atlas: kaki dan baseline', () => {
  it('baris opak terbawah = y 46 pada setiap frame idle/walk/sprint semua arah', () => {
    for (const idx of uniqueIdx) {
      const c = cell(png, idx);
      expect(rowOpaqueXs(c, FOOT).length, `frame ${idx}`).toBeGreaterThan(0);
      expect(rowOpaqueXs(c, FOOT + 1)).toHaveLength(0);
    }
  });

  it('pusat kaki (8 baris terbawah) dalam +-2 px dari x=16 untuk sprint dan idle (jalan: pengecualian right dari Sprint 1 minimal 14.1)', () => {
    for (const d of DIRS) for (const s of ['idle', 'sprint'] as const) for (const i of meta.anims[d][s].frames) {
      const fc = footCentre(cell(png, i));
      expect(Math.abs(fc - 16), `${d} ${s} frame ${i} fc=${fc}`).toBeLessThanOrEqual(2);
    }
  });

  it('baris kaki idle (y>=40) identik dengan pose berdiri arahnya', () => {
    for (const [d, name] of DIRS.entries()) {
      const stand = cell(png, d * 4);
      for (let k = 0; k < 4; k++) expect(diff(cell(png, (4 + d) * 4 + k), stand, 40, 46), `${name} idle ${k}`).toBe(0);
    }
  });

  it('frame jalan baris 0..2 identik dengan atlas ternormalisasi (tidak disentuh)', () => {
    for (let idx = 0; idx < 12; idx++) expect(diff(cell(png, idx), cell(norm, idx))).toBe(0);
  });
});

describe('Yaric final atlas: mahkota rambut tampak belakang', () => {
  const topRow = (c: number[][]) => { for (let y = 0; y < FH; y++) if (rowOpaqueXs(c, y).length) return y; return -1; };

  it('baris puncak up_0..3 selebar >=5 px dengan outline gelap di siluet atas, tidak rata di sumber', () => {
    for (let k = 0; k < 4; k++) {
      const c = cell(png, 12 + k);
      const y = topRow(c);
      expect(y).toBe(1);
      const xs = rowOpaqueXs(c, y);
      expect(xs.length).toBeGreaterThanOrEqual(5);
      expect(xs.length).toBeLessThanOrEqual(10); // kubah membulat, bukan potongan rata 12-13 px
      for (const x of xs) expect(OUTLINE).toContain(`${c[y]![x * 4]},${c[y]![x * 4 + 1]},${c[y]![x * 4 + 2]}`);
      // lebar membesar menuju bawah (kubah)
      expect(rowOpaqueXs(c, 3).length).toBeGreaterThan(xs.length);
      expect(rowOpaqueXs(c, 2).length).toBeGreaterThan(xs.length);
      // tinggi figur tetap 46 (y1..y46)
      expect(topRow(c)).toBe(1);
    }
  });

  it('tampak depan/samping tidak terpotong: baris puncak runcing beroutline atau rambut, selebar >=3 px', () => {
    for (const idx of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      const c = cell(png, idx);
      expect(topRow(c)).toBe(1);
      expect(rowOpaqueXs(c, 1).length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('Yaric final atlas: idle dan sprint', () => {
  it('4 frame idle tiap arah berbeda satu sama lain (piksel jubah/rambut/torso, bukan hanya geser)', () => {
    for (const [d, name] of DIRS.entries()) {
      const f = [0, 1, 2, 3].map((k) => cell(png, (4 + d) * 4 + k));
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
        expect(diff(f[i]!, f[j]!), `${name} idle ${i}-${j}`).toBeGreaterThanOrEqual(40);
        // setiap pasangan berbeda di zona jubah ujung (y25..39) atau badan (y1..24)
        expect(diff(f[i]!, f[j]!, 1, 39)).toBeGreaterThan(0);
      }
      // perbedaan nyata setelah koreksi translasi: pose napas (turun) vs pose netral berbeda > 100 px di zona kepala/badan
      expect(diff(f[0]!, f[2]!, 1, 24), `${name} napas`).toBeGreaterThan(60);
      // jubah bergoyang: 0 vs 1 berbeda di zona ujung jubah
      expect(diff(f[0]!, f[1]!, 25, 39), `${name} jubah`).toBeGreaterThan(30);
    }
  });

  it('sprint berbeda dari semua frame jalan arahnya dan antar frame sprint berbeda', () => {
    for (const [d, name] of DIRS.entries()) {
      const walk = [0, 1, 2, 3].map((k) => cell(png, d * 4 + k));
      const sp = meta.anims[name].sprint.frames.map((i) => cell(png, i));
      for (const [k, s] of sp.entries()) {
        for (const w of walk) expect(diff(s, w), `${name} sprint ${k} vs walk`).toBeGreaterThan(100);
      }
      for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) expect(diff(sp[i]!, sp[j]!), `${name} sprint ${i}-${j}`).toBeGreaterThan(30);
    }
  });

  it('right = cermin left untuk idle dan sprint (x -> 31-x)', () => {
    for (let k = 0; k < 4; k++) {
      const l = cell(png, 5 * 4 + k), r = cell(png, 6 * 4 + k);
      for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) expect(r[y]!.slice(x * 4, x * 4 + 4)).toEqual(l[y]!.slice((FW - 1 - x) * 4, (FW - 1 - x) * 4 + 4));
    }
  });
});
