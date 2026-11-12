import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FORTRESS_DECALS, FORTRESS_H, FORTRESS_ROOMS, FORTRESS_W } from '../../src/game/data/maps/fortress.map.mjs';
import { readPng, type RawPng } from './helpers/png';

const FORT_DIR = resolve(__dirname, '../../public/assets/environment/fortress');
const TEMPLE_DIR = resolve(__dirname, '../../public/assets/environment/temple');
const SHEETS = resolve(__dirname, '../../../docs/production/sprint4/fortress-contact-sheets');

interface Frame { frame: { x: number; y: number; w: number; h: number }; pivot: { x: number; y: number }; foot: [number, number] }
const json = JSON.parse(readFileSync(resolve(FORT_DIR, 'props.json'), 'utf8')) as { frames: Record<string, Frame>; meta: { status: string } };
const atlas = readPng(resolve(FORT_DIR, 'props.png'));
const ground = readPng(resolve(FORT_DIR, 'ground.png'));
const A = (p: RawPng, x: number, y: number): number => p.data[(y * p.width + x) * 4 + 3]!;
const rgb = (p: RawPng, x: number, y: number): number => (p.data[(y * p.width + x) * 4]! << 16) | (p.data[(y * p.width + x) * 4 + 1]! << 8) | p.data[(y * p.width + x) * 4 + 2]!;
function colors(p: RawPng): Set<number> {
  const s = new Set<number>();
  for (let i = 0; i < p.data.length; i += 4) if (p.data[i + 3]! > 0) s.add((p.data[i]! << 16) | (p.data[i + 1]! << 8) | p.data[i + 2]!);
  return s;
}
const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
const luma = (c: number): number => ((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;

/** Palet tertutup Warden Fortress (24 warna). */
const PALETTE = ['#12101a', '#221e2e', '#373749', '#4f5266', '#6d7189', '#9296ac', '#2d2530', '#463a40', '#64554f', '#8a7867', '#3c2a44', '#5e4468', '#3f1d20', '#78322a', '#b0602f', '#d9a85a',
  '#e8602a', '#f6c35a', '#fcefb8', '#3b4a1c', '#8fae3a', '#cfe86a', '#3a6470', '#a9bcc0'];

describe('Aset seni Warden Fortress (DRAFT code-native)', () => {
  it('palet tertutup <= 24 warna di dasar dan atlas, hanya warna palet, alfa keras 0/255', () => {
    expect(PALETTE).toHaveLength(24);
    for (const [name, p] of [['ground', ground], ['atlas', atlas]] as const) {
      const cs = colors(p);
      expect(cs.size, `${name} warna`).toBeLessThanOrEqual(24);
      for (const c of cs) expect(PALETTE, `${name} ${hex(c)}`).toContain(hex(c));
      let soft = 0;
      for (let i = 3; i < p.data.length; i += 4) { const a = p.data[i]!; if (a > 0 && a < 255) soft++; }
      expect(soft, `${name} alfa antara`).toBe(0);
    }
    expect(json.meta.status).toBe('DRAFT');
  });

  it('palet berbeda dari Kuil Jejak (tidak ada warna yang sama) dan dasar tidak menyalin tileset kuil', () => {
    const temple = new Set([...colors(readPng(resolve(TEMPLE_DIR, 'ground.png'))), ...colors(readPng(resolve(TEMPLE_DIR, 'props.png')))].map(hex));
    const shared = [...colors(ground), ...colors(atlas)].map(hex).filter((c) => temple.has(c));
    expect(shared, 'warna bersama dengan kuil').toEqual([]);
  });

  it('dasar peta: ukuran sesuai peta, tidak ada piksel transparan, lantai lebih terang daripada hampa, dinding berkedalaman 64 px di atas tepi utara tiap ruang', () => {
    expect([ground.width, ground.height]).toEqual([FORTRESS_W, FORTRESS_H]);
    let transparent = 0;
    for (let i = 3; i < ground.data.length; i += 4) if (ground.data[i] !== 255) transparent++;
    expect(transparent).toBe(0);
    const voidC = rgb(ground, 40, 40);
    for (const [name, r] of Object.entries(FORTRESS_ROOMS)) {
      const cx = r.x + Math.floor(r.w / 2), cy = r.y + Math.floor(r.h / 2);
      expect(luma(rgb(ground, cx, cy)), `${name} lantai`).toBeGreaterThan(luma(voidC) + 10);
    }
    for (const name of ['outer', 'bellhall', 'barracks', 'archive', 'trial', 'serambi', 'heart', 'echo', 'sc_land']) {
      const r = FORTRESS_ROOMS[name as keyof typeof FORTRESS_ROOMS];
      const x = r.x + 6; // kolom dekat tepi kiri: muka dinding tidak tertutup pintu/hiasan
      let wall = 0;
      for (let d = 1; d <= 64; d++) if (rgb(ground, x, r.y - d) !== voidC) wall++;
      expect(wall, `${name} muka dinding`).toBeGreaterThanOrEqual(60);
      if (name !== 'barracks' && name !== 'serambi') expect(rgb(ground, x, r.y - 90), `${name} di atas tutup`).toBe(voidC);
    }
  });

  it('Bitter Lime hemat: hanya aksen retakan/segel (< 2% piksel dasar)', () => {
    const lime = new Set(['#3b4a1c', '#8fae3a', '#cfe86a']);
    let n = 0;
    for (let i = 0; i < ground.data.length; i += 4) if (lime.has(hex((ground.data[i]! << 16) | (ground.data[i + 1]! << 8) | ground.data[i + 2]!))) n++;
    expect(n / (ground.width * ground.height)).toBeLessThan(0.02);
  });

  it('atlas: setiap frame di dalam atlas, tidak saling tumpang tindih, tidak kosong, pivot sah, garis kaki konsisten dengan pivot', () => {
    const rects = Object.entries(json.frames);
    expect(rects.length).toBeGreaterThanOrEqual(90);
    const decals = new Set<string>(FORTRESS_DECALS);
    for (const [name, f] of rects) {
      const r = f.frame;
      expect(r.x, name).toBeGreaterThanOrEqual(0); expect(r.y, name).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w, name).toBeLessThanOrEqual(atlas.width); expect(r.y + r.h, name).toBeLessThanOrEqual(atlas.height);
      expect(f.pivot.x, name).toBeGreaterThan(0); expect(f.pivot.x, name).toBeLessThanOrEqual(1);
      expect(f.pivot.y, name).toBeGreaterThan(0); expect(f.pivot.y, name).toBeLessThanOrEqual(1);
      let opaque = 0, bottom = -1;
      for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (A(atlas, r.x + x, r.y + y) === 255) { opaque++; bottom = y; }
      expect(opaque, `${name} kosong`).toBeGreaterThan(3);
      if (!decals.has(name) && name !== 'mote') expect(Math.abs(bottom + 1 - Math.round(f.pivot.y * r.h)), `${name} garis dasar vs pivot`).toBeLessThanOrEqual(4);
    }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i]![1].frame, b = rects[j]![1].frame;
      const hit = a.x < b.x + b.w + 1 && a.x + a.w + 1 > b.x && a.y < b.y + b.h + 1 && a.y + a.h + 1 > b.y;
      expect(hit, `${rects[i]![0]} tumpang tindih ${rects[j]![0]}`).toBe(false);
    }
  });

  it('tidak ada piksel liar: setiap frame tidak punya komponen tunggal 1 piksel di luar badan utama', () => {
    const stray: string[] = [];
    for (const [name, f] of Object.entries(json.frames)) {
      if (name === 'mote') continue;
      const r = f.frame, seen = new Uint8Array(r.w * r.h);
      for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
        if (seen[y * r.w + x] || A(atlas, r.x + x, r.y + y) !== 255) continue;
        let size = 0; const st: Array<[number, number]> = [[x, y]]; seen[y * r.w + x] = 1;
        while (st.length) {
          const [cx, cy] = st.pop()!; size++;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= r.w || ny >= r.h || seen[ny * r.w + nx] || A(atlas, r.x + nx, r.y + ny) !== 255) continue;
            seen[ny * r.w + nx] = 1; st.push([nx, ny]);
          }
        }
        if (size === 1) stray.push(`${name}@${x},${y}`);
      }
    }
    // beberapa titik kecil disengaja: kilau lime pada retakan/segel (aksen), bukan noise
    const allowed = /^(crack_|heart_emblem_open|heart_seal_open|heart_seal_sealed|window_arch_|echo_|bell_frame|relic_glow|heart_pylon_on|trial_pedestal_on|door_heart_open|echo_seal_closed|echo_seal_open|slab_)/;
    expect(stray.filter((s) => !allowed.test(s))).toEqual([]);
    expect(stray.length).toBeLessThan(40);
  });

  it('keadaan yang berubah punya frame berbeda: pintu, segel, slab, jangkar, jendela menara, lambang Heart', () => {
    const same = (a: string, b: string): boolean => {
      const fa = json.frames[a]!.frame, fb = json.frames[b]!.frame;
      if (fa.w !== fb.w || fa.h !== fb.h) return false;
      for (let y = 0; y < fa.h; y++) for (let x = 0; x < fa.w; x++) if (rgb(atlas, fa.x + x, fa.y + y) !== rgb(atlas, fb.x + x, fb.y + y) || A(atlas, fa.x + x, fa.y + y) !== A(atlas, fb.x + x, fb.y + y)) return false;
      return true;
    };
    const pairs: Array<[string, string]> = [['door_iron_closed', 'door_iron_open'], ['door_heart_closed', 'door_heart_half'], ['door_heart_half', 'door_heart_open'], ['gate_side_closed', 'gate_side_open'],
      ['echo_seal_closed', 'echo_seal_open'], ['slab_aligned', 'slab_shifted'], ['anchor_a_0', 'anchor_a_1'], ['anchor_b_0', 'anchor_b_1'], ['heart_emblem_sealed', 'heart_emblem_open'],
      ['heart_seal_sealed', 'heart_seal_open'], ['window_arch_0', 'window_arch_1'], ['window_arch_1', 'window_arch_2'], ['window_arch_2', 'window_arch_3'], ['lantern_off', 'lantern_on'],
      ['chest_closed', 'chest_open'], ['lever_off', 'lever_on'], ['torch_a', 'torch_b'], ['brazier_a', 'brazier_b'], ['relic_dim', 'relic_glow'], ['trial_pedestal_off', 'trial_pedestal_on'],
      ['heart_pylon_off', 'heart_pylon_on'], ['echo_a_off', 'echo_a_on'], ['echo_b_off', 'echo_b_on'], ['crack_a', 'crack_a_dead'], ['gravorn_a', 'gravorn_b'], ['riftborn_a', 'riftborn_b'], ['oathguard_a', 'oathguard_b']];
    for (const [a, b] of pairs) expect(same(a, b), `${a} vs ${b}`).toBe(false);
    for (const k of ['dawn', 'noon', 'dusk', 'night']) {
      expect(same(`seal_${k}_off`, `seal_${k}_on`), k).toBe(false);
      for (const o of ['dawn', 'noon', 'dusk', 'night']) if (o !== k) expect(same(`seal_${k}_off`, `seal_${o}_off`), `${k}/${o}`).toBe(false);
    }
  });

  it('lembar kontak dan pratinjau tersedia untuk review manusia (DRAFT, tidak diklaim final)', () => {
    for (const f of ['atlas_sheet.png', 'map_initial.png', 'map_open.png', 'room_bellhall.png', 'room_heart.png', 'room_rift.png', 'room_echo.png', 'collision_south.png', 'collision_north.png']) expect(existsSync(resolve(SHEETS, f)), f).toBe(true);
  });
});
