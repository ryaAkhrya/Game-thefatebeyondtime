import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readPng } from './helpers/png';
import { AVELORIA_C4_ATLASES, AVELORIA_C4_IMAGES, AVELORIA_C4_REQUIRED_TEXTURES } from '../../src/game/data/aveloriaC4Assets';
import type { EnvAtlas } from '../../src/game/data/environmentAssets';
import { C4_ITEMS, C4_RESIDENTS, C4_GATE_GUARD, C4_HIDE_AVE } from '../../src/game/data/maps/town.c4.mjs';

const TOWN = resolve(__dirname, '../../public/assets/environment/town');
interface Atlas { frames: Record<string, { frame: { x: number; y: number; w: number; h: number }; pivot: { x: number; y: number } }>; meta: { size: { w: number; h: number } } }
const load = (name: string): Atlas => JSON.parse(readFileSync(resolve(TOWN, `${name}_atlas.json`), 'utf8')) as Atlas;
const c4 = load('town_c4'), crisis = load('town_crisis'), ave = load('aveloria');
const png = readPng(resolve(TOWN, 'town_c4_atlas.png'));

function pixels(name: string) {
  const f = c4.frames[name]!.frame;
  const idx = (x: number, y: number): number => ((f.y + y) * png.width + f.x + x) * 4;
  return { w: f.w, h: f.h, a: (x: number, y: number) => png.data[idx(x, y) + 3]!, rgb: (x: number, y: number) => [png.data[idx(x, y)]!, png.data[idx(x, y) + 1]!, png.data[idx(x, y) + 2]!] as [number, number, number] };
}
const SHADOW = [0x23, 0x1d, 0x33]; // bayangan datar: satu-satunya piksel dengan alfa < 255
const DECAL = /ground|scar|debris|dust/;
const names = Object.keys(c4.frames);

describe('atlas Aveloria sesudah runtuh (town_c4)', () => {
  it('terdaftar di data/aveloriaC4Assets (atlas + json), file ada, ukuran PNG = JSON, frame di dalam gambar dan tidak saling menimpa', () => {
    expect(AVELORIA_C4_ATLASES.some((a: EnvAtlas) => a.key === 'town_c4' && a.image.endsWith('town_c4_atlas.png') && a.json.endsWith('town_c4_atlas.json'))).toBe(true);
    for (const a of AVELORIA_C4_ATLASES) { expect(existsSync(resolve(__dirname, '../../public', a.image)), a.image).toBe(true); expect(existsSync(resolve(__dirname, '../../public', a.json)), a.json).toBe(true); }
    expect(AVELORIA_C4_IMAGES.length).toBe(0);
    expect(AVELORIA_C4_REQUIRED_TEXTURES).toContain('town_c4');
    expect([png.width, png.height]).toEqual([c4.meta.size.w, c4.meta.size.h]);
    const boxes = Object.entries(c4.frames).map(([n, f]) => ({ n, ...f.frame }));
    for (const b of boxes) { expect(b.x + b.w, b.n).toBeLessThanOrEqual(png.width); expect(b.y + b.h, b.n).toBeLessThanOrEqual(png.height); expect(b.x).toBeGreaterThanOrEqual(0); }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const p = boxes[i]!, q = boxes[j]!;
      expect(p.x < q.x + q.w && p.x + p.w > q.x && p.y < q.y + q.h && p.y + p.h > q.y, `${p.n} menimpa ${q.n}`).toBe(false);
    }
  });

  it('nama frame berawalan c4_, tidak ada jam pasir/varian terlarang, jumlah memadai', () => {
    expect(names.length).toBeGreaterThanOrEqual(40);
    for (const n of names) expect(n).toMatch(/^c4_[a-z0-9_]+$/);
    expect(names.some(n => /hourglass|pasir|sand|modern|phone/i.test(n))).toBe(false);
  });

  it('semua frame yang dipakai tata letak, warga, dan animasi ada di atlas masing-masing', () => {
    const missing: string[] = [];
    for (const it of C4_ITEMS) { const a = it.atlas === 'crisis' ? crisis : it.atlas === 'ave' ? ave : c4; if (!a.frames[it.f]) missing.push(`${it.atlas ?? 'c4'}:${it.f}`); }
    for (const r of [...C4_RESIDENTS, C4_GATE_GUARD]) for (const dir of ['down', 'side', 'up']) for (let i = 0; i < 2; i++) { const k = `cit_${r.variant}_idle_${dir}_${i}`; if (!crisis.frames[k]) missing.push(`crisis:${k}`); }
    for (let i = 0; i < 4; i++) if (!c4.frames[`c4_dust_${i}`]) missing.push(`c4_dust_${i}`);
    for (let i = 0; i < 3; i++) if (!c4.frames[`c4_cookfire_${i}`]) missing.push(`c4_cookfire_${i}`);
    expect(missing).toEqual([]);
    for (const h of C4_HIDE_AVE) expect(ave.frames[h.f], `frame dasar yang disembunyikan ${h.f}`).toBeTruthy();
  });

  it('tiap frame tidak kosong dan hanya bayangan datar yang beralfa < 255 (tanpa blur/gradien)', () => {
    for (const n of names) {
      const p = pixels(n); let solid = 0;
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
        const a = p.a(x, y); if (a === 0) continue;
        if (a === 255) { solid++; continue; }
        expect(p.rgb(x, y), `${n} piksel semi-transparan harus berwarna bayangan`).toEqual(SHADOW);
      }
      expect(solid, `${n} tidak kosong`).toBeGreaterThan(8);
    }
  });

  it('tidak ada piksel liar (piksel opak tanpa tetangga) kecuali tepi dither pada tanah/decal', () => {
    for (const n of names) {
      if (/ground/.test(n)) continue;
      const p = pixels(n); const at = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < p.w && y < p.h && p.a(x, y) > 0;
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
        if (!at(x, y)) continue;
        let nb = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && at(x + dx, y + dy)) nb++;
        expect(nb, `${n}: piksel liar di ${x},${y}`).toBeGreaterThan(0);
      }
    }
  });

  it('pivot benda berdiri = baris opak paling bawah (garis kaki); decal/debu/tanah bebas', () => {
    for (const n of names) {
      const fr = c4.frames[n]!; expect(fr.pivot.x).toBeGreaterThan(0); expect(fr.pivot.x).toBeLessThanOrEqual(1); expect(fr.pivot.y).toBeGreaterThan(0); expect(fr.pivot.y).toBeLessThanOrEqual(1);
      if (DECAL.test(n)) continue;
      const p = pixels(n); let last = -1;
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.a(x, y) === 255) { last = y; break; }
      expect(Math.round(fr.pivot.y * p.h) - 1, `${n} baris kaki`).toBe(last);
    }
  });

  it('palet tertutup: setiap frame prop memakai <= 28 warna; decal tanah <= 12; frame debu hanya 3 warna', () => {
    for (const n of names) {
      const p = pixels(n); const colors = new Set<string>();
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.a(x, y)) colors.add(p.rgb(x, y).join(','));
      const max = /ground|debris|scar|dust/.test(n) ? 12 : 28;
      expect(colors.size, `${n} warna`).toBeLessThanOrEqual(max);
      if (/dust/.test(n)) expect(colors.size).toBeLessThanOrEqual(3);
    }
  });

  it('debu: empat frame benar-benar berbeda (naik dan menyebar) dan api masak berkedip dengan dasar batu yang sama', () => {
    const sig = (n: string): string => { const p = pixels(n); let s = ''; for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) s += p.a(x, y) ? '1' : '0'; return s; };
    expect(new Set([0, 1, 2, 3].map(i => sig(`c4_dust_${i}`))).size).toBe(4);
    expect(new Set([0, 1, 2].map(i => sig(`c4_cookfire_${i}`))).size).toBe(3);
    const a = pixels('c4_cookfire_0'), b = pixels('c4_cookfire_1'); let baseDiff = 0;
    for (let y = 30; y < a.h; y++) for (let x = 0; x < a.w; x++) if (a.a(x, y) !== b.a(x, y)) baseDiff++;
    expect(baseDiff).toBe(0);
  });

  it('bekas retakan tenang: inti emas redup jarang (bukan retakan terang Bab III)', () => {
    for (const n of ['c4_scar_long', 'c4_scar_diag', 'c4_scar_gate']) {
      const p = pixels(n); let gold = 0, bright = 0, total = 0;
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { if (!p.a(x, y)) continue; total++; const [r, g, b] = p.rgb(x, y); if (r > 90 && g > 75 && b < 0.8 * r && r - b > 30) gold++; if (r > 200 && g > 190 && b < 190) bright++; }
      expect(gold / total, `${n} emas`).toBeLessThan(0.12); expect(bright, `${n} emas terang`).toBe(0);
    }
  });

  it('reruntuhan jauh lebih besar dari sisa menara: tunggul menjulang 70-100 px, timbunan lebar > 140 px', () => {
    const f = c4.frames.c4_ruin_main!.frame; expect(f.w).toBeGreaterThanOrEqual(140);
    const p = pixels('c4_ruin_main'); let top = p.h;
    for (let y = 0; y < p.h && top === p.h; y++) for (let x = 0; x < p.w; x++) if (p.a(x, y)) { top = y; break; }
    const height = Math.round(c4.frames.c4_ruin_main!.pivot.y * p.h) - top;
    expect(height).toBeGreaterThanOrEqual(70); expect(height).toBeLessThanOrEqual(110);
  });

  it('atlas lama tidak diubah isinya oleh pekerjaan ini (crisis/aveloria masih lengkap)', () => {
    expect(Object.keys(crisis.frames).length).toBe(200);
    expect(ave.frames.ave_tower).toBeTruthy(); expect(ave.frames.ave_bell).toBeTruthy();
  });
});
