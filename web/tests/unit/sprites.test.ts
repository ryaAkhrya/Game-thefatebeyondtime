import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASSET_MANIFEST, type AtlasAsset } from '../../src/game/data/assetManifest';
import { readPng, type RawPng } from './helpers/png';

// Invarian atlas eksplorasi TERNORMALISASI (Polish Sprint 1): public/assets/characters/normalized/Cxx_explore.*
// Dihasilkan web/scripts/normalize-exploration-sprites.mjs dari salinan runtime lama. Semua tetap DRAFT/NEEDS_REVIEW.

const ROOT = resolve(__dirname, '../../..');
const PUBLIC = resolve(__dirname, '../../public');
const FW = 32, FH = 48, BASE = 46;
const DIRS = ['down', 'left', 'right', 'up'] as const;
const PREFIX: Record<(typeof DIRS)[number], string> = { down: 'front', left: 'left', right: 'right', up: 'back' };
const explore = ASSET_MANIFEST.filter((a) => a.kind === 'exploration_atlas');

interface Box { x0: number; y0: number; x1: number; y1: number; w: number; h: number }
interface FrameMeta { rect: number[]; pivot: number[]; bbox_before: Box; bbox_after: Box; transform: { mirror: boolean; duplicate_rows_src_y: number[]; dy: number; dx: number; derived_from: string } }
interface NormMeta {
  entity_id: string; status: string; pivot: number[]; baseline_y: number; frame_size: number[]; atlas_size: number[];
  source: { path: string; sha256: string }; input_runtime_copy: { path: string; sha256: string };
  frames: Record<string, FrameMeta>; animations: Record<string, unknown>; notes: string[]; frames_needing_artist_redraw: string[];
}

const sha = (p: string): string => createHash('sha256').update(readFileSync(p)).digest('hex');
const alphaAt = (png: RawPng, col: number, row: number, x: number, y: number): number => png.data[((row * FH + y) * png.width + col * FW + x) * 4 + 3]!;
function frameBox(png: RawPng, col: number, row: number): Box {
  let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (alphaAt(png, col, row, x, y) > 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
const px = (png: RawPng, col: number, row: number, x: number, y: number): string => {
  const i = ((row * FH + y) * png.width + col * FW + x) * 4;
  return png.data[i + 3] === 0 ? '0' : `${png.data[i]},${png.data[i + 1]},${png.data[i + 2]},${png.data[i + 3]}`;
};
/** Titik berat x (batas piksel) dari 8 baris terbawah frame (jangkar tumpuan kaki). */
function footCenter(png: RawPng, col: number, row: number): number {
  let sum = 0, n = 0;
  for (let y = BASE - 7; y <= BASE; y++) for (let x = 0; x < FW; x++) if (alphaAt(png, col, row, x, y) > 0) { sum += x + 0.5; n++; }
  return sum / n;
}

describe.each(explore.map((a) => [a.id, a] as [string, AtlasAsset]))('Atlas eksplorasi ternormalisasi %s', (_id, a) => {
  const cols = a.atlasSize[0] / a.frameSize[0];
  const norm = readPng(resolve(PUBLIC, a.publicPath!));
  const raw = readPng(resolve(PUBLIC, a.rawPublicPath!));
  const meta = JSON.parse(readFileSync(resolve(PUBLIC, a.publicPath!.replace(/\.png$/, '.json')), 'utf8')) as NormMeta;
  const isC01 = a.id === 'C01_YARIC_EXPLORE';

  it('berada di folder normalized/, dimensi + grid sama dengan atlas lama, RGBA, status tetap DRAFT/NEEDS_REVIEW', () => {
    expect(a.publicPath).toMatch(/^assets\/characters\/normalized\/C\d\d_explore\.png$/);
    expect([norm.width, norm.height]).toEqual([...a.atlasSize]);
    expect([norm.width, norm.height]).toEqual([raw.width, raw.height]);
    expect(meta.frame_size).toEqual([FW, FH]);
    expect(meta.atlas_size).toEqual([...a.atlasSize]);
    expect(['DRAFT', 'NEEDS_REVIEW']).toContain(meta.status);
    expect(meta.status).toBe(a.status);
    expect(Object.keys(meta.frames)).toHaveLength(cols * 4);
  });

  it('sumber tidak berubah: sha256 sumber/salinan lama di JSON = hash file sekarang', () => {
    expect(meta.source.sha256).toBe(sha(resolve(ROOT, a.sourceImage)));
    expect(meta.source.path).toBe(a.sourceImage);
    expect(meta.input_runtime_copy.sha256).toBe(sha(resolve(PUBLIC, a.rawPublicPath!)));
  });

  it('alpha keras (hanya 0/255), tidak ada warna baru di luar palet atlas lama', () => {
    const palette = new Set<string>();
    for (let i = 0; i < raw.data.length; i += 4) if (raw.data[i + 3]! > 0) palette.add(`${raw.data[i]},${raw.data[i + 1]},${raw.data[i + 2]}`);
    for (let i = 0; i < norm.data.length; i += 4) {
      const al = norm.data[i + 3]!;
      expect(al === 0 || al === 255).toBe(true);
      if (al === 255 && !palette.has(`${norm.data[i]},${norm.data[i + 1]},${norm.data[i + 2]}`)) throw new Error(`warna baru pada piksel ${i / 4}`);
    }
  });

  it('JSON: rect sejajar sel 32x48, pivot [16,46], bbox_after cocok piksel nyata, animasi 4 arah tetap ada', () => {
    expect(meta.pivot).toEqual([16, BASE]);
    expect(meta.baseline_y).toBe(BASE);
    for (let r = 0; r < 4; r++) for (let c = 0; c < cols; c++) {
      const f = meta.frames[`${PREFIX[DIRS[r]!]}_${c}`]!;
      expect(f, `${PREFIX[DIRS[r]!]}_${c}`).toBeDefined();
      expect(f.rect).toEqual([c * FW, r * FH, FW, FH]);
      expect(f.pivot).toEqual([16, BASE]);
      expect(f.bbox_after).toEqual(frameBox(norm, c, r));
      expect(f.bbox_before).toBeDefined();
    }
    for (const d of ['front', 'left', 'right', 'back']) {
      expect(meta.animations[`${d}_idle`], d).toBeDefined();
      expect(meta.animations[`${d}_walk`], d).toBeDefined();
    }
    expect(meta.frames_needing_artist_redraw.length).toBeGreaterThan(0);
  });

  it('SETIAP frame 4 arah: baris opak terbawah = y 46 (kaki di garis pivot), tidak ada piksel pada tepi sel', () => {
    for (let r = 0; r < 4; r++) for (let c = 0; c < cols; c++) {
      const b = frameBox(norm, c, r);
      const name = `${DIRS[r]}_${c}`;
      expect(b.y1, `kaki ${name}`).toBe(BASE);
      expect(b.y0, `atas ${name}`).toBeGreaterThanOrEqual(1);
      expect(b.x0, `kiri ${name}`).toBeGreaterThanOrEqual(1);
      expect(b.x1, `kanan ${name}`).toBeLessThanOrEqual(FW - 2);
      for (let y = 0; y < FH; y++) { expect(alphaAt(norm, c, r, 0, y)).toBe(0); expect(alphaAt(norm, c, r, FW - 1, y)).toBe(0); }
      for (let x = 0; x < FW; x++) { expect(alphaAt(norm, c, r, x, 0)).toBe(0); expect(alphaAt(norm, c, r, x, FH - 1)).toBe(0); }
    }
  });

  it('tinggi bbox per arah seragam (toleransi 1 px = bob kepala 1 px bawaan atlas prototipe; C01 tepat 46 px di semua arah)', () => {
    for (let r = 0; r < 4; r++) {
      const hs = Array.from({ length: cols }, (_, c) => frameBox(norm, c, r).h);
      expect(Math.max(...hs) - Math.min(...hs), `${DIRS[r]}`).toBeLessThanOrEqual(isC01 ? 0 : 1);
    }
    if (isC01) for (let r = 0; r < 4; r++) for (let c = 0; c < cols; c++) expect(frameBox(norm, c, r).h).toBe(46);
    // Semua arah memiliki tinggi (maksimum) yang sama dengan tampak depan.
    const front = Math.max(...Array.from({ length: cols }, (_, c) => frameBox(norm, c, 0).h));
    for (let r = 1; r < 4; r++) expect(Math.max(...Array.from({ length: cols }, (_, c) => frameBox(norm, c, r).h))).toBe(front);
  });

  it('horizontal: SATU offset-x per baris arah (sama di semua frame), jangkar kaki rata-rata dalam 0.75 px dari x=16; tak ada jitter antar-frame', () => {
    for (let r = 0; r < 4; r++) {
      const dxs = Array.from({ length: cols }, (_, c) => meta.frames[`${PREFIX[DIRS[r]!]}_${c}`]!.transform.dx);
      expect(new Set(dxs).size).toBe(1);
      const dys = new Set(Array.from({ length: cols }, (_, c) => meta.frames[`${PREFIX[DIRS[r]!]}_${c}`]!.transform.dy));
      expect(dys.size).toBe(1); // satu pergeseran vertikal per arah (tidak ada getaran vertikal)
      const centers = Array.from({ length: cols }, (_, c) => footCenter(norm, c, r));
      const mean = centers.reduce((s, v) => s + v, 0) / cols;
      expect(Math.abs(mean - 16), `${DIRS[r]}`).toBeLessThanOrEqual(0.75);
      for (const cX of centers) expect(Math.abs(cX - mean), `${DIRS[r]} antar-frame`).toBeLessThanOrEqual(isC01 ? 3 : 0.5);
    }
  });

  it('tanpa interpolasi: tiap frame persis rekonstruksi dari salinan lama (cermin + penggandaan baris + dy + dx)', () => {
    for (let r = 0; r < 4; r++) for (let c = 0; c < cols; c++) {
      const t = meta.frames[`${PREFIX[DIRS[r]!]}_${c}`]!.transform;
      const srcRow = t.mirror ? DIRS.indexOf('left') : r; // satu-satunya mirrorFrom yang dipakai: left -> right (C01)
      const dup = new Set(t.duplicate_rows_src_y);
      const idx: number[] = [];
      for (let y = 0; y < FH; y++) { idx.push(y); if (dup.has(y)) idx.push(y); }
      for (let y = 0; y < FH; y++) {
        const k = idx[y - t.dy];
        for (let x = 0; x < FW; x++) {
          const sx = t.mirror ? FW - 1 - (x - t.dx) : x - t.dx;
          const expected = y - t.dy < 0 || k === undefined || sx < 0 || sx >= FW ? '0' : px(raw, c, srcRow, sx, k);
          expect(px(norm, c, r, x, y), `${DIRS[r]}_${c} (${x},${y})`).toBe(expected);
        }
      }
    }
  });

  it('Yaric: left/right/up setinggi tampak depan (46 px), right = cermin horizontal left (sebelum offset-x)', () => {
    if (!isC01) return;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const b = frameBox(norm, c, r); expect([b.y0, b.y1]).toEqual([1, 46]); }
    const dxL = meta.frames.left_0!.transform.dx, dxR = meta.frames.right_0!.transform.dx;
    for (let c = 0; c < 4; c++) for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const lx = x - dxR, mx = FW - 1 - lx; // posisi di baris right -> posisi pra-offset di left (cermin)
      const lPos = mx + dxL;
      const l = lPos >= 0 && lPos < FW ? px(norm, c, 1, lPos, y) : '0';
      if (lx >= 0 && lx < FW) expect(px(norm, c, 2, x, y), `right_${c} (${x},${y})`).toBe(l);
    }
    // Atlas lama: kiri 40 px, kanan 36 px (dicatat sebagai bukti masalah asal)
    expect(meta.frames.left_0!.bbox_before.h).toBe(40);
    expect(meta.frames.right_0!.bbox_before.h).toBe(36);
  });
});
