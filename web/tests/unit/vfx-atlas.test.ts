import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderAtlas } from '../../scripts/vfx/atlases.mjs';
import { VFX_ATLASES, VFX_PALETTES, VFX_PHASE8_KEYS } from '../../src/game/vfx/vfxAssets';
import { VFX_IDS, VFX_SPECS, VFX_MAX_LIVE, peakSprites, specEndMs, specFrames } from '../../src/game/vfx/vfxSpecs';
import { readPng } from './helpers/png';

const PUBLIC = resolve(__dirname, '../../public');
const SHEETS3 = resolve(__dirname, '../../../docs/production/sprint3/vfx-contact-sheets');
const SHEETS4 = resolve(__dirname, '../../../docs/production/sprint4/vfx-contact-sheets');
const sheetsFor = (key: string): string => (VFX_PHASE8_KEYS.includes(key) ? SHEETS4 : SHEETS3);

interface FrameJson { frame: { x: number; y: number; w: number; h: number }; pivot: { x: number; y: number }; sourceSize: { w: number; h: number }; spriteSourceSize: { x: number; y: number; w: number; h: number }; trimmed: boolean }
interface Json { frames: Record<string, FrameJson>; meta: { size: { w: number; h: number } } }
const hex = (r: number, g: number, b: number): string => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const lum = (r: number, g: number, b: number): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const sha = (b: Uint8Array | Buffer): string => createHash('sha256').update(b).digest('hex');

describe('atlas VFX pixel-art', () => {
  it('ada sepuluh atlas (lima Phase 7 + lima Phase 8) dan semuanya terdaftar', () => {
    expect(VFX_ATLASES.map((a) => a.key).sort()).toEqual(['vfx_aegis', 'vfx_chrono', 'vfx_combat', 'vfx_enemy', 'vfx_heart', 'vfx_meteor', 'vfx_nature', 'vfx_rift', 'vfx_varlgrim', 'vfx_velthia']);
    expect([...VFX_PHASE8_KEYS].sort()).toEqual(['vfx_aegis', 'vfx_heart', 'vfx_meteor', 'vfx_rift', 'vfx_varlgrim']);
  });

  for (const atlas of VFX_ATLASES) {
    describe(atlas.key, () => {
      const pngPath = resolve(PUBLIC, atlas.image), jsonPath = resolve(PUBLIC, atlas.json);
      it('PNG dan JSON ada, PNG bisa didekode, ukuran cocok dengan meta, contact sheet tersedia', () => {
        expect(existsSync(pngPath)).toBe(true);
        expect(existsSync(jsonPath)).toBe(true);
        expect(existsSync(resolve(sheetsFor(atlas.key), `${atlas.key}.png`))).toBe(true);
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

      it('latar transparan, alfa keras (0/255), tanpa frame kosong/opak penuh (terhadap ukuran sumber)', { timeout: 60000 }, () => {
        let badAlpha = 0;
        for (let i = 3; i < png.data.length; i += 4) { const a = png.data[i]!; if (a !== 0 && a !== 255) badAlpha++; }
        expect(badAlpha).toBe(0);
        for (const [name, f] of entries) {
          let opaque = 0;
          const total = f.sourceSize.w * f.sourceSize.h;
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

      it('batas ukuran: frame sumber <= 512 px, atlas <= 4096 px, memori GPU wajar (<= 8 MB)', () => {
        for (const [name, f] of entries) expect(Math.max(f.sourceSize.w, f.sourceSize.h), name).toBeLessThanOrEqual(512);
        expect(Math.max(png.width, png.height)).toBeLessThanOrEqual(4096);
        expect(png.width * png.height * 4).toBeLessThanOrEqual(8 * 1024 * 1024);
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

describe('atlas Phase 8: generator deterministik dan sinkron dengan berkas', () => {
  for (const key of VFX_PHASE8_KEYS) {
    it(`${key}: dua kali build menghasilkan hash PNG/JSON yang sama dan sama dengan berkas di public/`, { timeout: 60000 }, async () => {
      const a = await renderAtlas(key), b = await renderAtlas(key);
      const pa = a.atlas.png(), pb = b.atlas.png();
      expect(sha(pa)).toBe(sha(pb));
      expect(JSON.stringify(a.atlas.json)).toBe(JSON.stringify(b.atlas.json));
      expect(sha(pa), `${key}.png di public/ tidak sama dengan keluaran generator (jalankan node scripts/vfx/build.mjs)`).toBe(sha(readFileSync(resolve(PUBLIC, 'assets/vfx', `${key}.png`))));
      expect(JSON.stringify(a.atlas.json, null, 1)).toBe(readFileSync(resolve(PUBLIC, 'assets/vfx', `${key}.json`), 'utf8'));
      expect(a.palette.size).toBeLessThanOrEqual(16);
    });

    it(`${key}: varian tenang (_c) tidak lebih terang dari aslinya dan tanpa piksel putih/kilat (luminans > 210)`, () => {
      const json = JSON.parse(readFileSync(resolve(PUBLIC, 'assets/vfx', `${key}.json`), 'utf8')) as Json;
      const png = readPng(resolve(PUBLIC, 'assets/vfx', `${key}.png`));
      const stats = (name: string): { sum: number; max: number; hot: number } => {
        const f = json.frames[name]!;
        let sum = 0, max = 0, hot = 0;
        for (let y = 0; y < f.frame.h; y++) for (let x = 0; x < f.frame.w; x++) {
          const o = ((f.frame.y + y) * png.width + f.frame.x + x) * 4;
          if (png.data[o + 3] !== 255) continue;
          const l = lum(png.data[o]!, png.data[o + 1]!, png.data[o + 2]!);
          sum += l; max = Math.max(max, l); if (l > 200) hot++;
        }
        return { sum, max, hot };
      };
      let pairs = 0;
      for (const name of Object.keys(json.frames)) {
        if (!/_\d+_c$/.test(name)) continue; // varian tenang; (rshard_c dst. = partikel biasa)
        const base = name.slice(0, -2);
        expect(json.frames[base], `${name} tanpa frame dasar`).toBeDefined();
        const c = stats(name), n = stats(base);
        expect(c.sum, `${name} total cahaya > ${base}`).toBeLessThanOrEqual(n.sum);
        expect(c.max, `${name} lebih terang`).toBeLessThanOrEqual(n.max);
        expect(c.hot, `${name} piksel sangat terang`).toBeLessThanOrEqual(n.hot);
        expect(c.max, `${name} masih memuat putih/kilat`).toBeLessThanOrEqual(210);
        pairs++;
      }
      // atlas tanpa efek flashy (rift: hanya surge) tetap punya pasangan; semua atlas Phase 8 memuat setidaknya satu varian tenang
      expect(pairs).toBeGreaterThan(0);
    });
  }
});

describe('tabel spesifikasi VFX', () => {
  const PHASE7 = ['greatsword_trail', 'impact_hit', 'impact_heavy', 'ground_slam_crack', 'debris_burst', 'dust_puff', 'torvan_leaf_bolt', 'torvan_vine', 'torvan_support', 'forest_summon_small',
    'velthia_pulse', 'velthia_mend', 'velthia_ward', 'velthia_bloom', 'velthia_concord', 'hollowling_claw', 'mournfang_slash', 'veyrath_strike', 'chronolith_charge', 'chronolith_slam',
    'chronolith_temporal', 'shield_hit_spark', 'status_poison', 'heal_sparkle'];
  /** id Phase 8 dari docs/production/sprint4/CONTRACT.md */
  const PHASE8 = ['temporal_bind', 'time_distortion', 'staff_impact', 'fracture_mark', 'fracture_strike', 'seal_pulse', 'phase_shift', 'keeper_stance', 'riftborn_lash', 'riftborn_surge', 'gravorn_slam',
    'meteor_sky_hold', 'meteor_descent', 'meteor_impact', 'meteor_aftermath', 'aegis_charge', 'aegis_form', 'aegis_hold', 'aegis_stress', 'aegis_fade', 'heart_lock_glow', 'heart_unseal', 'tower_dust'];
  const PERSISTENT = ['fracture_mark', 'meteor_sky_hold', 'aegis_hold', 'heart_lock_glow'];

  it('memuat semua id kontrak Phase 7 (24) dan Phase 8 (23)', () => {
    expect(PHASE7.length).toBe(24);
    expect(PHASE8.length).toBe(23);
    for (const id of [...PHASE7, ...PHASE8]) expect(VFX_SPECS[id], id).toBeDefined();
    expect(Object.keys(VFX_SPECS).length).toBe(PHASE7.length + PHASE8.length);
  });

  for (const id of [...PHASE7, ...PHASE8]) {
    it(`${id}: data konsisten (id, atlas, durasi, partikel, varian tenang)`, () => {
      const s = VFX_SPECS[id]!;
      expect(s.id).toBe(id);
      expect(VFX_ATLASES.some((a) => a.key === s.atlas)).toBe(true);
      expect(s.maxParticles).toBeGreaterThan(0);
      expect(s.maxParticles).toBeLessThanOrEqual(VFX_MAX_LIVE);
      expect(peakSprites(s)).toBeLessThanOrEqual(s.maxParticles);
      expect(specEndMs(s)).toBeLessThanOrEqual(s.durationMs);
      expect(s.durationMs).toBeLessThanOrEqual(PHASE7.includes(id) ? 1500 : 6000);
      expect(s.depth ?? 10).toBeLessThan(20);
      if (s.flashy) {
        expect(s.calm, `${id} flashy tanpa varian tenang`).toBeDefined();
        expect(Object.keys(s.calm!.frameMap).length > 0 || s.calm!.particleScale < 1).toBe(true);
        expect(s.calm!.particleScale).toBeLessThanOrEqual(1);
      }
    });
  }

  it('efek persisten: tepat empat, punya layer loop + frame exit; efek lain tanpa loop', () => {
    const got = Object.values(VFX_SPECS).filter((s) => s.persistent).map((s) => s.id).sort();
    expect(got).toEqual([...PERSISTENT].sort());
    for (const s of Object.values(VFX_SPECS)) {
      const loops = s.layers.some((l) => l.kind === 'anim' && l.loop);
      expect(loops, s.id).toBe(!!s.persistent);
      if (s.persistent) { expect(s.persistent.exit.frames.length).toBeGreaterThan(0); expect(s.maxParticles).toBeLessThanOrEqual(2); }
    }
  });

  it('efek flashy Phase 8 punya varian tenang; meteor_impact dan aegis_form wajib flashy', () => {
    for (const id of ['meteor_impact', 'aegis_form', 'heart_unseal', 'staff_impact', 'fracture_strike', 'seal_pulse', 'phase_shift', 'riftborn_surge', 'time_distortion', 'aegis_charge']) {
      expect(VFX_SPECS[id]!.flashy, id).toBe(true);
      expect(Object.keys(VFX_SPECS[id]!.calm!.frameMap).length, id).toBeGreaterThan(0);
    }
  });

  it('meteor_descent: layer descent dengan frame membesar; meteor_impact memakai guncangan besar; aegis_stress punya tiga tingkat', () => {
    const d = VFX_SPECS.meteor_descent!.layers[0]!;
    expect(d.kind).toBe('descent');
    const stress = VFX_SPECS.aegis_stress!.layers[0]!;
    expect(stress.kind === 'anim' && stress.byLevel?.length).toBe(3);
    expect(VFX_SPECS.meteor_impact!.shake!.intensity).toBeGreaterThan(VFX_SPECS.chronolith_slam!.shake!.intensity);
  });

  it('varian tenang memetakan ke frame yang lebih redup (bukan frame putih penuh): nama berakhiran _c', () => {
    for (const s of Object.values(VFX_SPECS)) if (s.calm) for (const [a, b] of Object.entries(s.calm.frameMap)) expect(b).toBe(`${a}_c`);
  });
});
