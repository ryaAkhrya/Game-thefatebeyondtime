// Polish Sprint 1 - normalisasi atlas eksplorasi (salinan TURUNAN runtime; sumber di ../assets TIDAK diubah,
// salinan lama web/public/assets/characters/Cxx_explore.* juga TIDAK disentuh).
//   node scripts/normalize-exploration-sprites.mjs           -> menulis public/assets/characters/normalized/Cxx_explore.{png,json}
//   node scripts/normalize-exploration-sprites.mjs --diag    -> hanya mencetak ukuran sebelum/sesudah (tanpa menulis)
// Dijalankan SETELAH prepare-assets / prepare-aveloria-assets / prepare-chapter2-assets (membaca salinan runtime lama).
//
// Metode (deterministik, hanya memindahkan/menggandakan piksel yang sudah ada; tidak ada resampling/interpolasi/blur,
// palet dan alpha keras tetap; tidak ada karakter yang digambar ulang):
//  1. Garis kaki: baris opak terbawah SETIAP frame dipindah ke y = 46 (pivot [16,46]). Offset vertikal dihitung per frame
//     lalu dicek sama dalam satu baris arah (tidak ada getaran vertikal siklus jalan).
//  2. Tinggi: bila spesifikasi karakter meminta `stretchRows`, baris-baris sumber tsb digandakan (satu kali, pada baris yang
//     sama untuk SEMUA frame arah itu) agar tinggi figur sama dengan tampak depan (46 px). Baris dipilih di area badan/jubah
//     (bukan wajah/rambut/sol sepatu).
//  3. `mirrorFrom`: baris arah diturunkan dari baris arah lain yang dicerminkan horizontal dalam sel 32 px (x -> 31-x).
//  4. Horizontal: SATU offset per baris arah (berlaku ke semua frame) agar titik berat piksel pada 8 baris terbawah (tumpuan
//     kaki) rata-rata jatuh sedekat mungkin ke x = 16.0 (batas piksel 15|16 = origin 0.5 dari lebar 32). Tidak ada centering per frame.
//  5. Validasi keras: alpha hanya 0/255, palet keluaran subset palet masukan, tidak ada piksel pada tepi sel, kaki di y=46.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const chars = resolve(here, '../public/assets/characters');
const outDir = resolve(chars, 'normalized');
const DIAG = process.argv.includes('--diag');

const FW = 32, FH = 48, BASE = 46, PIVOT = [16, BASE];
const DIRS = ['down', 'left', 'right', 'up']; // urutan baris = DIR_ROW WorldScene
const PREFIX = { down: 'front', left: 'left', right: 'right', up: 'back' };

// Baris sumber (koordinat y dalam sel 48 px) yang digandakan untuk Yaric samping: 6 baris tersebar di leher/badan/jubah/paha.
const YARIC_SIDE_STRETCH = [11, 15, 19, 23, 27, 31];

const CHARACTERS = [
  {
    id: 'C01', cols: 4, status: 'NEEDS_REVIEW', source: 'assets/characters/C01_Yaric/v3_2/C01_EXPLORATION_PIXEL_PASS_V3_2',
    rows: {
      down: {}, up: {},
      left: { stretchRows: YARIC_SIDE_STRETCH, targetHeight: 46 },
      right: { mirrorFrom: 'left', stretchRows: YARIC_SIDE_STRETCH, targetHeight: 46 },
    },
    notes: [
      'Tampak depan (down) dipakai sebagai acuan tinggi: 46 px (y1..y46).',
      'left: sumber tinggi 40 px (kaki melayang 6 px) -> 6 baris digandakan (y11,15,19,23,27,31) sehingga tinggi 46 px dan kaki di y=46.',
      'right: sumber asli hanya 36 px dan proporsi lebih kecil; DIGANTI turunan cermin dari left (frame k = cermin left_k, fase langkah sama) lalu diregangkan sama seperti left. Gambar right asli tidak dipakai.',
      'up: sudah 46 px dan kaki di y=46; hanya offset-x. Bagian atas rambut tampak belakang terpotong rata (baris y1 selebar 12-13 px tanpa outline, mahkota depan runcing 3 px): TIDAK dapat dipulihkan tanpa menggambar ulang.',
      'Garis cokelat 1 px (131,94,78) di bawah sepatu pada left_1/left_3 (dan cerminannya) dipertahankan sebagai bagian dari sol; ia menentukan baris terbawah.',
    ],
    redraw: [
      'up_0..up_3: mahkota rambut tampak belakang terpotong rata di y=1 (perlu redraw seniman).',
      'right_0..right_3: dihasilkan dari cermin left (detail asimetris/shading cahaya ikut terbalik); perlu redraw jika arah cahaya/detail kiri-kanan penting.',
      'left_0..left_3 dan right_0..right_3: peregangan 6 baris menghasilkan 6 baris piksel setinggi 2x (lebar 1x) pada badan/jubah; cukup bersih tetapi bukan gambar asli.',
    ],
  },
  { id: 'C02', cols: 6, status: 'DRAFT', source: 'assets/characters/C02_Velthia/C02_EXPLORATION_ATLAS_DRAFT' },
  { id: 'C03', cols: 6, status: 'DRAFT', source: 'assets/characters/C03_Torvan/C03_EXPLORATION_ATLAS_DRAFT' },
  { id: 'C05', cols: 6, status: 'DRAFT', source: 'assets/characters/C05_Azie/C05_EXPLORATION_ATLAS_DRAFT' },
  { id: 'C06', cols: 6, status: 'DRAFT', source: 'assets/characters/C06_Talric/C06_EXPLORATION_ATLAS_DRAFT' },
  { id: 'C07', cols: 6, status: 'DRAFT', source: 'assets/characters/C07_Zira/C07_EXPLORATION_ATLAS_DRAFT' },
  { id: 'C08', cols: 6, status: 'DRAFT', source: 'assets/characters/C08_Nambo/C08_EXPLORATION_ATLAS_DRAFT' },
  { id: 'C09', cols: 6, status: 'DRAFT', source: 'assets/characters/C09_Derrria/C09_EXPLORATION_ATLAS_DRAFT' },
];
const SUPPORT_NOTES = [
  'Prototipe kasar: badan sama untuk keempat arah, hanya kepala berbeda; siklus jalan = kepala naik-turun 1 px dengan kaki tetap.',
  'Hanya satu pergeseran vertikal (kaki ke y=46) dan satu pergeseran horizontal per baris arah; bob kepala 1 px asli dipertahankan.',
];
const SUPPORT_REDRAW = ['Semua frame: sprite prototipe kasar, tanpa animasi kaki/lengan, arah hanya dibedakan kepala; perlu redraw seniman untuk final.'];

// ------------------------------------------------------------------ PNG codec minimal (RGBA 8-bit)
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function readPng(buf) {
  let pos = 8, width = 0, height = 0, colorType = 0, bitDepth = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { width = body.readUInt32BE(0); height = body.readUInt32BE(4); bitDepth = body[8]; colorType = body[9]; interlace = body[12]; }
    else if (type === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
  if (colorType !== 6 || bitDepth !== 8 || interlace !== 0) throw new Error(`PNG harus RGBA 8-bit tanpa interlace (dapat ct=${colorType} bd=${bitDepth} il=${interlace})`);
  const raw = inflateSync(Buffer.concat(idat)), stride = width * 4, out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? out[y * stride + i - 4] : 0, b = y > 0 ? out[(y - 1) * stride + i] : 0, c = i >= 4 && y > 0 ? out[(y - 1) * stride + i - 4] : 0;
      let v = raw[y * (stride + 1) + 1 + i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * stride + i] = v & 255;
    }
  }
  return { width, height, data: out };
}
function writePng({ width, height, data }) {
  const stride = width * 4, raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (stride + 1)] = 0; Buffer.from(data.buffer, data.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1); }
  const chunk = (type, body) => {
    const head = Buffer.alloc(8); head.writeUInt32BE(body.length, 0); head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
    return Buffer.concat([head, body, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// ------------------------------------------------------------------ operasi frame (array 48 baris x 32 kolom x RGBA)
const px = (f, x, y) => (y * FW + x) * 4;
function getFrame(png, col, row) {
  const f = new Uint8Array(FW * FH * 4);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const s = ((row * FH + y) * png.width + col * FW + x) * 4, d = px(f, x, y);
    f.set(png.data.subarray(s, s + 4), d);
  }
  return f;
}
function setFrame(png, col, row, f) {
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) png.data.set(f.subarray(px(f, x, y), px(f, x, y) + 4), ((row * FH + y) * png.width + col * FW + x) * 4);
}
function bbox(f) {
  let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (f[px(f, x, y) + 3] > 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
const mirrorFrame = (f) => { const o = new Uint8Array(f.length); for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) o.set(f.subarray(px(f, x, y), px(f, x, y) + 4), px(o, FW - 1 - x, y)); return o; };
/** Gandakan baris-baris `dup` (indeks sumber) lalu letakkan baris opak terbawah di BASE. Mengembalikan {frame, dy}. */
function stretchAndGround(f, dup) {
  const idx = [];
  for (let y = 0; y < FH; y++) { idx.push(y); if (dup.includes(y)) idx.push(y); }
  const rowOpaque = (y) => { for (let x = 0; x < FW; x++) if (f[px(f, x, y) + 3] > 0) return true; return false; };
  let bottom = -1;
  idx.forEach((src, i) => { if (rowOpaque(src)) bottom = i; });
  if (bottom < 0) throw new Error('frame kosong');
  const dy = BASE - bottom, o = new Uint8Array(f.length);
  idx.forEach((src, i) => {
    const y = i + dy;
    if (y < 0 || y >= FH) { if (rowOpaque(src)) throw new Error(`baris opak ${src} jatuh di luar sel (y=${y})`); return; }
    o.set(f.subarray(src * FW * 4, (src + 1) * FW * 4), y * FW * 4);
  });
  return { frame: o, dy };
}
function shiftX(f, dx) {
  const o = new Uint8Array(f.length);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const a = f[px(f, x, y) + 3];
    if (a === 0) continue;
    const nx = x + dx;
    if (nx < 0 || nx >= FW) throw new Error(`geser-x ${dx} mendorong piksel keluar sel`);
    o.set(f.subarray(px(f, x, y), px(f, x, y) + 4), px(o, nx, y));
  }
  return o;
}
/** Titik berat x (koordinat batas piksel: piksel x berpusat x+0.5) dari 8 baris opak-terbawah; dipakai sebagai jangkar tumpuan. */
function footCenter(f, base) {
  let sum = 0, n = 0;
  for (let y = base - 7; y <= base; y++) for (let x = 0; x < FW; x++) if (f[px(f, x, y) + 3] > 0) { sum += x + 0.5; n++; }
  return n ? sum / n : 16;
}
const paletteOf = (png) => { const s = new Set(); for (let i = 0; i < png.data.length; i += 4) if (png.data[i + 3] > 0) s.add(`${png.data[i]},${png.data[i + 1]},${png.data[i + 2]}`); return s; };

// ------------------------------------------------------------------ proses
const summary = [];
if (!DIAG) mkdirSync(outDir, { recursive: true });
for (const def of CHARACTERS) {
  const inPath = resolve(chars, `${def.id}_explore.png`), inJsonPath = resolve(chars, `${def.id}_explore.json`);
  if (!existsSync(inPath)) throw new Error(`${inPath} tidak ada; jalankan assets:prepare dahulu`);
  const inBuf = readFileSync(inPath), srcBuf = readFileSync(resolve(repo, def.source + '.png'));
  const inJson = JSON.parse(readFileSync(inJsonPath, 'utf8'));
  const png = readPng(inBuf);
  if (png.width !== def.cols * FW || png.height !== 4 * FH) throw new Error(`${def.id}: ukuran atlas ${png.width}x${png.height} tak sesuai`);
  const out = { width: png.width, height: png.height, data: new Uint8Array(png.data.length) };
  const inPalette = paletteOf(png);
  const frames = {};
  const dirReport = {};

  DIRS.forEach((dir, row) => {
    const spec = def.rows?.[dir] ?? {};
    const srcRowName = spec.mirrorFrom ?? dir, srcRow = DIRS.indexOf(srcRowName);
    // 1. geometri per frame (stretch + garis kaki), 2. mirror
    const staged = [];
    for (let c = 0; c < def.cols; c++) {
      const before = bbox(getFrame(png, c, row));
      let f = getFrame(png, c, srcRow);
      if (spec.mirrorFrom) f = mirrorFrame(f);
      const { frame, dy } = stretchAndGround(f, spec.stretchRows ?? []);
      const after = bbox(frame);
      if (after.y1 !== BASE) throw new Error(`${def.id} ${dir}_${c}: kaki di y=${after.y1}`);
      if (after.y0 < 1) throw new Error(`${def.id} ${dir}_${c}: kepala menyentuh tepi atas (y0=${after.y0})`);
      if (spec.targetHeight && after.h !== spec.targetHeight) throw new Error(`${def.id} ${dir}_${c}: tinggi ${after.h} != ${spec.targetHeight}`);
      staged.push({ c, before, frame, dy });
    }
    // 3. satu offset-x per baris arah
    const anchors = staged.map((s) => footCenter(s.frame, BASE));
    const meanAnchor = anchors.reduce((a, b) => a + b, 0) / anchors.length;
    const dx = Math.round(16 - meanAnchor);
    const heights = [];
    for (const s of staged) {
      const frame = dx === 0 ? s.frame : shiftX(s.frame, dx);
      setFrame(out, s.c, row, frame);
      const after = bbox(frame);
      heights.push(after.h);
      const name = `${PREFIX[dir]}_${s.c}`;
      frames[name] = {
        rect: [s.c * FW, row * FH, FW, FH], pivot: PIVOT, bbox_before: s.before, bbox_after: after,
        transform: {
          derived_from: spec.mirrorFrom ? `${PREFIX[srcRowName]}_${s.c} (cermin horizontal x->31-x)` : `${name} (sama)`,
          mirror: !!spec.mirrorFrom, duplicate_rows_src_y: spec.stretchRows ?? [], dy: s.dy, dx,
          foot_center_x_before_dx: Number(anchors[s.c].toFixed(2)), foot_center_x_after: Number((anchors[s.c] + dx).toFixed(2)),
        },
      };
    }
    dirReport[dir] = { dx, dyAll: [...new Set(staged.map((s) => s.dy))], heightsAfter: heights, heightsBefore: staged.map((s) => s.before.h), bottomBefore: staged.map((s) => s.before.y1), bottomAfter: BASE, footCenterMean: Number((meanAnchor + dx).toFixed(2)) };
  });

  // validasi keras
  for (let i = 3; i < out.data.length; i += 4) if (out.data[i] !== 0 && out.data[i] !== 255) throw new Error(`${def.id}: alpha parsial`);
  for (const k of paletteOf(out)) if (!inPalette.has(k)) throw new Error(`${def.id}: warna baru ${k}`);

  const pngBuf = writePng(out);
  // sumber asli (untuk sha256) dapat berbeda dari salinan runtime (C01: piksel liar y>=44 pada left/right dihapus oleh prepare-assets)
  const meta = {
    entity_id: def.id, status: def.status, generated_by: 'web/scripts/normalize-exploration-sprites.mjs', normalization_version: 1,
    note_status: 'Turunan runtime Polish Sprint 1. Bukan aset final; tetap ' + def.status + '. Sumber di assets/ tidak diubah.',
    frame_size: [FW, FH], atlas_size: [png.width, png.height], grid: { cols: def.cols, rows: 4, row_order: ['front(down)', 'left', 'right', 'back(up)'] },
    pivot: PIVOT, pivot_note: 'Pivot [16,46] = piksel baris kaki terbawah. Tepi bawah kaki = y 47 sel; Phaser origin (0.5, 47/48) menempatkan tepi bawah kaki tepat di y dunia (sama dengan dasar footBox).',
    baseline_y: BASE,
    source: { path: def.source + '.png', sha256: sha256(srcBuf), json: def.source + '.json' },
    input_runtime_copy: { path: `web/public/assets/characters/${def.id}_explore.png`, sha256: sha256(inBuf), identical_to_source: sha256(srcBuf) === sha256(inBuf) },
    output_sha256_note: 'sha256 PNG keluaran ada di normalized.generated.json',
    per_direction: dirReport,
    frames,
    animations: inJson.animations,
    notes: def.notes ?? SUPPORT_NOTES,
    frames_needing_artist_redraw: def.redraw ?? SUPPORT_REDRAW,
    review: inJson.review,
  };
  summary.push({ id: def.id, status: def.status, out: `assets/characters/normalized/${def.id}_explore.png`, source: def.source + '.png', source_sha256: sha256(srcBuf), output_sha256: sha256(pngBuf), per_direction: dirReport });
  console.log(`${def.id}:`, DIRS.map((d) => `${d}[h ${dirReport[d].heightsBefore.join('/')}->${dirReport[d].heightsAfter.join('/')} dx${dirReport[d].dx} foot-x ${dirReport[d].footCenterMean}]`).join(' '));
  if (!DIAG) {
    writeFileSync(resolve(outDir, `${def.id}_explore.png`), pngBuf);
    writeFileSync(resolve(outDir, `${def.id}_explore.json`), JSON.stringify(meta, null, 2) + '\n');
  }
}
if (!DIAG) {
  writeFileSync(resolve(outDir, 'normalized.generated.json'), JSON.stringify({ generatedBy: 'web/scripts/normalize-exploration-sprites.mjs', status: 'NEEDS_REVIEW/DRAFT', pivot: PIVOT, items: summary }, null, 2) + '\n');
  console.log(`Normalized ${summary.length} exploration atlases -> public/assets/characters/normalized/`);
}
