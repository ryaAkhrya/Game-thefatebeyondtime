import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GROUP_TOLERANCE_DB, LIMITS, analyzeAll, decodeWav, groupMd, measure, tableMd } from '../../scripts/sfx/analyze.mjs';
import { toWav } from '../../scripts/sfx/dsp.mjs';
import { SFX_REGISTRY } from '../../src/game/data/sfxRegistry';

/**
 * Tes untuk skrip analisis kualitas audio. Semua pemeriksaan di sini OBJEKTIF (angka); tidak ada klaim tentang
 * seberapa bagus bunyi terdengar (belum ditinjau manusia).
 */
const SR = 44100;
const sine = (hz: number, amp: number, sec: number): Int16Array => {
  const n = Math.round(sec * SR); const o = new Int16Array(n);
  for (let i = 0; i < n; i++) o[i] = Math.round(amp * Math.sin((2 * Math.PI * hz * i) / SR) * 32767);
  return o;
};

describe('analyze.mjs: pengukur', () => {
  it('sinus 1 kHz -3 dBFS: puncak, RMS, LUFS-perkiraan masuk akal', () => {
    const m = measure(sine(1000, Math.pow(10, -3 / 20), 1));
    expect(m.peakDb).toBeCloseTo(-3, 1);
    expect(m.rmsDb).toBeCloseTo(-6.02, 1);
    expect(m.lufs).toBeGreaterThan(-6.8); expect(m.lufs).toBeLessThan(-5.4); // ~ -6.0 LKFS
    expect(m.clipSamples).toBe(0);
    expect(m.flatRuns).toBe(0); // sinus membulat di puncak tapi nilai sampelnya berbeda
    expect(Math.abs(m.dcOffset)).toBeLessThan(1e-3);
  });

  it('mendeteksi kliping, DC offset, dan run datar', () => {
    const sq = new Int16Array(4410).map((_, i) => (i % 200 < 100 ? 32767 : -32768));
    const m = measure(sq);
    expect(m.clipSamples).toBeGreaterThan(4000);
    expect(m.flatRuns).toBeGreaterThan(10);
    const dc = measure(new Int16Array(4410).fill(3277)); // ~0.1
    expect(dc.dcOffset).toBeCloseTo(0.1, 2);
    expect(Math.abs(dc.dcOffset)).toBeGreaterThan(LIMITS.dcAbs);
  });

  it('ekor senyap dan sampel tepi diukur', () => {
    const s = new Int16Array(SR); s.set(sine(500, 0.5, 0.5));
    const m = measure(s);
    expect(m.tailSilenceMs).toBeGreaterThan(450);
    expect(m.lastSample).toBe(0);
  });

  it('decodeWav: WAV sah tanpa galat; laju/kanal/bit salah dilaporkan', () => {
    const ok = toWav(Float32Array.from([0, 0.5, -0.5, 0]));
    expect(decodeWav(ok).errors).toEqual([]);
    const bad = Buffer.from(ok); bad.writeUInt32LE(48000, 24);
    expect(decodeWav(bad).errors.join()).toContain('48000');
    expect(decodeWav(Buffer.from('bukan wav sama sekali, hanya teks panjang saja......')).errors.length).toBeGreaterThan(0);
  });

  it('analyzeAll melaporkan berkas hilang, hash tidak cocok, dan berkas liar', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sfxan-'));
    try {
      const wav = toWav(Float32Array.from({ length: 4410 }, (_, i) => 0.7 * Math.sin(i / 7) * Math.min(1, i / 100) * Math.min(1, (4410 - i) / 100)));
      writeFileSync(join(dir, 'A.wav'), wav);
      writeFileSync(join(dir, 'liar.wav'), wav);
      const mf = join(dir, 'm.json');
      writeFileSync(mf, JSON.stringify([
        { id: 'A', category: 'ui', gain: 0.5, files: [{ file: 'A.wav', sha256: 'x' }] },
        { id: 'B', category: 'ui', gain: 0.5, files: [{ file: 'B.wav', sha256: 'y' }] },
      ]));
      const { rows } = analyzeAll({ dir, manifestPath: mf });
      expect(rows.find(r => r.file === 'A.wav')!.issues).toContain('sha256 != manifest');
      expect(rows.find(r => r.file === 'B.wav')!.issues).toContain('berkas hilang');
      expect(rows.find(r => r.file === 'liar.wav')!.issues).toContain('berkas tidak ada di manifest');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe('analyze.mjs: seluruh aset SFX (Phase 7 + Phase 8)', () => {
  const { rows, groupStats } = analyzeAll();

  it('mencakup setiap berkas registry dan tidak ada berkas liar', () => {
    const files = SFX_REGISTRY.flatMap(c => c.files);
    expect(rows.length).toBe(files.length);
    expect(new Set(rows.map(r => r.file))).toEqual(new Set(files));
  });

  it('tanpa galat keras: format sah, tanpa klip, DC kecil, tanpa klik awal/akhir, puncak ~ -3 dBFS, durasi & RMS dalam jendela peran', () => {
    for (const r of rows) expect(r.issues, `${r.file}: ${r.issues.join('; ')}`).toEqual([]);
    for (const r of rows) {
      expect(r.clipSamples, r.file).toBe(0);
      expect(Math.abs(r.dcOffset!), r.file).toBeLessThan(LIMITS.dcAbs);
      expect(r.firstSample!, r.file).toBeLessThan(LIMITS.firstSampleAbs);
      expect(r.lastSample!, r.file).toBeLessThan(LIMITS.lastSampleAbs);
      expect(Math.abs(r.peakDb! - LIMITS.peakTargetDb), r.file).toBeLessThan(LIMITS.peakTolDb);
    }
  });

  it('tanpa run datar (indikasi kliping/limiter keras) pada berkas mana pun', () => {
    for (const r of rows) expect(r.flatRuns, r.file).toBe(0);
  });

  it('loudness efektif tiap kelompok fungsi konsisten dalam ±4 dB dari median kelompok', () => {
    expect(GROUP_TOLERANCE_DB).toBe(4);
    for (const [g, s] of Object.entries(groupStats)) {
      expect(s.outliers, `${g}: ${s.outliers.join(', ')}`).toEqual([]);
      expect(s.minDev, g).toBeGreaterThanOrEqual(-GROUP_TOLERANCE_DB);
      expect(s.maxDev, g).toBeLessThanOrEqual(GROUP_TOLERANCE_DB);
    }
    for (const g of ['world', 'boss', 'meteor', 'aegis']) expect(groupStats[g], g).toBeDefined();
  });

  it('Phase 8: tidak ada bunyi baru yang jauh lebih pelan/keras dari battle lama (efektif dalam ±6 dB median battle)', () => {
    const battle = groupStats['battle']!.medianEffLufs;
    for (const g of ['boss', 'meteor', 'aegis']) expect(Math.abs(groupStats[g]!.medianEffLufs - battle), g).toBeLessThanOrEqual(6);
  });

  it('meteor: dampak punya ekor sunyi (keheningan) dan terkeras pada momentary efektif di antara bunyi meteor', () => {
    const imp = rows.find(r => r.id === 'SFX_METEOR_IMPACT')!;
    expect(imp.tailSilenceMs!).toBeGreaterThanOrEqual(300);
    const effMom = (id: string): number => { const r = rows.find(x => x.id === id)!; return r.momentaryLufs! + 20 * Math.log10(r.gain); };
    expect(effMom('SFX_METEOR_IMPACT')).toBeGreaterThan(effMom('SFX_METEOR_DESCENT'));
    expect(effMom('SFX_METEOR_IMPACT')).toBeGreaterThan(effMom('SFX_METEOR_CHARGE'));
  });

  it('tabel markdown memuat setiap id dan ringkasan kelompok', () => {
    const t = tableMd(rows); const g = groupMd(groupStats);
    for (const c of SFX_REGISTRY) expect(t).toContain(c.id);
    expect(g).toContain('Meteor');
  });
});
