import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VFX_ATLASES, VFX_PALETTES } from '../../src/game/vfx/vfxAssets';
import { VFX_IDS, VFX_SPECS, VFX_MAX_LIVE, peakSprites, specEndMs, specFrames } from '../../src/game/vfx/vfxSpecs';
import { readPng } from './helpers/png';

const PUBLIC = resolve(__dirname, '../../public');
const SHEETS = resolve(__dirname, '../../../docs/production/sprint3/vfx-contact-sheets');

interface Json { frames: Record<string, { frame: { x: number; y: number; w: number; h: number }; pivot: { x: number; y: number } }>; meta: { size: { w: number; h: number } } }
const hex = (r: number, g: number, b: number): string => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

describe('atlas VFX pixel-art', () => {
  it('ada lima atlas dan semuanya terdaftar', () => {
    expect(VFX_ATLASES.map((a) => a.key).sort()).toEqual(['vfx_chrono', 'vfx_combat', 'vfx_enemy', 'vfx_nature', 'vfx_velthia']);
  });

  for (const atlas of VFX_ATLASES) {
    describe(atlas.key, () => {
      const pngPath = resolve(PUBLIC, atlas.image), jsonPath = resolve(PUBLIC, atlas.json);
      it('PNG dan JSON ada, PNG bisa didekode, ukuran cocok dengan meta, contact sheet tersedia', () => {
        expect(existsSync(pngPath)).toBe(true);
        expect(existsSync(jsonPath)).toBe(true);
        expect(existsSync(resolve(SHEETS, `${atlas.key}.png`))).toBe(true);
        const png = readPng(pngPath), json = JSON.parse(readFileSync(jsonPath, 'utf8')) as Json;
        expect(png.width).toBe(json.meta.size.w);
        expect(png.height).toBe(json.meta.size.h);
      });

      const png = readPng(pngPath), json = JSON.parse(readFileSync(jsonPath, 'utf8')) as Json;
      const entries = Object.entries(json.frames);
      const px = (x: number, y: number): number => png.data[(y * png.width + x) * 4 + 3]!;

      it('semua frame berada di dalam batas atlas, tidak saling tumpang, pivot x = 0,5 dan y 0..1', () => {
        for (const [name, f] of entries) {
          const r = f.frame;
          expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= png.width && r.y + r.h <= png.height, name).toBe(true);
          expect(f.pivot.x, name).toBe(0.5);
          expect(f.pivot.y >= 0 && f.pivot.y <= 1, name).toBe(true);
        }
        for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
          const a = entries[i]![1].frame, b = entries[j]![1].frame;
          expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h, `${entries[i]![0]} x ${entries[j]![0]}`).toBe(false);
        }
      });

      it('latar transparan, alfa keras (0/255), tanpa frame kosong/opak penuh', () => {
        for (let i = 3; i < png.data.length; i += 4) { const a = png.data[i]!; expect(a === 0 || a === 255).toBe(true); }
        for (const [name, f] of entries) {
          let opaque = 0;
          const total = f.frame.w * f.frame.h;
          for (let y = 0; y < f.frame.h; y++) for (let x = 0; x < f.frame.w; x++) if (px(f.frame.x + x, f.frame.y + y) === 255) opaque++;
          expect(opaque, `${name} kosong`).toBeGreaterThan(0);
          expect(opaque, `${name} opak penuh`).toBeLessThan(total);
        }
      });

      it('tidak ada piksel liar di luar rect frame', () => {
        const inside = new Uint8Array(png.width * png.height);
        for (const [, f] of entries) for (let y = f.frame.y; y < f.frame.y + f.frame.h; y++) for (let x = f.frame.x; x < f.frame.x + f.frame.w; x++) inside[y * png.width + x] = 1;
        let stray = 0;
        for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) if (px(x, y) !== 0 && !inside[y * png.width + x]) stray++;
        expect(stray).toBe(0);
      });

      it('palet tertutup <= 16 warna dan semua warna ada di VFX_PALETTES', () => {
        const colors = new Set<string>();
        for (let i = 0; i < png.data.length; i += 4) if (png.data[i + 3] === 255) colors.add(hex(png.data[i]!, png.data[i + 1]!, png.data[i + 2]!));
        expect(colors.size).toBeLessThanOrEqual(16);
        const allowed = new Set(VFX_PALETTES[atlas.key]!.map((c) => c.toUpperCase()));
        expect(allowed.size).toBeLessThanOrEqual(16);
        for (const c of colors) expect(allowed.has(c), `${c} di luar palet`).toBe(true);
      });
    });
  }

  it('setiap frame yang dirujuk spec ada pada atlas spec tersebut', () => {
    const frames: Record<string, Set<string>> = {};
    for (const a of VFX_ATLASES) frames[a.key] = new Set(Object.keys((JSON.parse(readFileSync(resolve(PUBLIC, a.json), 'utf8')) as Json).frames));
    for (const id of VFX_IDS) {
      const spec = VFX_SPECS[id]!;
      for (const f of specFrames(spec)) expect(frames[spec.atlas]!.has(f), `${id}: frame ${f} tidak ada di ${spec.atlas}`).toBe(true);
    }
  });
});

describe('tabel spesifikasi VFX', () => {
  const REQUIRED = ['greatsword_trail', 'impact_hit', 'impact_heavy', 'ground_slam_crack', 'debris_burst', 'dust_puff', 'torvan_leaf_bolt', 'torvan_vine', 'torvan_support', 'forest_summon_small',
    'velthia_pulse', 'velthia_mend', 'velthia_ward', 'velthia_bloom', 'velthia_concord', 'hollowling_claw', 'mournfang_slash', 'veyrath_strike', 'chronolith_charge', 'chronolith_slam',
    'chronolith_temporal', 'shield_hit_spark', 'status_poison', 'heal_sparkle'];

  it('memuat semua id kontrak', () => { for (const id of REQUIRED) expect(VFX_SPECS[id], id).toBeDefined(); });

  for (const id of REQUIRED) {
    it(`${id}: data konsisten (id, atlas, durasi, partikel, varian tenang)`, () => {
      const s = VFX_SPECS[id]!;
      expect(s.id).toBe(id);
      expect(VFX_ATLASES.some((a) => a.key === s.atlas)).toBe(true);
      expect(s.maxParticles).toBeGreaterThan(0);
      expect(s.maxParticles).toBeLessThanOrEqual(VFX_MAX_LIVE);
      expect(peakSprites(s)).toBeLessThanOrEqual(s.maxParticles);
      expect(specEndMs(s)).toBeLessThanOrEqual(s.durationMs);
      expect(s.durationMs).toBeLessThanOrEqual(1500);
      expect(s.depth ?? 10).toBeLessThan(20);
      if (s.flashy) {
        expect(s.calm, `${id} flashy tanpa varian tenang`).toBeDefined();
        expect(Object.keys(s.calm!.frameMap).length > 0 || s.calm!.particleScale < 1).toBe(true);
        expect(s.calm!.particleScale).toBeLessThanOrEqual(1);
      }
    });
  }

  it('varian tenang memetakan ke frame yang lebih redup (bukan frame putih penuh): nama berakhiran _c', () => {
    for (const s of Object.values(VFX_SPECS)) if (s.calm) for (const [a, b] of Object.entries(s.calm.frameMap)) expect(b).toBe(`${a}_c`);
  });
});
