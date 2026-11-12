import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SFX_REGISTRY } from '../../src/game/data/sfxRegistry';
import { BATTLE_SFX } from '../../src/game/data/battleSfxRegistry';
import { CATALOG, CATEGORY_LIMITS } from '../../scripts/sfx/catalog.mjs';
import { OUT_DIR, renderAll } from '../../scripts/sfx/generate.mjs';

/** Id wajib dari docs/production/sprint3/CONTRACT.md. */
const REQUIRED = [
  'SFX_UI_MOVE', 'SFX_UI_CONFIRM', 'SFX_UI_CANCEL', 'SFX_UI_SELECT_ITEM', 'SFX_UI_ITEM_USE', 'SFX_UI_SAVE_OK', 'SFX_UI_SAVE_FAIL',
  'SFX_UI_DIALOGUE_ADVANCE', 'SFX_UI_DIALOGUE_CHOICE', 'SFX_UI_SHOP_BUY', 'SFX_UI_SHOP_SELL',
  'SFX_STEP_GRASS', 'SFX_STEP_DIRT', 'SFX_STEP_STONE',
  'SFX_INTERACT', 'SFX_CHEST_OPEN', 'SFX_ITEM_PICKUP', 'SFX_DOOR_OPEN', 'SFX_PUZZLE_ACTIVATE', 'SFX_PUZZLE_SOLVED',
  'SFX_BATTLE_TRANSITION_NORMAL', 'SFX_BATTLE_TRANSITION_BOSS', 'SFX_BATTLE_TRANSITION_TEMPORAL', 'SFX_BATTLE_TRANSITION_SCRIPTED',
  'SFX_BATTLE_CONFIRM', 'SFX_GREATSWORD_SWING', 'SFX_GREATSWORD_IMPACT', 'SFX_GROUND_SLAM', 'SFX_ENEMY_ATTACK', 'SFX_DAMAGE',
  'SFX_ENEMY_DAMAGE', 'SFX_DEFEND', 'SFX_HEAL', 'SFX_SHIELD', 'SFX_STATUS_POISON', 'SFX_VICTORY', 'SFX_DEFEAT',
  'SFX_MAGIC_TORVAN', 'SFX_MAGIC_VELTHIA_CAST', 'SFX_MAGIC_VELTHIA_SHIELD', 'SFX_MAGIC_VELTHIA_HEAL',
  'SFX_CHRONOLITH_CHARGE', 'SFX_CHRONOLITH_STRIKE', 'SFX_CHRONOLITH_TEMPORAL',
];

interface Decoded { sampleRate: number; channels: number; bits: number; samples: Float32Array }
function decodeWav(b: Buffer): Decoded {
  expect(b.toString('ascii', 0, 4)).toBe('RIFF');
  expect(b.toString('ascii', 8, 12)).toBe('WAVE');
  expect(b.readUInt32LE(4)).toBe(b.length - 8);
  let off = 12; let fmt: { format: number; channels: number; rate: number; bits: number } | null = null; let data: Buffer | null = null;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4); const size = b.readUInt32LE(off + 4); const body = b.subarray(off + 8, off + 8 + size);
    if (id === 'fmt ') fmt = { format: body.readUInt16LE(0), channels: body.readUInt16LE(2), rate: body.readUInt32LE(4), bits: body.readUInt16LE(14) };
    if (id === 'data') data = body;
    off += 8 + size + (size % 2);
  }
  expect(fmt).not.toBeNull(); expect(data).not.toBeNull();
  expect(fmt!.format).toBe(1);
  const n = data!.length / 2;
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) samples[i] = data!.readInt16LE(i * 2) / 32768;
  return { sampleRate: fmt!.rate, channels: fmt!.channels, bits: fmt!.bits, samples };
}
const db = (x: number): number => 20 * Math.log10(Math.max(x, 1e-12));
function measure(s: Float32Array): { peakDb: number; rmsDb: number; ms: number; maxClipRun: number } {
  let peak = 0; let sq = 0; let run = 0; let maxRun = 0;
  for (const x of s) {
    const a = Math.abs(x); if (a > peak) peak = a; sq += x * x;
    if (a >= 0.999) { run++; maxRun = Math.max(maxRun, run); } else run = 0;
  }
  return { peakDb: db(peak), rmsDb: db(Math.sqrt(sq / s.length)), ms: (s.length / 44100) * 1000, maxClipRun: maxRun };
}

describe('SFX_REGISTRY', () => {
  it('memuat semua id kontrak, unik, semua READY, tanpa BGM', () => {
    const ids = SFX_REGISTRY.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of REQUIRED) expect(ids, id).toContain(id);
    expect(ids.length).toBe(REQUIRED.length);
    for (const c of SFX_REGISTRY) {
      expect(c.status, c.id).toBe('READY');
      expect(c.id).toMatch(/^SFX_[A-Z0-9_]+$/);
      expect(c.id.startsWith('BGM')).toBe(false);
      expect(c.minIntervalMs).toBeGreaterThan(0);
      expect(c.gain).toBeGreaterThan(0);
      expect(c.gain).toBeLessThanOrEqual(1);
    }
  });

  it('langkah punya >= 3 variasi; id lain satu berkas kecuali bila disengaja', () => {
    for (const id of ['SFX_STEP_GRASS', 'SFX_STEP_DIRT', 'SFX_STEP_STONE']) expect(SFX_REGISTRY.find(c => c.id === id)!.files.length, id).toBeGreaterThanOrEqual(3);
  });

  it('katalog generator = registry (id, interval, gain, berkas)', () => {
    expect(CATALOG.map(c => c.id)).toEqual(SFX_REGISTRY.map(c => c.id));
    for (const e of CATALOG) {
      const c = SFX_REGISTRY.find(r => r.id === e.id)!;
      expect(c.files.length).toBe(e.variants);
      expect(c.minIntervalMs).toBe(e.minIntervalMs);
      expect(c.gain).toBe(e.gain);
      expect(c.category).toBe(e.category);
    }
  });

  it('id battle lama diselesaikan dari registry baru (kunci sama dengan SFX_REGISTRY, satu berkas)', () => {
    expect(BATTLE_SFX.map(c => c.id)).toEqual(['SFX_GREATSWORD_SWING', 'SFX_GREATSWORD_IMPACT', 'SFX_GROUND_SLAM', 'SFX_ENEMY_ATTACK', 'SFX_DAMAGE', 'SFX_VICTORY', 'SFX_DEFEAT']);
    for (const b of BATTLE_SFX) {
      const c = SFX_REGISTRY.find(r => r.id === b.id)!;
      expect(c.files.length).toBe(1);
      expect(b.status).toBe('READY');
      expect(b.file).toBe(`sfx/${c.files[0]}`);
    }
  });
});

describe('berkas WAV SFX', () => {
  it('tidak ada berkas BGM atau berkas di luar registry di folder sfx', () => {
    const listed = new Set(SFX_REGISTRY.flatMap(c => c.files));
    const onDisk = readdirSync(OUT_DIR);
    for (const f of onDisk) {
      expect(f.toUpperCase().startsWith('BGM'), f).toBe(false);
      expect(f.endsWith('.wav'), f).toBe(true);
      expect(listed.has(f), `${f} tidak ada di registry`).toBe(true);
    }
    expect(onDisk.length).toBe(listed.size);
  });

  const categoryEff = new Map<string, number[]>();
  for (const cue of SFX_REGISTRY) {
    const lim = CATEGORY_LIMITS[cue.category ?? '']!;
    for (const file of cue.files) {
      it(`${file}: WAV valid, durasi, tanpa clipping, tidak senyap, RMS dalam jendela`, () => {
        const path = resolve(OUT_DIR, file);
        expect(existsSync(path)).toBe(true);
        const wav = decodeWav(readFileSync(path));
        expect([wav.sampleRate, wav.channels, wav.bits]).toEqual([44100, 1, 16]);
        const m = measure(wav.samples);
        expect(lim, cue.id).toBeDefined();
        expect(m.ms).toBeGreaterThanOrEqual(lim.minMs);
        expect(m.ms).toBeLessThanOrEqual(lim.maxMs);
        if (cue.id.startsWith('SFX_VICTORY') || cue.id.startsWith('SFX_DEFEAT')) expect(m.ms).toBeLessThanOrEqual(2500);
        expect(m.peakDb).toBeLessThan(0);
        expect(m.peakDb).toBeGreaterThan(-3.4); // dinormalisasi ~ -3 dBFS
        expect(m.peakDb).toBeLessThan(-2.6);
        expect(m.maxClipRun).toBe(0);
        expect(m.rmsDb).toBeGreaterThan(-50); // tidak senyap
        expect(m.rmsDb).toBeGreaterThanOrEqual(lim.rmsMin);
        expect(m.rmsDb).toBeLessThanOrEqual(lim.rmsMax);
        expect(Math.abs(wav.samples[0]!)).toBeLessThan(0.01); // fade-in: tanpa klik
        expect(Math.abs(wav.samples[wav.samples.length - 1]!)).toBeLessThan(0.005); // fade-out
        expect(Math.abs(m.ms - (cue.durationMs ?? m.ms)) <= 12 || cue.files.length > 1).toBe(true);
        (categoryEff.get(cue.category ?? '') ?? categoryEff.set(cue.category ?? '', []).get(cue.category ?? '')!).push(m.rmsDb + db(cue.gain));
      });
    }
  }

  it('loudness efektif: UI lebih pelan dari hantaman battle', () => {
    const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
    const eff = (id: string): number => {
      const c = SFX_REGISTRY.find(r => r.id === id)!;
      const rms = c.files.map(f => measure(decodeWav(readFileSync(resolve(OUT_DIR, f))).samples).rmsDb);
      return mean(rms) + db(c.gain);
    };
    const ui = mean(SFX_REGISTRY.filter(c => c.category === 'ui').map(c => eff(c.id)));
    const impacts = mean(['SFX_GREATSWORD_IMPACT', 'SFX_GROUND_SLAM', 'SFX_CHRONOLITH_STRIKE'].map(eff));
    expect(ui).toBeLessThan(impacts - 3);
    expect(eff('SFX_UI_DIALOGUE_ADVANCE')).toBeLessThan(eff('SFX_GREATSWORD_IMPACT'));
  });

  it('variasi langkah berbeda satu sama lain (bukan salinan)', () => {
    for (const id of ['SFX_STEP_GRASS', 'SFX_STEP_DIRT', 'SFX_STEP_STONE']) {
      const files = SFX_REGISTRY.find(c => c.id === id)!.files;
      const hashes = files.map(f => createHash('sha256').update(readFileSync(resolve(OUT_DIR, f))).digest('hex'));
      expect(new Set(hashes).size, id).toBe(files.length);
    }
  });
});

describe('generator deterministik', () => {
  it('dua render berturut-turut identik dan sama dengan manifest + berkas di disk', () => {
    const a = renderAll(); const b = renderAll();
    const manifest = JSON.parse(readFileSync(resolve(OUT_DIR, '..', '..', '..', '..', 'scripts', 'sfx', 'manifest.json'), 'utf8')) as Array<{ id: string; files: Array<{ file: string; sha256: string }> }>;
    expect(a.length).toBe(manifest.length);
    a.forEach((cue, i) => {
      cue.files.forEach((f, j) => {
        expect(f.sha256, f.file).toBe(b[i]!.files[j]!.sha256);
        expect(manifest[i]!.files[j]!.file).toBe(f.file);
        const disk = createHash('sha256').update(readFileSync(resolve(OUT_DIR, f.file))).digest('hex');
        expect(disk, `${f.file} di disk = manifest`).toBe(manifest[i]!.files[j]!.sha256);
      });
    });
  }, 60_000);

  it('sumber generator tidak memakai Math.random atau berkas pihak ketiga', () => {
    for (const f of ['dsp.mjs', 'catalog.mjs', 'generate.mjs']) {
      const src = readFileSync(resolve(__dirname, '../../scripts/sfx', f), 'utf8');
      expect(src.includes('Math.random'), f).toBe(false);
      expect(/readFileSync\([^)]*\.(wav|ogg|mp3)/i.test(src), f).toBe(false);
    }
  });
});
