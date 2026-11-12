/**
 * Generator SFX ORIGINAL (Phase 7). Deterministik: id yang sama + kode yang sama -> byte WAV yang sama.
 *   node web/scripts/sfx/generate.mjs          -> tulis WAV, manifest.json, sfxRegistry.ts, tabel di SFX_DESIGN_AND_MANIFEST.md
 *   node web/scripts/sfx/generate.mjs --check  -> hanya render + cetak tabel (tidak menulis berkas)
 * Tidak ada BGM, tidak ada sampel pihak ketiga, tidak ada RNG bawaan runtime.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { hashSeed, makeRng, stats, toWav } from './dsp.mjs';
import { CATALOG, renderCue } from './catalog.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '..', '..');
export const OUT_DIR = resolve(webRoot, 'public', 'assets', 'audio', 'sfx');
const REGISTRY_TS = resolve(webRoot, 'src', 'game', 'data', 'sfxRegistry.ts');
const MANIFEST = resolve(here, 'manifest.json');
const DOC = resolve(webRoot, '..', 'docs', 'production', 'SFX_DESIGN_AND_MANIFEST.md');

const sha = (b) => createHash('sha256').update(b).digest('hex');
const fileName = (id, v, n) => (n === 1 ? `${id}.wav` : `${id}_${String(v + 1).padStart(2, '0')}.wav`);
const r1 = (x) => Math.round(x * 10) / 10;

/** Render semua cue. Mengembalikan entri dengan wav Buffer + statistik (tanpa menulis). */
export function renderAll() {
  const cues = [];
  for (const entry of CATALOG) {
    const buffers = renderCue(entry, makeRng, hashSeed);
    const files = buffers.map((samples, v) => {
      const wav = toWav(samples);
      return { file: fileName(entry.id, v, buffers.length), wav, sha256: sha(wav), ...stats(Float32Array.from({ length: samples.length }, (_, i) => wav.readInt16LE(44 + i * 2) / 32768)) };
    });
    cues.push({ entry, files });
  }
  return cues;
}

function manifestOf(cues) {
  return cues.map(({ entry, files }) => ({
    id: entry.id, category: entry.category, minIntervalMs: entry.minIntervalMs, gain: entry.gain,
    files: files.map((f) => ({ file: f.file, durationMs: r1(f.durationMs), peakDb: r1(f.peakDb), rmsDb: r1(f.rmsDb), sha256: f.sha256 })),
  }));
}

function registryTs(cues) {
  const rows = cues.map(({ entry, files }) => {
    const dur = Math.round(Math.max(...files.map((f) => f.durationMs)));
    return `  { id: '${entry.id}', category: '${entry.category}', files: [${files.map((f) => `'${f.file}'`).join(', ')}], minIntervalMs: ${entry.minIntervalMs}, gain: ${entry.gain}, durationMs: ${dur}, status: 'READY' },`;
  });
  return `/**
 * Registri SFX ORIGINAL (Phase 7). Hanya efek suara; BGM tetap milik Game Director (MUSIC_REGISTRY.json, AWAITING_COMPOSER).
 * BERKAS INI DIHASILKAN oleh web/scripts/sfx/generate.mjs (jangan ubah manual; ubah katalog lalu jalankan ulang).
 * Semua bunyi disintesis dari kode (web/scripts/sfx/*), bukan rekaman/sampel pihak ketiga. Kualitas: FUNCTIONAL / AUDIO-REVIEW PENDING.
 * BootScene memuat entri READY dari assets/audio/sfx/: key = id (satu file) atau \`id#i\` (variasi).
 */
export type SfxCategory = 'ui' | 'step' | 'interact' | 'transition' | 'battle' | 'magic' | 'stinger';

export interface SfxCue {
  id: string;
  category?: SfxCategory;
  /** satu atau beberapa file (variasi); dipilih bergantian tanpa pengulangan langsung */
  files: readonly string[];
  /** interval minimum antar pemutaran id yang sama (ms) untuk membatasi tumpang tindih */
  minIntervalMs: number;
  /** volume relatif 0..1 sebelum Settings */
  gain: number;
  /** durasi file terpanjang (ms); dipakai membatasi jumlah suara bersamaan */
  durationMs?: number;
  status: 'READY' | 'MISSING';
}

export const SFX_REGISTRY: readonly SfxCue[] = [
${rows.join('\n')}
];
`;
}

function tableMd(cues) {
  const lines = ['| id | kategori | file | durasi (ms) | puncak (dBFS) | RMS (dBFS) | gain | RMS efektif (dBFS) | interval min (ms) |', '|---|---|---|---:|---:|---:|---:|---:|---:|'];
  for (const { entry, files } of cues) {
    const dur = files.map((f) => Math.round(f.durationMs));
    const durTxt = dur.length === 1 ? `${dur[0]}` : `${Math.min(...dur)}-${Math.max(...dur)}`;
    const rms = files.map((f) => f.rmsDb);
    const rmsTxt = rms.length === 1 ? `${r1(rms[0])}` : `${r1(Math.min(...rms))}..${r1(Math.max(...rms))}`;
    const eff = r1(rms.reduce((a, b) => a + b, 0) / rms.length + 20 * Math.log10(entry.gain));
    const peak = r1(Math.max(...files.map((f) => f.peakDb)));
    lines.push(`| \`${entry.id}\` | ${entry.category} | ${files.length === 1 ? '1' : `${files.length} variasi`} | ${durTxt} | ${peak} | ${rmsTxt} | ${entry.gain} | ${eff} | ${entry.minIntervalMs} |`);
  }
  return lines.join('\n');
}

function recipeMd() {
  const lines = ['| id | deskripsi bunyi | resep sintesis | lokasi pemicu |', '|---|---|---|---|'];
  for (const e of CATALOG) lines.push(`| \`${e.id}\` | ${e.desc} | ${e.recipe} | ${e.trigger} |`);
  return lines.join('\n');
}

function patchDoc(cues) {
  if (!existsSync(DOC)) return false;
  let md = readFileSync(DOC, 'utf8');
  const sub = (tag, body) => {
    const re = new RegExp(`(<!-- ${tag}_START -->)[\\s\\S]*?(<!-- ${tag}_END -->)`);
    if (re.test(md)) md = md.replace(re, `$1\n${body}\n$2`);
  };
  sub('SFX_TABLE', tableMd(cues));
  sub('SFX_RECIPES', recipeMd());
  writeFileSync(DOC, md);
  return true;
}

function main() {
  const check = process.argv.includes('--check');
  const t0 = Date.now();
  const cues = renderAll();
  console.log(tableMd(cues));
  if (check) { console.log(`\n(check) ${cues.length} id, ${cues.reduce((a, c) => a + c.files.length, 0)} berkas, ${Date.now() - t0} ms; tidak menulis.`); return; }
  mkdirSync(OUT_DIR, { recursive: true });
  const keep = new Set(cues.flatMap((c) => c.files.map((f) => f.file)));
  for (const f of readdirSync(OUT_DIR)) if (f.endsWith('.wav') && !keep.has(f)) rmSync(resolve(OUT_DIR, f)); // buang sisa lama
  for (const c of cues) for (const f of c.files) writeFileSync(resolve(OUT_DIR, f.file), f.wav);
  writeFileSync(MANIFEST, JSON.stringify(manifestOf(cues), null, 2) + '\n');
  writeFileSync(REGISTRY_TS, registryTs(cues));
  const doc = patchDoc(cues);
  console.log(`\nSelesai: ${cues.length} id, ${keep.size} WAV -> ${OUT_DIR}; manifest + sfxRegistry.ts${doc ? ' + tabel dokumen' : ''} diperbarui (${Date.now() - t0} ms).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
