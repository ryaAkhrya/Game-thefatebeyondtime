// Pratinjau Aveloria sesudah runtuh tanpa browser: node scripts/town-art/c4-preview.mjs <out_dir> [scale]
// Menyusun tanah + item Aveloria (tanpa menara/lonceng/portcullis) + item C4 + NPC + warga dengan urutan depth runtime, lalu memotong
// sudut pandang, dan membuat contact sheet atlas. Alat QA saja (tidak dipakai game); animasi runtime tidak digambar.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Canvas } from './pixel.mjs';
import { aveFrames } from './ave-all.mjs';
import { crisisFrames } from './crisis-all.mjs';
import { c4Frames } from './c4-all.mjs';
import { drawText } from './font.mjs';
import { AVELORIA_ITEMS } from '../../src/game/data/maps/town.layout.mjs';
import { C4_ITEMS, C4_NAMED, C4_RESIDENTS, C4_GATE_GUARD, C4_HIDE_AVE } from '../../src/game/data/maps/town.c4.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pub = resolve(here, '../../public/assets');

function readPng(path) {
  const buf = readFileSync(path); let pos = 8, w = 0, h = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); } else if (type === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = w * 4, out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? out[y * stride + i - 4] : 0, b = y > 0 ? out[(y - 1) * stride + i] : 0, c = i >= 4 && y > 0 ? out[(y - 1) * stride + i - 4] : 0;
      let v = row[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * stride + i] = v & 255;
    }
  }
  const c = new Canvas(w, h); c.d = out; return c;
}
const crop = (src, x, y, w, h) => { const c = new Canvas(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = ((y + j) * src.w + x + i) * 4; for (let q = 0; q < 4; q++) c.d[(j * w + i) * 4 + q] = src.d[k + q]; } return c; };

const outDir = resolve(process.argv[2] ?? resolve(here, '../../../docs/production/sprint4/aveloria-contact-sheets'));
const SCALE = +(process.argv[3] ?? 2);
mkdirSync(outDir, { recursive: true });

const ground = readPng(resolve(pub, 'environment/town/aveloria_ground.png'));
const aveMap = Object.fromEntries(aveFrames().map(f => [f.name, f]));
const crMap = Object.fromEntries(crisisFrames().map(f => [f.name, f]));
const c4List = c4Frames();
const c4Map = Object.fromEntries(c4List.map(f => [f.name, f]));
const chars = {};
for (const id of ['C02', 'C05', 'C06', 'C09']) chars[id] = readPng(resolve(pub, `characters/final/${id}_explore.png`));
const ROW = { down: 0, left: 1, right: 2, up: 3 };
const charFrame = (id, facing) => ({ c: crop(chars[id], 0, ROW[facing] * 48, 32, 48), pivot: { x: 0.5, y: 47 / 48 } });
const ATL = { c4: c4Map, crisis: crMap, ave: aveMap };

function draw(canvas, f, x, y, depth, list, flip = false) {
  list.push({ depth, fn: () => { const c = flip ? f.c.flipX() : f.c; const px = flip ? 1 - f.pivot.x : f.pivot.x; canvas.blit(c, Math.round(x - px * c.w), Math.round(y - f.pivot.y * c.h)); } });
}
function resident(variant, facing) {
  const dir = facing === 'left' || facing === 'right' ? 'side' : facing;
  return { f: crMap[`cit_${variant}_idle_${dir}_0`], flip: facing === 'left' };
}

function render(opt = {}) {
  const canvas = new Canvas(ground.w, ground.h);
  canvas.blit(ground, 0, 0);
  const list = [], decals = [];
  const HIDE = new Set(['ave_palace_door']);
  for (const it of AVELORIA_ITEMS) { if (HIDE.has(it.f) || C4_HIDE_AVE.some(h => h.f === it.f && h.x === it.x && h.y === it.y)) continue; const f = aveMap[it.f]; if (f) draw(canvas, f, it.x, it.y, it.d ?? it.y, list, !!it.flip); }
  for (const it of C4_ITEMS) {
    const f = ATL[it.atlas ?? 'c4'][it.f]; if (!f) { console.warn('frame hilang', it.f); continue; }
    const d = it.d ?? it.y;
    if (d <= -890) draw(canvas, f, it.x, it.y, d, decals, !!it.flip); else draw(canvas, f, it.x, it.y, d, list, !!it.flip);
  }
  const put = (id, s) => draw(canvas, charFrame(id, s.facing), s.x, s.y, s.y, list);
  put('C06', C4_NAMED.talric); put('C05', C4_NAMED.azie); put('C02', C4_NAMED.velthia); put('C09', C4_NAMED.derrria);
  for (const r of [...C4_RESIDENTS, C4_GATE_GUARD]) { const { f, flip } = resident(r.variant, r.facing); draw(canvas, f, r.x, r.y, r.y, list, flip); }
  decals.sort((a, b) => a.depth - b.depth).forEach(d => d.fn());
  list.sort((a, b) => a.depth - b.depth).forEach(d => d.fn());
  void opt;
  return canvas;
}

function save(name, canvas, box, scale = SCALE) {
  const [x, y, w, h] = box, c = crop(canvas, x, y, w, h), big = new Canvas(w * scale, h * scale);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = (j * w + i) * 4; if (c.d[k + 3]) for (let b = 0; b < scale; b++) for (let a = 0; a < scale; a++) big.set(i * scale + a, j * scale + b, [c.d[k], c.d[k + 1], c.d[k + 2]]); }
  writeFileSync(resolve(outDir, name), big.png()); console.log('ok', name);
}

const scene = render();
save('01_ruin_tower_area.png', scene, [560, 380, 420, 330]);
save('02_camp_west.png', scene, [320, 1180, 360, 220]);
save('03_camp_east_scene.png', scene, [640, 1180, 320, 220]);
save('04_camp_full.png', scene, [320, 1150, 640, 250]);
save('05_plaza_empty_city.png', scene, [384, 700, 640, 460], 1);
save('00_full.png', scene, [0, 0, 1280, 1408], 1);

// ---- contact sheet atlas (3x, latar kotak-kotak, nama frame dengan font 3x5) ----
function sheet(name, frames, cols, cell) {
  const rows = Math.ceil(frames.length / cols), S = 2;
  const sh = new Canvas(cols * cell * S, rows * (cell + 10) * S);
  for (let y = 0; y < sh.h; y++) for (let x = 0; x < sh.w; x++) sh.set(x, y, ((x >> 3) + (y >> 3)) & 1 ? [52, 60, 52] : [44, 52, 44]);
  frames.forEach((f, i) => {
    const cx = (i % cols) * cell * S, cy = Math.floor(i / cols) * (cell + 10) * S;
    const fw = Math.min(cell, f.c.w), fh = Math.min(cell, f.c.h);
    for (let j = 0; j < fh; j++) for (let k = 0; k < fw; k++) { const q = (j * f.c.w + k) * 4; if (f.c.d[q + 3]) for (let b = 0; b < S; b++) for (let a = 0; a < S; a++) sh.set(cx + k * S + a + 2, cy + j * S + b + 2, [f.c.d[q], f.c.d[q + 1], f.c.d[q + 2]], f.c.d[q + 3]); }
    drawText(sh, cx + 2, cy + cell * S + 2, f.name.replace('c4_', '').replace(/_/g, ' ').slice(0, 20), [220, 220, 200]);
    sh.rect(cx, cy + cell * S, cell * S - 2, 1, [90, 100, 90]);
  });
  writeFileSync(resolve(outDir, name), sh.png()); console.log('ok', name);
}
const big = c4List.filter(f => f.c.w > 70 || f.c.h > 70 || /ground|scar|dust/.test(f.name));
const small = c4List.filter(f => !big.includes(f));
sheet('sheet_small_props.png', small, 6, 66);
sheet('sheet_large_props_decals.png', big, 3, 190);
