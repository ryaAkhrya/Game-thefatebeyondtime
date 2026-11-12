// Generator art DRAFT Kuil Jejak (area `temple`, Chapter III), Phase 7. Menulis:
//   public/assets/environment/temple/ground.png        dasar peta 1280x1280 (lantai, dinding, lukisan, lambang, cahaya, bayangan)
//   public/assets/environment/temple/props.png + .json atlas prop (kolom, pilar, cakram, alas, gerbang, Chronolith, patroli, dll.)
// Penempatan, collision, interaktif dan pemicu: src/game/data/maps/temple.map.mjs (satu sumber).
//   node scripts/gen-temple-art.mjs                aset game
//   node scripts/gen-temple-art.mjs --preview      + pratinjau ke docs/production/sprint3/temple-preview/
//   PREVIEW=x,y,w,h,zoom,out.png [PREVIEW_STATE=initial|solved|done]   pratinjau potongan kustom
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TEMPLE_W, TEMPLE_H, TEMPLE_ROOMS, TEMPLE_PROPS, TEMPLE_FOOT, TEMPLE_LAYOUT, TEMPLE_SOLIDS, TEMPLE_WALKABLE, TEMPLE_INTERACTABLES,
  TEMPLE_TRIGGERS, TEMPLE_GATE_SOLID, TEMPLE_BATTLE_RETURN, TEMPLE_SPAWN, TEMPLE_FROM_FOREST,
} from '../src/game/data/maps/temple.map.mjs';
import { Canvas, clamp, composePreview, encodePNG, hash, makeNoise, packAtlas, shade, writeFileDeep } from './lib/pixelkit.mjs';
import { buildTemple, drawGlyph, templePalette } from './lib/templeSprites.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/assets/environment/temple');
const previewDir = resolve(here, '../../docs/production/sprint3/temple-preview');
const P = templePalette();
const W = TEMPLE_W, H = TEMPLE_H;
const at = (R, i) => R[clamp(i, 0, R.length - 1)];

// ---------------------------------------------------------------- atlas
const sprites = buildTemple(P);
for (const [name, s] of Object.entries(sprites)) s.foot = TEMPLE_FOOT[name] ?? [0, 0];
const need = new Set(TEMPLE_PROPS.map((p) => p.type));
for (const t of need) if (!sprites[t]) throw new Error('prop tanpa sprite: ' + t);
for (const k of Object.keys(TEMPLE_FOOT)) if (!sprites[k]) throw new Error('FOOT tanpa sprite: ' + k);
const { atlas, json } = packAtlas(sprites, 768, { image: 'props.png', status: 'DRAFT' });
writeFileDeep(resolve(outDir, 'props.png'), encodePNG(atlas.w, atlas.h, atlas.d));
writeFileDeep(resolve(outDir, 'props.json'), JSON.stringify(json, null, 1));

// ---------------------------------------------------------------- klasifikasi ruang
const roomNames = Object.keys(TEMPLE_ROOMS);
const roomIdx = new Int8Array(W * H).fill(-1);
roomNames.forEach((n, i) => {
  const r = TEMPLE_ROOMS[n];
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) roomIdx[y * W + x] = i;
});
const isFloor = (x, y) => x >= 0 && y >= 0 && x < W && y < H && roomIdx[y * W + x] >= 0;
// kelas: 0 hampa, 1 lantai, 2 muka dinding, 3 tutup dinding
const cls = new Uint8Array(W * H);
const down = new Int16Array(W * H); // jarak ke lantai di bawah pada kolom yang sama (-1 bila terhalang)
for (let x = 0; x < W; x++) for (let y = H - 1; y >= 0; y--) {
  const i = y * W + x;
  down[i] = isFloor(x, y) ? 0 : y + 1 < H && down[i + W] >= 0 ? down[i + W] + 1 : -1;
}
for (let i = 0; i < W * H; i++) {
  const d = down[i];
  cls[i] = d === 0 ? 1 : d >= 1 && d <= 64 ? 2 : d > 64 && d <= 80 ? 3 : 0;
}
// tahap 2: bibir samping dan bawah (cap)
{
  const solidish = (x, y) => cls[y * W + x] !== 0;
  const add = [];
  for (let y = 0; y < H; y++) {
    let lastSolid = -1000;
    for (let x = 0; x < W; x++) { if (cls[y * W + x] && cls[y * W + x] !== 3) lastSolid = x; else if (!cls[y * W + x] && x - lastSolid <= 16) add.push(y * W + x); }
    lastSolid = 1e5;
    for (let x = W - 1; x >= 0; x--) { if (cls[y * W + x] && cls[y * W + x] !== 3) lastSolid = x; else if (!cls[y * W + x] && lastSolid - x <= 16) add.push(y * W + x); }
  }
  for (let x = 0; x < W; x++) {
    let last = -1000;
    for (let y = 0; y < H; y++) { if (cls[y * W + x] === 1 || cls[y * W + x] === 2) last = y; else if (!cls[y * W + x] && y - last <= 16) add.push(y * W + x); }
  }
  for (const i of add) if (!cls[i]) cls[i] = 3;
  void solidish;
}

const { vnoise } = makeNoise(1e9, 1);
const ground = new Canvas(W, H);
const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) ground.set(x, y, c); };
const get = (x, y) => ground.col(x, y);
const BASE = { court: 4, approach: 3, hall: 3, gate: 3, ante: 3, camp: 3, corr: 3, wchamber: 3, wdoor: 3, echamber: 3, edoor: 3 };

// ---------------------------------------------------------------- lantai
function distToWall(x, y, max = 40) {
  let best = max;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 1; k <= best; k++) if (!isFloor(x + dx * k, y + dy * k)) { best = k; break; }
  return best;
}
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const ri = roomIdx[y * W + x];
  if (ri < 0) continue;
  const room = roomNames[ri];
  if (room === 'approach') {
    // jalan setapak hutan: lumut + tanah terinjak + serasah
    const n = vnoise(x, y, 14, 3) * 0.6 + vnoise(x, y, 5, 4) * 0.4;
    const mid = Math.abs(x - 640) < 14 + (vnoise(x, y, 20, 5) - 0.5) * 10;
    let c = mid ? at(P.wood, 1 + (n > 0.55 ? 1 : 0) + (n > 0.8 ? 1 : 0)) : at(P.moss, 1 + (n > 0.38 ? 1 : 0) + (n > 0.62 ? 1 : 0));
    if (hash(x >> 1, y >> 1, 9) < 0.05) c = at(P.floor, 4);
    put(x, y, c);
    continue;
  }
  const base = BASE[room] ?? 3;
  const row = Math.floor(y / 16), off = (row % 2) * 16;
  const sx = Math.floor((x + off) / 32), lx = (x + off) % 32, ly = y % 16;
  const h = hash(sx, row, 11);
  let tone = base + (h < 0.13 ? -1 : h > 0.9 ? 1 : 0);
  const wallD = distToWall(x, y, 14);
  if (wallD <= 3) tone -= 2; else if (wallD <= 10) tone -= 1;
  // jalan terinjak di tengah (lebih terang dan hangat)
  let idx = tone;
  if (lx === 31 || ly === 15) idx = tone - 1;
  else if (ly === 0) idx = tone + 1;
  else if (hash(x >> 1, y >> 1, 12) < 0.09) idx = tone - 1;
  else if (hash(x, y, 13) > 0.985) idx = tone + 1;
  put(x, y, at(P.floor, idx));
}

// ---------------------------------------------------------------- dinding
// susunan batu: baris 16 px, lebar balok 22..38
const rowsN = Math.ceil(H / 16);
const blockStart = [];
for (let r = 0; r < rowsN; r++) {
  const arr = new Int16Array(W);
  let x = -Math.floor(hash(r, 1, 31) * 30), bi = 0;
  while (x < W) {
    const w = 22 + Math.floor(hash(r, bi, 32) * 16);
    for (let k = Math.max(0, x); k < Math.min(W, x + w); k++) arr[k] = x;
    bi++; x += w;
  }
  blockStart.push(arr);
}
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const k = cls[y * W + x];
  if (k === 2) {
    const d = down[y * W + x];
    const row = Math.floor(y / 16), ly = y - row * 16, bs = blockStart[row][x], lx = x - bs;
    const bh = hash(bs, row, 33);
    let idx = 2 + (bh < 0.2 ? -1 : bh > 0.84 ? 1 : 0);
    if (d <= 5) idx -= 1; else if (d >= 58) idx += 1;
    if (ly === 15 || lx === 0) idx = 1;
    else if (ly === 0) idx += 1;
    else if (lx === 1) idx += 1;
    else if (hash(x, y, 34) < 0.07) idx -= 1;
    else if (hash(x, y, 35) > 0.985) idx += 1;
    put(x, y, at(P.stone, idx));
  } else if (k === 3) {
    const d = down[y * W + x];
    let idx = 4;
    if (x % 32 === 0 || y % 24 === 0) idx = 3;
    else if (hash(x >> 1, y >> 1, 36) < 0.1) idx = 3;
    if (d === 65) idx = 6; // bibir terang di atas muka dinding
    put(x, y, at(P.stone, idx));
  }
}
// garis tepi luar dan lumut di tutup
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (cls[y * W + x] !== 3) continue;
  let edge = false;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H || cls[yy * W + xx] === 0) edge = true; }
  if (edge) put(x, y, P.stone[0]);
  else if (vnoise(x, y, 12, 37) > 0.7 && hash(x, y, 38) < 0.8) put(x, y, at(P.moss, 1 + (vnoise(x, y, 5, 39) > 0.5 ? 1 : 0)));
}
// lumut di kaki dinding dan tetesan dari tutup
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (cls[y * W + x] !== 2) continue;
  const d = down[y * W + x];
  const n = vnoise(x, 0, 9, 41);
  if (d <= 2 + n * 10 && vnoise(x, y, 6, 42) > 0.35 && hash(x, y, 43) < 0.9) put(x, y, at(P.moss, 1 + (d < 4 ? 0 : 1) + (hash(x, y, 44) > 0.85 ? 1 : 0)));
  else if (d >= 64 - n * 9 * (vnoise(x, 1, 20, 45) > 0.5 ? 1 : 0) && vnoise(x, y, 8, 46) > 0.45) put(x, y, at(P.moss, 1 + (hash(x, y, 47) > 0.6 ? 1 : 0)));
}
// hutan di luar jalan masuk
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (cls[y * W + x] !== 0) { continue; }
  if (y >= 1128) {
    const n = vnoise(x, y, 22, 51) * 0.55 + vnoise(x, y, 9, 52) * 0.45;
    const lightBias = ((x + y) % 7 === 0 ? 0 : 0);
    const idx = clamp(Math.floor(n * 5.2) - 1 + lightBias, 0, 4);
    put(x, y, at(P.leaf, idx));
  } else put(x, y, P.void);
}
// tepi hutan: pangkas pada tutup bawah
void shade;

// ---------------------------------------------------------------- bantu gambar
const lerpPts = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
function groove(x, y, dark = P.floor[1], light = P.floor[5]) { put(x, y, dark); const c = get(x + 1, y + 1); if (c && c.ramp === P.floor) put(x + 1, y + 1, light); }
function inlay(x, y, i = 2) { put(x, y, P.gold[i]); }
/** cincin lantai berlekuk dengan inlay emas pucat putus-putus */
function floorRing(cx, cy, rx, ry, opts = {}) {
  const n = Math.round((rx + ry) * 5);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let r = 1;
    if (opts.segments) r += (Math.floor((a / (Math.PI * 2)) * opts.segments) % 2 ? 1 : -1) * (opts.shift ?? 0) / rx;
    const x = Math.round(cx + Math.cos(a) * rx * r), y = Math.round(cy + Math.sin(a) * ry * r);
    groove(x, y);
    if (i % 4 < 3) inlay(x, y, (opts.tone ?? 2) + 1);
  }
}
function floorLine(a, b, opts = {}) {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(a[0] + ((b[0] - a[0]) * i) / n), y = Math.round(a[1] + ((b[1] - a[1]) * i) / n);
    if (opts.dash && i % opts.dash === opts.dash - 1) continue;
    groove(x, y);
    if (opts.inlay !== false) inlay(x, y, (opts.tone ?? 1) + 1);
  }
}
/** tambalan baru yang menutup garis ketiga: batu lebih terang, sambungan tidak sejajar, garis aksen Bitter Lime */
function patch(x0, y0, w, h, seed) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const row = Math.floor((y - y0) / 8), off = ((row + seed) % 2) * 6;
    const lx = (x - x0 + off) % 12, ly = (y - y0) % 8;
    put(x, y, at(P.floor, lx === 11 || ly === 7 ? 3 : ly === 0 || lx === 0 ? 6 : 5));
  }
  for (let x = x0; x < x0 + w; x++) { put(x, y0, P.lime[2]); put(x, y0 + h - 1, P.lime[1]); }
  for (let y = y0; y < y0 + h; y++) { put(x0, y, P.lime[1]); put(x0 + w - 1, y, P.lime[1]); }
}
function crackFloor(pts, shift = 0) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let k = 0; k <= n; k++) {
      const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n);
      const c = get(x, y);
      if (!c || c.ramp !== P.floor) continue;
      put(x, y, P.floor[0]);
      const c2 = get(x + 1, y), c3 = get(x - 1, y);
      if (c2 && c2.ramp === P.floor) put(x + 1, y, shade(c2, +shift ? 1 : -1));
      if (shift && c3 && c3.ramp === P.floor) put(x - 1, y, shade(c3, -1));
    }
  }
}
const brighten = (c) => (c && c.ramp ? shade(c, 1) : null);
const lit = (c) => (c && (c.ramp === P.floor || c.ramp === P.stone) ? P.lit[Math.min(6, c.i + (c.ramp === P.stone ? 1 : 1))] : null);
function lightMask(fn, soft = false) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = fn(x, y); // 0 di luar, 1 penuh, 0.5 tepi (dither)
    if (!v) continue;
    if (v < 1 && (x + y) % 2) continue;
    const c = get(x, y), l = soft ? brighten(c) : lit(c);
    if (l) put(x, y, l);
  }
}
function panel(x, y, w, h) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, P.plum[j < 2 ? 1 : 2 - (hash(x + i >> 2, y + j >> 2, 61) < 0.15 ? 1 : 0)]);
  for (let i = -2; i < w + 2; i++) { put(x + i, y - 2, P.stone[5]); put(x + i, y - 1, P.stone[4]); put(x + i, y + h, P.stone[1]); put(x + i, y + h + 1, P.stone[0]); }
  for (let j = -2; j < h + 2; j++) { put(x - 2, y + j, P.stone[5]); put(x - 1, y + j, P.stone[4]); put(x + w, y + j, P.stone[2]); put(x + w + 1, y + j, P.stone[1]); }
}
function arrow(x0, y0, x1, y1, col) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) { const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n); put(x, y, col); }
  const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
  put(x1 - dx * 2 + dy * 2, y1 - dy * 2 + dx * 2, col); put(x1 - dx * 2 - dy * 2, y1 - dy * 2 - dx * 2, col);
  put(x1 - dx + dy, y1 - dy + dx, col); put(x1 - dx - dy, y1 - dy - dx, col);
}
// ---------------------------------------------------------------- lukisan dinding dan relief
// A: urutan lambang 1 -> 2 -> 3 (garis ketiga dikikis) di dinding utara ruang pilar
panel(120, 786, 144, 38);
for (let i = 0; i < 3; i++) {
  const cx = 156 + i * 36;
  const tmp = new Canvas(40, 40);
  drawGlyph(tmp, 20, 8, i + 1, 3, { ring: P.gold[4], line: P.gold[3], rim: P.plum[1], third: P.plum[5] });
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) if (tmp.alpha(x, y) > 200) put(cx - 20 + x, 794 + y - 8 + 1, tmp.col(x, y));
  if (i < 2) arrow(cx + 12, 806, cx + 24, 806, P.gold[2]);
}
for (let i = 0; i < 3; i++) for (let k = 0; k <= i; k++) { put(150 + i * 36 + k * 4, 820, P.gold[2]); put(150 + i * 36 + k * 4, 821, P.gold[1]); } // titik hitung 1,2,3
// lukisan halaman (inspect_1): dua sosok menuju satu lingkaran, wajah digores
panel(440, 786, 96, 38);
{
  const fig = (cx, flip) => {
    for (let y = 0; y < 18; y++) for (let x = -3; x <= 3; x++) { const c = y < 6 ? (x * x + (y - 3) ** 2 <= 9 ? P.bronze[3] : null) : (Math.abs(x) <= (y < 8 ? 3 : 2 + (y > 12 ? 1 : 0)) ? P.bronze[y < 12 ? 2 : 1] : null); if (c) put(cx + x, 798 + y, c); }
    put(cx + (flip ? -2 : 2), 808, P.bronze[3]); put(cx + (flip ? -3 : 3), 809, P.bronze[3]);
    for (const [dx, dy] of [[-2, 0], [-1, 1], [0, 2], [1, 1], [2, 0], [2, 3], [1, 2], [-1, 2], [-2, 3]]) put(cx + dx, 799 + dy, P.plum[1]); // goresan
  };
  fig(462, false); fig(514, true);
  ringPx2(488, 804, 8, P.gold[3]); put(488, 804, P.gold[3]);
  for (let x = 470; x < 482; x += 2) put(x, 806, P.gold[1]); for (let x = 496; x < 508; x += 2) put(x, 806, P.gold[1]);
  for (let x = 442; x < 534; x += 4) put(x, 822, P.plum[3]);
}
function ringPx2(cx, cy, r, c) { for (let i = 0; i < 64; i++) { const a = (i / 64) * 6.283; put(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), c); } }
// relief di atas pintu barat (inspect_2): lingkaran dengan satu garis patah
for (let y = 874; y < 916; y++) for (let x = 326; x < 378; x++) put(x, y, at(P.stone, 3 + (x < 332 ? 1 : 0) + (y < 878 ? 1 : 0)));
for (let x = 326; x < 378; x++) { put(x, 873, P.stone[5]); put(x, 916, P.stone[1]); }
ringPx2(352, 892, 10, P.stone[1]); ringPx2(352, 892, 9, P.stone[1]); ringPx2(353, 893, 10, P.stone[5]);
for (let i = 0; i < 9; i++) { put(340 - 0 + i, 906 - i, P.stone[1]); put(341 + i, 906 - i, P.stone[5]); }
for (let i = 0; i < 6; i++) { put(361 + i, 903 - Math.round(i * 0.6), P.stone[1]); }
put(350, 898, P.gold[1]); put(354, 886, P.gold[1]);
// C: dua panel arah di dinding ruang gerbang (cincin + tiga garis menuju pusat; garis dari bawah = yang ditutup)
for (const cx of [508, 772]) {
  panel(cx - 60, 424, 120, 42);
  ringPx2(cx, 443, 7, P.gold[4]); ringPx2(cx, 443, 6, P.gold[3]);
  arrow(cx - 46, 443, cx - 12, 443, P.gold[3]); arrow(cx - 45, 444, cx - 12, 444, P.gold[2]);
  arrow(cx + 46, 443, cx + 12, 443, P.gold[3]); arrow(cx + 45, 444, cx + 12, 444, P.gold[2]);
  arrow(cx, 463, cx, 453, P.lime[3]); arrow(cx + 1, 463, cx + 1, 454, P.lime[1]);
  for (let x = cx - 56; x < cx + 56; x += 6) put(x, 428, P.plum[3]);
}
// B: ambang relief berulang di dinding timur laut (simbol yang berulang)
for (let x = 984; x < 1200; x += 24) {
  for (let y = 770; y < 786; y++) for (let k = 0; k < 14; k++) put(x + k, y, P.plum[2]);
  ringPx2(x + 7, 778, 4, P.gold[1]); put(x + 7, 778, P.gold[2]);
  if ((x / 24) % 3 === 0) { put(x + 3, 783, P.gold[1]); put(x + 11, 783, P.gold[1]); }
}

// ---------------------------------------------------------------- lambang lantai
const FC = TEMPLE_LAYOUT.floorCircle;
// halaman: lambang besar dengan garis ketiga ditutup tambalan baru
{
  const cx = 640, cy = 968;
  floorRing(cx, cy, 36, 25, { tone: 2 });
  floorRing(cx, cy, 50, 35, { segments: 8, shift: 2, tone: 1 }); // busur bergeser kuantisasi (retak waktu)
  floorLine([cx - 90, cy + 52], [cx - 18, cy + 17], { tone: 2 });
  floorLine([cx + 90, cy + 52], [cx + 18, cy + 17], { tone: 2 });
  floorLine([cx, cy + 62], [cx, cy + 28], { tone: 1, dash: 3 });
  patch(cx - 10, cy + 36, 20, 22, 1);
  crackFloor([[cx + 40, cy - 40], [cx + 46, cy - 24], [cx + 38, cy - 8], [cx + 44, cy + 6]], 1);
}
// ruang gerbang: lingkaran di lantai dengan tiga garis menuju alas (garis selatan ditutup)
{
  const [cx, cy] = [FC.x, FC.y];
  floorRing(cx, cy, 34, 24, { tone: 3 });
  floorRing(cx, cy, 24, 17, { tone: 1 });
  floorLine([cx - 36, cy], [cx - 64, cy], { tone: 2 }); floorLine([cx + 36, cy], [cx + 64, cy], { tone: 2 });
  floorLine([cx, cy + 25], [cx, cy + 42], { tone: 1, dash: 3 });
  patch(cx - 9, cy + 30, 18, 14, 0);
  // serpihan retak kuantisasi
  crackFloor([[cx - 90, cy + 40], [cx - 80, cy + 56], [cx - 86, cy + 72]], 1);
}
// aula: lambang raksasa di bawah Chronolith, busur bergeser
{
  const cx = 640, cy = 300;
  floorRing(cx, cy, 120, 74, { tone: 1 });
  floorRing(cx, cy, 96, 58, { segments: 12, shift: 3, tone: 2 });
  floorRing(cx, cy, 70, 42, { tone: 1 });
  floorLine([cx - 250, cy + 100], [cx - 128, cy + 28], { tone: 1 });
  floorLine([cx + 250, cy + 100], [cx + 128, cy + 28], { tone: 1 });
  floorLine([cx, cy + 110], [cx, cy + 76], { tone: 0, dash: 3 });
}
// ruang segel: lingkaran kecil di bawah lampu yang berhenti
{
  floorRing(1070, 1010, 40, 28, { tone: 2 }); floorRing(1070, 1010, 27, 19, { tone: 1 });
  floorLine([1040, 1010], [1043, 1010], { tone: 2 });
}
// ruang pilar: lingkaran pusat tempat tiga pilar menghadap
{
  floorRing(192, 960, 62, 40, { tone: 1 });
  floorRing(192, 960, 8, 6, { tone: 2 });
}
// jejak "dua jalur" dari jalan masuk menuju gerbang (hampir bertemu): dua garis putus-putus emas pucat
for (const side of [-1, 1]) {
  const pts = [[640 + side * 18, 1270], [640 + side * 16, 1130], [640 + side * 14, 1090], [640 + side * 62, 1010], [640 + side * 62, 900], [640 + side * 24, 832], [640 + side * 20, 740], [640 + side * 54, 700], [640 + side * 54, 520], [640 + side * 8, 500], [640 + side * 5, 400]];
  for (let i = 0; i + 1 < pts.length; i++) floorLine(pts[i], pts[i + 1], { tone: 0, dash: 4, inlay: true });
}

// ---------------------------------------------------------------- retakan dan serasah, jelaga perkemahan
crackFloor([[420, 856], [430, 870], [424, 884], [436, 900]], 0);
crackFloor([[820, 1050], [832, 1062], [826, 1076]], 1);
crackFloor([[330, 1040], [342, 1052], [338, 1068], [350, 1082]], 1);
crackFloor([[1080, 900], [1090, 918], [1084, 934]], 0);
crackFloor([[430, 520], [444, 530], [436, 544]], 1);
crackFloor([[780, 240], [790, 262], [782, 280], [792, 300]], 1);
crackFloor([[500, 160], [510, 178], [504, 196]], 0);
{
  const cx = 960, cy = 640;
  for (let y = cy - 18; y <= cy + 18; y++) for (let x = cx - 40; x <= cx + 40; x++) {
    const d = ((x - cx) / 38) ** 2 + ((y - cy) / 15) ** 2;
    const c = get(x, y);
    if (!c || c.ramp !== P.floor) continue;
    if (d < 0.55) put(x, y, at(P.floor, c.i - 2)); else if (d < 1 && (x + y) % 2 === 0) put(x, y, at(P.floor, c.i - 1));
  }
}
// serasah dan lumut tebal di halaman (area terbuka)
for (let y = 832; y < 1120; y++) for (let x = 384; x < 896; x++) {
  const c = get(x, y);
  if (!c || c.ramp !== P.floor) continue;
  const m = vnoise(x, y, 26, 71) * 0.7 + vnoise(x, y, 9, 72) * 0.3;
  if (m > 0.72 && hash(x >> 1, y, 73) < 0.85) put(x, y, at(P.moss, clamp(c.i - 1, 1, 3) - (m > 0.8 ? 0 : 1)));
  else if (m < 0.2 && hash(x, y, 74) < 0.05) put(x, y, at(P.bronze, 1 + (hash(x, y, 75) > 0.5 ? 1 : 0)));
}
for (const [x0, y0, x1, y1] of [[64, 832, 320, 1120], [960, 832, 1216, 1120], [416, 480, 864, 736], [320, 128, 960, 400]]) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const c = get(x, y);
    if (!c || c.ramp !== P.floor) continue;
    const m = vnoise(x, y, 20, 76);
    if (m > 0.74 && hash(x >> 1, y >> 1, 77) < 0.8 && distToWall(x, y, 30) < 28) put(x, y, at(P.moss, 1 + (m > 0.84 ? 1 : 0)));
  }
}

// ---------------------------------------------------------------- cahaya
// aula: tiga tiang cahaya dari celah atap (pucat, tepi berdither)
const spot = (cx, cy, rx, ry) => (x, y) => { const d = Math.hypot((x - cx) / rx, (y - cy) / ry); return d < 0.8 ? 1 : d < 1 ? 0.5 : 0; };
{
  const spots = [spot(470, 220, 44, 24), spot(812, 250, 40, 22), spot(640, 372, 52, 16)];
  lightMask((x, y) => (y > 128 && y < 400 ? Math.max(...spots.map((f) => f(x, y))) : 0), true);
}
// halaman: dua bercak cahaya siang
{
  const spots = [spot(500, 940, 50, 22), spot(760, 1030, 46, 20), spot(640, 1190, 26, 70)];
  lightMask((x, y) => Math.max(...spots.map((f) => f(x, y))), true);
}
// ruang segel: tiang cahaya dari lampu yang berhenti menuju cakram ketiga (jawaban teka-teki B)
{
  const S0 = [1070, 966], T = [1152, 818];
  const dx = T[0] - S0[0], dy = T[1] - S0[1], len = Math.hypot(dx, dy);
  lightMask((x, y) => {
    if (y < 784 || y > 972) return 0;
    const t = ((x - S0[0]) * dx + (y - S0[1]) * dy) / (len * len);
    if (t < 0 || t > 1.12) return 0;
    const px = S0[0] + dx * t, py = S0[1] + dy * t;
    const dist = Math.hypot(x - px, y - py);
    const hw = 3 + t * 15;
    return dist < hw - 2 ? 1 : dist < hw ? 0.5 : 0;
  });
  // bercak pada dinding di sekitar cakram ketiga
  lightMask((x, y) => (y >= 788 && y <= 832 ? spot(1152, 812, 26, 26)(x, y) : 0));
  // debu cahaya yang berhenti: titik-titik sepanjang tiang
  for (let i = 1; i < 9; i++) { const t = i / 9.5; put(Math.round(S0[0] + dx * t + (i % 2 ? 7 : -8)), Math.round(S0[1] + dy * t + (i % 3) * 2), P.gold[3]); }
}
// ruang gerbang: cahaya tipis dari sela gerbang yang tertutup
lightMask((x, y) => (y >= 480 && y < 520 ? spot(640, 484, 30, 14)(x, y) : 0), true);

// ---------------------------------------------------------------- bayangan prop (jatuh ke kanan-bawah)
const SHADOW = {
  column: [18, 5, 12, 1], column_broken: [16, 5, 8, 1], column_cracked: [18, 5, 12, 1], column_ringed: [18, 5, 12, 1], column_fallen: [40, 6, 6, 2],
  statue_guard: [20, 6, 12, 1], brazier_cold: [12, 4, 5, 0], fire_a: [26, 7, 4, 1], crate_stack: [24, 6, 6, 1], log_seat: [20, 4, 3, 1],
  pillar_a1_off: [18, 5, 11, 1], pillar_a2_off: [18, 5, 11, 1], pillar_a3_off: [18, 5, 11, 1], dial_3_frozen: [20, 6, 7, 2], dial_1_frozen: [20, 6, 7, 2], dialm_2_frozen: [20, 6, 7, 2],
  lamp_frozen: [10, 4, 4, 1], chronolith_dormant: [78, 12, 18, 2], plinth: [16, 4, 6, 1], note_lectern: [14, 4, 5, 1], sign_back: [8, 3, 3, 0],
  shrub: [24, 6, 6, 1], rubble_a: [20, 4, 3, 1], pack: [10, 3, 3, 0], chips_a: [0, 0, 0, 0],
};
{
  const map = new Uint8Array(W * H);
  const add = (cx, cy, rx, ry) => {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      const lv = d < 0.72 ? 2 : d < 1 && (d < 0.86 || (x + y) % 2 === 0) ? 1 : 0;
      if (lv > map[y * W + x]) map[y * W + x] = lv;
    }
  };
  for (const p of TEMPLE_PROPS) { const s = SHADOW[p.type]; if (s && s[0]) add(p.x + s[2], p.y + s[3], s[0], s[1]); }
  for (const e of [[640, 296, 76, 12], [1070, 1010, 14, 5]]) void e;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const lv = map[y * W + x];
    if (!lv || cls[y * W + x] !== 1) continue;
    const c = get(x, y);
    if (c && c.ramp) put(x, y, shade(c, -lv));
  }
}
void TEMPLE_SOLIDS; void TEMPLE_WALKABLE;

writeFileDeep(resolve(outDir, 'ground.png'), encodePNG(W, H, ground.d));
console.log(`temple props.png ${atlas.w}x${atlas.h} (${Object.keys(sprites).length} sprite), ground.png ${W}x${H}, ${TEMPLE_PROPS.length} prop`);

// ---------------------------------------------------------------- pratinjau
function propsFor(state) {
  const solved = state === 'solved' || state === 'done';
  const out = [];
  for (const p of TEMPLE_PROPS) {
    let type = p.type;
    if (solved) {
      if (/^a_pillar_/.test(p.id) || p.id === 'b_disc_3') type = type.replace('_off', '_on');
      if (p.id === 'c_dial_l') type = 'dial_1_on'; if (p.id === 'c_dial_r') type = 'dial_3_on'; if (p.id === 'c_dial_m') type = 'dialm_0_on';
      if (p.id === 'gate') type = 'gate_open';
      if (p.id.startsWith('gate_lamp')) type = 'gate_lamp_on';
    } else if (p.id.startsWith('c_dial')) type = p.type.replace('_frozen', '_off');
    if (state === 'done') {
      if (p.id === 'chronolith') type = 'chronolith_still';
      if (p.id.startsWith('patrol')) continue;
    }
    out.push({ x: p.x, y: p.y, sprite: sprites[type], depth: p.y + (/^chips|^wisplet/.test(type) ? 0 : 0) });
  }
  return out;
}
function groundCanvas() { const g = new Canvas(W, H); g.d.set(ground.d); return g; }
function render(rect, zoom, state) {
  const g = groundCanvas();
  const list = propsFor(state).map((p) => ({ x: p.x, y: p.y, sprite: p.sprite }));
  return composePreview(g, list, rect, zoom);
}
function savePng(big, path) { writeFileDeep(path, encodePNG(big.w, big.h, big.d)); console.log('preview', path); }
function rectOutline(cv, r, col, a = 255) {
  for (let x = r.x; x < r.x + r.w; x++) { cv.set(x, r.y, col, a); cv.set(x, r.y + r.h - 1, col, a); }
  for (let y = r.y; y < r.y + r.h; y++) { cv.set(r.x, y, col, a); cv.set(r.x + r.w - 1, y, col, a); }
}
function collisionOverlay(rect, zoom) {
  const big = render(rect, 1, 'initial');
  const g = new Canvas(big.w, big.h); g.d.set(big.d);
  // sel walkable 8 px (pusat sel di dalam persegi) dikurangi kaki prop
  const blocked = (gx, gy) => TEMPLE_SOLIDS.some((s) => gx * 8 < s.x + s.w && gx * 8 + 8 > s.x && gy * 8 < s.y + s.h && gy * 8 + 8 > s.y);
  for (let gy = Math.floor(rect.y / 8); gy < Math.ceil((rect.y + rect.h) / 8); gy++) for (let gx = Math.floor(rect.x / 8); gx < Math.ceil((rect.x + rect.w) / 8); gx++) {
    const cx = gx * 8 + 4, cy = gy * 8 + 4;
    const walk = TEMPLE_WALKABLE.some((w) => cx >= w.x && cx <= w.x + w.w && cy >= w.y && cy <= w.y + w.h);
    const gate = cx >= TEMPLE_GATE_SOLID.x && cx < TEMPLE_GATE_SOLID.x + TEMPLE_GATE_SOLID.w && cy >= TEMPLE_GATE_SOLID.y && cy < TEMPLE_GATE_SOLID.y + TEMPLE_GATE_SOLID.h;
    const col = walk && !blocked(gx, gy) && !gate ? [60, 220, 90] : walk ? [240, 60, 60] : null;
    if (!col) continue;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) g.set(gx * 8 + i - rect.x, gy * 8 + j - rect.y, col, 70);
  }
  for (const s of TEMPLE_SOLIDS) rectOutline(g, { x: s.x - rect.x, y: s.y - rect.y, w: s.w, h: s.h }, [255, 90, 90]);
  rectOutline(g, { x: TEMPLE_GATE_SOLID.x - rect.x, y: TEMPLE_GATE_SOLID.y - rect.y, w: TEMPLE_GATE_SOLID.w, h: TEMPLE_GATE_SOLID.h }, [255, 160, 40]);
  for (const i of TEMPLE_INTERACTABLES) rectOutline(g, { x: i.x - rect.x, y: i.y - rect.y, w: i.w, h: i.h }, [80, 170, 255]);
  for (const t of TEMPLE_TRIGGERS) rectOutline(g, { x: t.x - rect.x, y: t.y - rect.y, w: t.w, h: t.h }, [255, 230, 60]);
  for (const s of [TEMPLE_SPAWN, TEMPLE_FROM_FOREST, ...Object.values(TEMPLE_BATTLE_RETURN)]) rectOutline(g, { x: s.x - rect.x - 3, y: s.y - rect.y - 3, w: 6, h: 6 }, [255, 255, 255]);
  const out = new Canvas(rect.w * zoom, rect.h * zoom);
  for (let y = 0; y < rect.h; y++) for (let x = 0; x < rect.w; x++) {
    const i = (y * rect.w + x) * 4;
    for (let a = 0; a < zoom; a++) for (let b = 0; b < zoom; b++) { const j = ((y * zoom + a) * out.w + x * zoom + b) * 4; out.d[j] = g.d[i]; out.d[j + 1] = g.d[i + 1]; out.d[j + 2] = g.d[i + 2]; out.d[j + 3] = 255; }
  }
  return out;
}
if (process.env.PREVIEW) {
  const [x, y, w, h, z, out] = process.env.PREVIEW.split(',');
  savePng(render({ x: +x, y: +y, w: +w, h: +h }, +z, process.env.PREVIEW_STATE ?? 'initial'), out);
}
if (process.argv.includes('--preview')) {
  const full = { x: 0, y: 0, w: W, h: H };
  savePng(render(full, 1, 'initial'), resolve(previewDir, 'map_initial.png'));
  savePng(render(full, 1, 'done'), resolve(previewDir, 'map_done.png'));
  savePng(collisionOverlay(full, 1), resolve(previewDir, 'map_collision.png'));
  const rooms = { court: [384, 760, 520, 400], west: [48, 760, 340, 380], east: [940, 760, 300, 380], ante: [400, 396, 680, 360], hall: [300, 56, 680, 360], approach: [540, 1080, 200, 200] };
  for (const [name, [x, y, w, h]] of Object.entries(rooms)) {
    savePng(render({ x, y, w, h }, 2, name === 'hall' ? 'done' : 'initial'), resolve(previewDir, `room_${name}.png`));
  }
  savePng(render({ x: 400, y: 396, w: 680, h: 360 }, 2, 'solved'), resolve(previewDir, 'room_ante_solved.png'));
  savePng(collisionOverlay({ x: 0, y: 700, w: 1280, h: 580 }, 1), resolve(previewDir, 'collision_south.png'));
  savePng(collisionOverlay({ x: 300, y: 56, w: 780, h: 700 }, 1), resolve(previewDir, 'collision_north.png'));
}
void hash;
