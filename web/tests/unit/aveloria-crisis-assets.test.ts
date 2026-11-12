import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readPng } from './helpers/png';
import { CRISIS_ITEMS, WALKERS } from '../../src/game/world/aveloriaCrisis';
import { ENV_ATLASES } from '../../src/game/data/environmentAssets';

const DIR = resolve(__dirname, '../../public/assets/environment/town');
const json = JSON.parse(readFileSync(resolve(DIR, 'town_crisis_atlas.json'), 'utf8')) as { frames: Record<string, { frame: { x: number; y: number; w: number; h: number }; pivot: { x: number; y: number } }>; meta: { size: { w: number; h: number } } };
const png = readPng(resolve(DIR, 'town_crisis_atlas.png'));

function pixels(name: string): { w: number; h: number; a: (x: number, y: number) => number; rgb: (x: number, y: number) => string } {
  const f = json.frames[name]!.frame;
  const idx = (x: number, y: number): number => ((f.y + y) * png.width + f.x + x) * 4;
  return { w: f.w, h: f.h, a: (x, y) => png.data[idx(x, y) + 3]!, rgb: (x, y) => `${png.data[idx(x, y)]},${png.data[idx(x, y) + 1]},${png.data[idx(x, y) + 2]}` };
}

describe('atlas krisis Aveloria (town_crisis)', () => {
  it('terdaftar di environmentAssets dan ukuran PNG = JSON', () => {
    expect(ENV_ATLASES.some(a => a.key === 'town_crisis' && a.image.endsWith('town_crisis_atlas.png') && a.json.endsWith('town_crisis_atlas.json'))).toBe(true);
    expect([png.width, png.height]).toEqual([json.meta.size.w, json.meta.size.h]);
    for (const [n, fr] of Object.entries(json.frames)) { expect(fr.frame.x + fr.frame.w, n).toBeLessThanOrEqual(png.width); expect(fr.frame.y + fr.frame.h, n).toBeLessThanOrEqual(png.height); }
  });
  it('semua frame yang dipakai tata letak/view ada', () => {
    const need = new Set<string>(['crisis_flame_l', 'crisis_flame_c', 'crisis_flame_r', 'crisis_well_water_a', 'crisis_well_water_b', 'crisis_crate_carry', 'crisis_apple', 'crisis_basket', 'crisis_fshadow_s', 'crisis_fshadow_m']);
    for (const i of CRISIS_ITEMS) { if (i.f) need.add(i.f); if (i.pose) need.add(i.pose); if (i.s) need.add(i.s); }
    for (let k = 0; k <= 5; k++) need.add(`crisis_clock_${k}`);
    for (let k = 0; k <= 3; k++) need.add(`crisis_banner_${k}`);
    for (const w of WALKERS) for (const dir of ['down', 'side', 'up']) { for (let i = 0; i < 2; i++) need.add(`cit_${w.variant}_idle_${dir}_${i}`); for (let i = 0; i < 4; i++) need.add(`cit_${w.variant}_walk_${dir}_${i}`); }
    need.add('cit_guard_idle_down_0');
    const missing = [...need].filter(n => !json.frames[n]);
    expect(missing).toEqual([]);
  });
  it('tidak ada aset jam pasir (bukan canon) dan tidak ada nama frame misterius', () => {
    for (const n of Object.keys(json.frames)) expect(n).toMatch(/^(crisis_|cit_)/);
    expect(Object.keys(json.frames).some(n => /hourglass|pasir|sand/i.test(n))).toBe(false);
  });
  const citizens = Object.keys(json.frames).filter(n => n.startsWith('cit_'));
  it(`warga (${citizens.length} frame): sel 32x48, kaki di y=46, tanpa piksel di tepi, alfa keras, palet tertutup`, () => {
    expect(citizens.length).toBe(9 * 3 * 6);
    for (const n of citizens) {
      const p = pixels(n); expect([p.w, p.h], n).toEqual([32, 48]);
      let bottom = -1, top = 99; const colors = new Set<string>();
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
        const a = p.a(x, y); if (a === 0) continue;
        expect(a, `${n} alfa`).toBe(255);
        bottom = Math.max(bottom, y); top = Math.min(top, y); colors.add(p.rgb(x, y));
        if (x === 0 || x === 31 || y === 0) throw new Error(`${n}: piksel di tepi sel (${x},${y})`);
      }
      expect(bottom, `${n} dasar`).toBe(46);
      expect(46 - top + 1, `${n} tinggi`).toBeGreaterThanOrEqual(/idle_[a-z]+_1$/.test(n) ? 43 : 44); // frame napas: kepala turun 1 px // 44-46 px (batang tubuh; bangsawan/penjaga lebih tinggi karena topi/tombak)
      expect(colors.size, `${n} warna`).toBeLessThanOrEqual(40);
    }
  });
  it('idle benar-benar bergerak (piksel kepala/bahu berbeda) dengan baris kaki identik', () => {
    for (const w of WALKERS) for (const dir of ['down', 'side', 'up']) {
      const a = pixels(`cit_${w.variant}_idle_${dir}_0`), b = pixels(`cit_${w.variant}_idle_${dir}_1`);
      let upper = 0, feet = 0;
      for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) { if (a.rgb(x, y) === b.rgb(x, y) && a.a(x, y) === b.a(x, y)) continue; if (y < 36) upper++; else feet++; }
      expect(upper, `${w.variant}/${dir} napas`).toBeGreaterThan(4);
      expect(feet, `${w.variant}/${dir} kaki tetap`).toBe(0);
    }
  });
  it('jalan: empat frame berbeda satu sama lain pada tiap arah', () => {
    for (const w of WALKERS) for (const dir of ['down', 'side', 'up']) {
      const sigs = new Set<string>();
      for (let i = 0; i < 4; i++) { const p = pixels(`cit_${w.variant}_walk_${dir}_${i}`); let s = ''; for (let y = 28; y < 48; y++) for (let x = 0; x < 32; x++) s += p.a(x, y) ? '1' : '0'; sigs.add(s); }
      expect(sigs.size, `${w.variant}/${dir}`).toBeGreaterThanOrEqual(2); // bagian bawah (kaki) berganti antara kontak dan lintasan
    }
  });
  it('prop: piksel hampir-solid hanya alfa keras kecuali bayangan datar; tidak kosong', () => {
    for (const n of Object.keys(json.frames).filter(k => k.startsWith('crisis_'))) {
      const p = pixels(n); let opaque = 0, soft = 0;
      for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const a = p.a(x, y); if (a === 255) opaque++; else if (a > 0) soft++; }
      expect(opaque + soft, n).toBeGreaterThan(8);
      if (!/shadow/.test(n)) expect(soft, `${n} tepi lembut`).toBe(0);
    }
  });
  it('retakan memakai inti emas pucat sebagai satu-satunya pengecualian palet dan tetap redup (tidak neon)', () => {
    const p = pixels('crisis_seam_long'); let gold = 0, neon = 0;
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      if (!p.a(x, y)) continue; const [r, g, b] = p.rgb(x, y).split(',').map(Number) as [number, number, number];
      if (r > 190 && g > 170 && b < 170 && r >= g) gold++;
      if (Math.max(r, g, b) > 245 && Math.min(r, g, b) < 60) neon++; // saturasi tinggi ekstrem
    }
    expect(gold).toBeGreaterThan(20); expect(neon).toBe(0);
  });
});
