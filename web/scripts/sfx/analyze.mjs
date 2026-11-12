/**
 * Analisis kualitas audio OTOMATIS untuk semua WAV SFX (Phase 7 + Phase 8). HANYA pengukuran objektif; skrip ini
 * TIDAK menilai bunyi (tidak bisa "mendengar"): hasilnya bukan pengganti peninjauan telinga manusia.
 *
 *   node scripts/sfx/analyze.mjs                 -> cetak tabel + ringkasan kelompok
 *   node scripts/sfx/analyze.mjs --json out.json -> tulis hasil lengkap
 *   node scripts/sfx/analyze.mjs --patch-doc     -> perbarui tabel di docs/production/sprint4/S.md (di antara penanda)
 *
 * Metrik per berkas: format (PCM 44.1k mono 16-bit), durasi, puncak (dBFS), RMS (dBFS), LUFS-perkiraan (K-weighting
 * BS.1770 tanpa gerbang; dihitung ulang pada 44.1 kHz, jadi PERKIRAAN), LUFS momentary maks (jendela 400 ms),
 * jumlah sampel klip, DC offset, sampel pertama/terakhir (klik awal/akhir; lonjakan tepi hanya dicatat), kesenyapan ekor,
 * faktor puncak (crest) dan run datar di puncak (indikasi distorsi kasar), durasi terhadap peran (CATEGORY_LIMITS),
 * dan kesenjangan loudness efektif (LUFS + 20 log10 gain registry) terhadap median kelompok fungsi.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CATEGORY_LIMITS } from './catalog.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, '..', '..');
export const SFX_DIR = resolve(webRoot, 'public', 'assets', 'audio', 'sfx');
export const MANIFEST_PATH = resolve(here, 'manifest.json');
const DOC_PATH = resolve(webRoot, '..', 'docs', 'production', 'sprint4', 'S.md');

/** Toleransi (dB) loudness efektif terhadap median kelompok fungsi. */
export const GROUP_TOLERANCE_DB = 4;
/** Ambang keras. */
export const LIMITS = {
  dcAbs: 0.002, // |DC offset| linear
  firstSampleAbs: 0.01, // klik awal
  lastSampleAbs: 0.005, // klik akhir
  peakTargetDb: -3, // puncak dinormalisasi ke -3 dBFS
  peakTolDb: 0.4,
  flatTopRun: 3, // >= N sampel int16 identik berturut-turut dekat puncak = run datar (kliping)
  crestMinDb: 5, // faktor puncak di bawah ini = padat/jenuh berat (peringatan, bukan galat)
};

const db = (x) => 20 * Math.log10(Math.max(x, 1e-12));

/** Decode WAV RIFF sederhana (PCM). Mengembalikan galat format, bukan melempar. */
export function decodeWav(b) {
  const errors = [];
  if (b.length < 44 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') return { errors: ['bukan RIFF/WAVE'], samples: new Int16Array(0), sampleRate: 0, channels: 0, bits: 0 };
  if (b.readUInt32LE(4) !== b.length - 8) errors.push('ukuran RIFF tidak cocok');
  let off = 12, fmt = null, data = null;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    const body = b.subarray(off + 8, off + 8 + size);
    if (id === 'fmt ') fmt = { format: body.readUInt16LE(0), channels: body.readUInt16LE(2), rate: body.readUInt32LE(4), bits: body.readUInt16LE(14) };
    if (id === 'data') data = body;
    off += 8 + size + (size % 2);
  }
  if (!fmt || !data) return { errors: [...errors, 'chunk fmt/data hilang'], samples: new Int16Array(0), sampleRate: 0, channels: 0, bits: 0 };
  if (fmt.format !== 1) errors.push('bukan PCM');
  if (fmt.rate !== 44100) errors.push(`laju sampel ${fmt.rate}`);
  if (fmt.channels !== 1) errors.push(`kanal ${fmt.channels}`);
  if (fmt.bits !== 16) errors.push(`${fmt.bits}-bit`);
  const n = Math.floor(data.length / 2);
  const samples = new Int16Array(n);
  for (let i = 0; i < n; i++) samples[i] = data.readInt16LE(i * 2);
  return { errors, samples, sampleRate: fmt.rate, channels: fmt.channels, bits: fmt.bits };
}

// ---- K-weighting (BS.1770), koefisien RBJ dihitung pada laju sampel aktual ----
function biquadCoefs(type, fs, f0, q, gainDb = 0) {
  const w = (2 * Math.PI * f0) / fs, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q), A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
  else { // highshelf
    const s = 2 * Math.sqrt(A) * al;
    b0 = A * (A + 1 + (A - 1) * cw + s); b1 = -2 * A * (A - 1 + (A + 1) * cw); b2 = A * (A + 1 + (A - 1) * cw - s);
    a0 = A + 1 - (A - 1) * cw + s; a1 = 2 * (A - 1 - (A + 1) * cw); a2 = A + 1 - (A - 1) * cw - s;
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}
function runBiquad(x, c) {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = c.b0 * x[i] + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
export function kWeight(x, fs) {
  return runBiquad(runBiquad(x, biquadCoefs('shelf', fs, 1681.97, 0.7071753, 3.99996)), biquadCoefs('hp', fs, 38.1355, 0.5003));
}
const lufsOf = (k, from, to) => {
  let s = 0;
  for (let i = from; i < to; i++) s += k[i] * k[i];
  return -0.691 + 10 * Math.log10(Math.max(s / Math.max(1, to - from), 1e-14));
};

/** Ukur satu buffer int16 (mono). */
export function measure(int16, fs = 44100) {
  const n = int16.length;
  const x = new Float64Array(n);
  let peak = 0, sq = 0, sum = 0, clips = 0, run = 0, maxRun = 0;
  for (let i = 0; i < n; i++) {
    const s = int16[i];
    x[i] = s / 32768;
    const a = Math.abs(x[i]);
    if (a > peak) peak = a;
    sq += x[i] * x[i];
    sum += x[i];
    if (s >= 32767 || s <= -32768) { clips++; run++; maxRun = Math.max(maxRun, run); } else run = 0;
  }
  const rms = Math.sqrt(sq / Math.max(1, n));
  const k = kWeight(x, fs);
  const lufs = lufsOf(k, 0, n);
  const win = Math.round(0.4 * fs), hop = Math.round(0.1 * fs);
  let momentary = lufs;
  if (n > win) { momentary = -Infinity; for (let s0 = 0; s0 + win <= n; s0 += hop) momentary = Math.max(momentary, lufsOf(k, s0, s0 + win)); }
  // run datar (kliping/limiter keras): >= N sampel int16 IDENTIK berturut-turut pada |x| >= 0.9 x puncak. Gelombang sinus rendah yang
  // sekadar membulat di puncak TIDAK terhitung (nilai sampelnya berbeda-beda).
  let flatRuns = 0, cur = 1;
  for (let i = 1; i < n; i++) {
    if (int16[i] === int16[i - 1] && Math.abs(x[i]) >= 0.9 * peak) { cur++; if (cur === LIMITS.flatTopRun) flatRuns++; } else cur = 1;
  }
  // tepi
  const e = Math.max(2, Math.round(0.003 * fs));
  let edgeStep = 0;
  for (let i = 1; i < Math.min(e, n); i++) edgeStep = Math.max(edgeStep, Math.abs(x[i] - x[i - 1]));
  for (let i = Math.max(1, n - e); i < n; i++) edgeStep = Math.max(edgeStep, Math.abs(x[i] - x[i - 1]));
  // ekor senyap: durasi (ms) di ujung dengan |x| < -60 dBFS
  let tail = 0;
  for (let i = n - 1; i >= 0 && Math.abs(x[i]) < 0.001; i--) tail++;
  return {
    durationMs: (n / fs) * 1000,
    peakDb: db(peak), rmsDb: db(rms), lufs, momentaryLufs: momentary, crestDb: db(peak) - db(rms),
    clipSamples: clips, maxClipRun: maxRun,
    dcOffset: sum / Math.max(1, n),
    firstSample: n ? Math.abs(x[0]) : 0, lastSample: n ? Math.abs(x[n - 1]) : 0,
    edgeStep /* informasi saja: kemiringan alami sinyal, bukan kriteria */, flatRuns, tailSilenceMs: (tail / fs) * 1000,
  };
}

export const GROUP_NAMES = {
  ui: 'UI', step: 'Langkah', interact: 'Interaksi', transition: 'Transisi battle', battle: 'Battle (ayun/hantam)', magic: 'Sihir/penyembuhan',
  stinger: 'Stinger', world: 'Dunia Benteng (P8)', boss: 'Boss/musuh Bab IV (P8)', meteor: 'Meteor (P8)', aegis: 'Perlindungan (P8)',
};
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const sha = (b) => createHash('sha256').update(b).digest('hex');
const r1 = (x) => Math.round(x * 10) / 10;

/** Analisis semua berkas di manifest (+ berkas liar di folder). */
export function analyzeAll({ dir = SFX_DIR, manifestPath = MANIFEST_PATH } = {}) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const rows = [];
  for (const cue of manifest) {
    const lim = CATEGORY_LIMITS[cue.category];
    for (const f of cue.files) {
      const path = resolve(dir, f.file);
      const issues = [], warns = [];
      if (!existsSync(path)) { rows.push({ id: cue.id, file: f.file, group: cue.category, gain: cue.gain, issues: ['berkas hilang'], warns: [] }); continue; }
      const buf = readFileSync(path);
      const wav = decodeWav(buf);
      issues.push(...wav.errors);
      if (sha(buf) !== f.sha256) issues.push('sha256 != manifest');
      const m = measure(wav.samples, wav.sampleRate || 44100);
      if (m.clipSamples > 0) issues.push(`klip ${m.clipSamples}`);
      if (Math.abs(m.dcOffset) > LIMITS.dcAbs) issues.push(`DC ${m.dcOffset.toFixed(4)}`);
      if (m.firstSample > LIMITS.firstSampleAbs) issues.push('klik awal');
      if (m.lastSample > LIMITS.lastSampleAbs) issues.push('klik akhir');
      if (Math.abs(m.peakDb - LIMITS.peakTargetDb) > LIMITS.peakTolDb) issues.push(`puncak ${r1(m.peakDb)}`);
      if (lim && (m.durationMs < lim.minMs || m.durationMs > lim.maxMs)) issues.push(`durasi ${Math.round(m.durationMs)}ms di luar ${lim.minMs}-${lim.maxMs}`);
      if (lim && (m.rmsDb < lim.rmsMin || m.rmsDb > lim.rmsMax)) issues.push(`RMS ${r1(m.rmsDb)} di luar jendela`);
      if (!lim) issues.push(`kategori ${cue.category} tanpa batas`);
      if (m.flatRuns > 0) warns.push(`run datar puncak x${m.flatRuns}`);
      if (m.crestDb < LIMITS.crestMinDb) warns.push(`crest ${r1(m.crestDb)} dB (padat)`);
      rows.push({ id: cue.id, file: f.file, group: cue.category, gain: cue.gain, ...m, effLufs: m.lufs + db(cue.gain), issues, warns });
    }
  }
  if (existsSync(dir)) {
    const listed = new Set(manifest.flatMap((c) => c.files.map((f) => f.file)));
    for (const f of readdirSync(dir)) if (!listed.has(f)) rows.push({ id: f, file: f, group: '?', gain: 0, issues: ['berkas tidak ada di manifest'], warns: [] });
  }
  // kelompok fungsi
  const groups = {};
  for (const r of rows) if (r.effLufs !== undefined) (groups[r.group] ??= []).push(r);
  const groupStats = Object.fromEntries(Object.entries(groups).map(([g, rs]) => {
    const med = median(rs.map((r) => r.effLufs));
    for (const r of rs) { r.groupDev = r.effLufs - med; r.groupOk = Math.abs(r.groupDev) <= GROUP_TOLERANCE_DB; }
    const devs = rs.map((r) => r.groupDev);
    return [g, { name: GROUP_NAMES[g] ?? g, count: rs.length, medianEffLufs: med, minDev: Math.min(...devs), maxDev: Math.max(...devs), outliers: rs.filter((r) => !r.groupOk).map((r) => r.file) }];
  }));
  return { rows, groupStats };
}

export function tableMd(rows) {
  const out = ['| id / berkas | grup | durasi (ms) | puncak (dBFS) | RMS (dBFS) | LUFS~ | LUFS mom. maks | gain | LUFS efektif | dev. grup (dB) | klip | DC | crest (dB) | ekor senyap (ms) | catatan |', '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|'];
  for (const r of rows) {
    if (r.durationMs === undefined) { out.push(`| \`${r.file}\` | ${r.group} | - | - | - | - | - | - | - | - | - | - | - | - | **${r.issues.join('; ')}** |`); continue; }
    const notes = [...r.issues.map((i) => `**GALAT ${i}**`), ...(r.groupOk ? [] : [`di luar ±${GROUP_TOLERANCE_DB} dB kelompok`]), ...r.warns].join('; ') || 'ok';
    out.push(`| \`${r.file.replace(/\.wav$/, '')}\` | ${r.group} | ${Math.round(r.durationMs)} | ${r1(r.peakDb)} | ${r1(r.rmsDb)} | ${r1(r.lufs)} | ${r1(r.momentaryLufs)} | ${r.gain} | ${r1(r.effLufs)} | ${r.groupDev >= 0 ? '+' : ''}${r1(r.groupDev)} | ${r.clipSamples} | ${r.dcOffset.toExponential(1)} | ${r1(r.crestDb)} | ${Math.round(r.tailSilenceMs)} | ${notes} |`);
  }
  return out.join('\n');
}
export function groupMd(groupStats) {
  const out = ['| kelompok | berkas | median LUFS efektif | rentang dev. (dB) | di luar ±4 dB |', '|---|---:|---:|---|---|'];
  for (const [g, s] of Object.entries(groupStats)) out.push(`| ${s.name} (\`${g}\`) | ${s.count} | ${r1(s.medianEffLufs)} | ${r1(s.minDev)}..+${r1(s.maxDev)} | ${s.outliers.length ? s.outliers.map((f) => f.replace(/\.wav$/, '')).join(', ') : '-'} |`);
  return out.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const { rows, groupStats } = analyzeAll();
  const hard = rows.filter((r) => r.issues.length);
  console.log(tableMd(rows));
  console.log('\n' + groupMd(groupStats));
  console.log(`\n${rows.length} berkas; galat keras: ${hard.length}; peringatan: ${rows.filter((r) => r.warns.length).length}. (Pengukuran objektif saja; belum ditinjau manusia.)`);
  const j = args.indexOf('--json');
  if (j >= 0) writeFileSync(resolve(args[j + 1]), JSON.stringify({ rows, groupStats }, null, 2));
  if (args.includes('--patch-doc') && existsSync(DOC_PATH)) {
    let md = readFileSync(DOC_PATH, 'utf8');
    const sub = (tag, body) => { const re = new RegExp(`(<!-- ${tag}_START -->)[\\s\\S]*?(<!-- ${tag}_END -->)`); if (re.test(md)) md = md.replace(re, `$1\n${body}\n$2`); };
    sub('SFX_ANALYSIS', tableMd(rows));
    sub('SFX_GROUPS', groupMd(groupStats));
    writeFileSync(DOC_PATH, md);
    console.log('S.md diperbarui.');
  }
  if (hard.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
