// Generator art DRAFT Warden Fortress (area `fortress`, Chapter IV), Phase 8. Menulis:
//   public/assets/environment/fortress/ground.png        dasar peta 1792x2432 (lantai, dinding berkedalaman, pola lantai, cahaya, bayangan)
//   public/assets/environment/fortress/props.png + .json atlas prop (93 frame, pivot per frame, `foot` per frame)
// Penempatan, collision, interaktif dan pemicu: src/game/data/maps/fortress.map.mjs (satu sumber).
//   node scripts/gen-fortress-art.mjs                         aset game
//   node scripts/gen-fortress-art.mjs --preview               + pratinjau ke docs/production/sprint4/fortress-contact-sheets/
//   PREVIEW=x,y,w,h,zoom,out.png [PREVIEW_STATE=initial|open]  pratinjau potongan kustom
// Identitas: benteng batu tua yang berat (blok besar, tiang penopang, muka dinding 64 px), BUKAN Kuil Jejak berpalet lain.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FORTRESS_W, FORTRESS_H, FORTRESS_ROOMS, FORTRESS_PROPS, FORTRESS_FOOT, FORTRESS_SOLIDS, FORTRESS_WALKABLE, FORTRESS_INTERACTABLES, FORTRESS_TRIGGERS,
  FORTRESS_DYNAMIC, FORTRESS_INITIAL_DYNAMIC, FORTRESS_BATTLE_RETURN, FORTRESS_SPAWN, FORTRESS_STAGE, FORTRESS_LAYOUT,
} from '../src/game/data/maps/fortress.map.mjs';
import { Canvas, clamp, composePreview, encodePNG, hash, packAtlas, shade, writeFileDeep } from './lib/pixelkit.mjs';
import { buildFortress, fortressPalette } from './lib/fortressSprites.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/assets/environment/fortress');
const previewDir = resolve(here, '../../docs/production/sprint4/fortress-contact-sheets');
const P = fortressPalette();
const W = FORTRESS_W, H = FORTRESS_H;
const at = (R, i) => R[clamp(Math.round(i), 0, R.length - 1)];

// ---------------------------------------------------------------- atlas
const sprites = buildFortress(P);
for (const [name, s] of Object.entries(sprites)) s.foot = FORTRESS_FOOT[name] ?? [0, 0];
for (const t of new Set(FORTRESS_PROPS.map((p) => p.type))) if (!sprites[t]) throw new Error('prop tanpa sprite: ' + t);
for (const k of Object.keys(FORTRESS_FOOT)) if (!sprites[k]) throw new Error('FOOT tanpa sprite: ' + k);
const { atlas, json } = packAtlas(sprites, 1024, { image: 'props.png', status: 'DRAFT' });
writeFileDeep(resolve(outDir, 'props.png'), encodePNG(atlas.w, atlas.h, atlas.d));
writeFileDeep(resolve(outDir, 'props.json'), JSON.stringify(json, null, 1));

// ---------------------------------------------------------------- klasifikasi ruang
const roomNames = Object.keys(FORTRESS_ROOMS);
const roomIdx = new Int8Array(W * H).fill(-1);
roomNames.forEach((n, i) => {
  const r = FORTRESS_ROOMS[n];
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) roomIdx[y * W + x] = i;
});
const isFloor = (x, y) => x >= 0 && y >= 0 && x < W && y < H && roomIdx[y * W + x] >= 0;
// kelas: 0 hampa, 1 lantai, 2 muka dinding, 3 tutup dinding
const cls = new Uint8Array(W * H);
const down = new Int16Array(W * H); // jarak ke lantai di bawah pada kolom yang sama (-1 bila terhalang)
const dr = new Int8Array(W * H).fill(-1); // ruang lantai di bawah muka dinding
for (let x = 0; x < W; x++) for (let y = H - 1; y >= 0; y--) {
  const i = y * W + x;
  if (isFloor(x, y)) { down[i] = 0; dr[i] = roomIdx[i]; }
  else if (y + 1 < H && down[i + W] >= 0) { down[i] = down[i + W] + 1; dr[i] = dr[i + W]; }
  else down[i] = -1;
}
for (let i = 0; i < W * H; i++) {
  const d = down[i];
  cls[i] = d === 0 ? 1 : d >= 1 && d <= 64 ? 2 : d > 64 && d <= 80 ? 3 : 0;
}
{
  const add = [];
  for (let y = 0; y < H; y++) {
    let last = -1000;
    for (let x = 0; x < W; x++) { if (cls[y * W + x] && cls[y * W + x] !== 3) last = x; else if (!cls[y * W + x] && x - last <= 16) add.push(y * W + x); }
    last = 1e5;
    for (let x = W - 1; x >= 0; x--) { if (cls[y * W + x] && cls[y * W + x] !== 3) last = x; else if (!cls[y * W + x] && last - x <= 16) add.push(y * W + x); }
  }
  for (let x = 0; x < W; x++) {
    let last = -1000;
    for (let y = 0; y < H; y++) { if (cls[y * W + x] === 1 || cls[y * W + x] === 2) last = y; else if (!cls[y * W + x] && y - last <= 16) add.push(y * W + x); }
  }
  for (const i of add) if (!cls[i]) cls[i] = 3;
}

const ground = new Canvas(W, H);
const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) ground.set(x, y, c); };
const get = (x, y) => ground.col(x, y);
const onFloor = (x, y) => x >= 0 && y >= 0 && x < W && y < H && cls[y * W + x] === 1;
const F = P.floor, S = P.stone, M = P.metal, L = P.lime, PL = P.plum;

// ---------------------------------------------------------------- jarak ke dinding (arah) untuk bayangan tepi
function dist(x, y, dx, dy, max) {
  for (let k = 1; k <= max; k++) if (!isFloor(x + dx * k, y + dy * k)) return k;
  return max + 1;
}

// ---------------------------------------------------------------- lantai
/** Lantai batu berpapan besar bertumpuk (stagger) dengan sambungan gelap dan bevel terang kiri-atas. */
function flags(x, y, sw, sh, stagger, seed, base) {
  const row = Math.floor(y / sh), off = (row % 2) * stagger;
  const sx = Math.floor((x + off) / sw), lx = (x + off) % sw, ly = y % sh;
  const h = hash(sx, row, seed);
  const tone = base + (h < 0.16 ? -1 : h > 0.88 ? 1 : 0);
  if (lx === sw - 1 || ly === sh - 1) return 0;
  // serpihan sudut: sebagian papan memiliki sudut kanan-bawah yang terkelupas (bentuk, bukan bintik acak)
  if (hash(sx, row, seed + 5) < 0.14 && lx > sw - 8 && ly > sh - 6 && (lx - (sw - 8)) + (ly - (sh - 6)) > 6) return tone - 1;
  if (lx === 0 || ly === 0) return tone + 1;
  return tone;
}
function planks(x, y, seed, base) {
  const rowH = 10, row = Math.floor(y / rowH), ly = y % rowH, len = 72, off = Math.floor(hash(row, 3, seed) * len);
  const sx = Math.floor((x + off) / len), lx = (x + off) % len;
  const h = hash(sx, row, seed + 1);
  if (ly === rowH - 1 || lx === len - 1) return 0;
  const tone = base + (h < 0.25 ? -1 : h > 0.85 ? 1 : 0);
  if (ly === 0) return tone + 1;
  if ((lx === 3 || lx === len - 5) && (ly === 4)) return 3; // paku
  return tone;
}
function cobbles(x, y, seed, base) {
  const rh = 9, row = Math.floor(y / rh), off = (row % 2) * 6 + Math.floor(hash(row, 2, seed) * 5);
  const bw = 12, sx = Math.floor((x + off) / bw), lx = (x + off) % bw, ly = y % rh;
  const h = hash(sx, row, seed + 3);
  if (lx === bw - 1 || ly === rh - 1) return 0;
  const tone = base + (h < 0.3 ? -1 : h > 0.78 ? 1 : 0);
  if (lx === 0 || ly === 0) return tone + 1;
  return tone;
}
const BASE = { approach: 2, outer: 2, gatehall: 2, bellhall: 2, bdoor: 2, barracks: 1, adoor: 2, archive: 1, tdoor: 2, trial: 1, sdoor: 2, rift: 2, serambi: 2, hdoor: 2, heart: 2, scdoor: 2, sc_v: 2, sc_land: 2, edoor: 1, echo: 1 };

for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const ri = roomIdx[y * W + x];
  if (ri < 0) continue;
  const room = roomNames[ri];
  let idx;
  switch (room) {
    case 'approach': {
      const mid = Math.abs(x - 896) < 56;
      idx = cobbles(x, y, 11, mid ? 2 : 1);
      break;
    }
    case 'outer': {
      const lane = x >= 840 && x < 952;
      idx = flags(x, y, 64, 40, 32, 21, lane ? 1 : 2);
      break;
    }
    case 'barracks': idx = planks(x, y, 31, 2); break;
    case 'archive': {
      const cx = Math.floor(x / 32), cy = Math.floor(y / 32), lx = x % 32, ly = y % 32;
      idx = (cx + cy) % 2 === 0 ? 1 : 2;
      if (lx === 31 || ly === 31) idx = 0; else if (lx === 0 || ly === 0) idx += 1;
      break;
    }
    case 'trial': case 'echo': case 'edoor': idx = flags(x, y, 64, 64, 0, 41, room === 'echo' ? 1 : 1); break;
    case 'rift': idx = flags(x, y, 64, 32, 32, 51, 2); break;
    case 'bellhall': idx = flags(x, y, 48, 32, 24, 61, 2); break;
    case 'heart': idx = flags(x, y, 64, 32, 32, 71, 2); break;
    default: idx = flags(x, y, room === 'gatehall' || room === 'adoor' ? 32 : 48, 32, 24, 81, BASE[room] ?? 2);
  }
  put(x, y, at(F, idx));
}

// ---------------------------------------------------------------- dinding (muka berblok besar, tiang penopang, tutup)
// blok tiap baris 16 px tinggi: lebar 36..60, stagger menurut baris
const COURSES = 4;
const blockStart = [];
for (let r = 0; r < COURSES; r++) {
  const arr = new Int16Array(W);
  let x = -Math.floor(hash(r, 1, 91) * 40), bi = 0;
  while (x < W) {
    const w = 36 + Math.floor(hash(r, bi, 92) * 24);
    for (let k = Math.max(0, x); k < Math.min(W, x + w); k++) arr[k] = x;
    bi++; x += w;
  }
  blockStart.push(arr);
}
// tiang penopang (pilaster) dan tempat yang dilarang karena ada hiasan dinding
const WALL_TYPES = new Set(['torch_a', 'torch_b', 'banner_a', 'banner_b', 'window_arch_0', 'heart_emblem_sealed', 'memorial_niche', 'name_wall', 'dial_wall', 'slit_window', 'door_iron_closed', 'door_heart_closed']);
const keepOut = FORTRESS_PROPS.filter((p) => WALL_TYPES.has(p.type)).map((p) => ({ x0: p.x - sprites[p.type].c.w / 2 - 6, x1: p.x + sprites[p.type].c.w / 2 + 6, y: p.y }));
const piers = [];
for (const [n, r] of Object.entries(FORTRESS_ROOMS)) {
  if (r.w < 150 || ['approach'].includes(n)) continue;
  for (let px = r.x + 40; px + 28 <= r.x + r.w - 40; px += 128) {
    if (keepOut.some((k) => Math.abs(k.y - r.y) < 60 && px + 28 > k.x0 && px < k.x1)) continue;
    piers.push({ x: px, room: roomNames.indexOf(n) });
  }
}
const pierAt = (x, room) => piers.find((p) => p.room === room && x >= p.x && x < p.x + 28);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x, k = cls[i];
  if (k === 2) {
    const d = down[i]; // 1..64 dari lantai ke atas
    const course = Math.floor((d - 1) / 16), ty = 15 - ((d - 1) % 16);
    const bs = blockStart[course][x], lx = x - bs;
    const bh = hash(bs, course, 93);
    let idx = 3 + (bh < 0.2 ? -1 : bh > 0.84 ? 1 : 0);
    if (d <= 6) idx -= 1; else if (d >= 60) idx -= 1;
    const pr = pierAt(x, dr[i]);
    if (pr) {
      const u = (x - pr.x) / 27;
      idx = u < 0.14 ? 5 : u < 0.5 ? 4 : u < 0.8 ? 3 : 2;
      if (d >= 50 && d < 56) idx += 1; // capital
      if (d >= 56 && d <= 58) idx -= 2;
      if (d <= 8) idx += 1; // plinth
      if ((d - 1) % 16 === 15) idx -= 1;
      put(x, y, at(S, idx));
      continue;
    }
    if (ty === 15 || lx === 0) idx = 1;
    else if (ty === 0 || lx === 1) idx += 1;
    // retakan pendek dan serpihan terkelupas per blok (bentuk deterministik, bukan bintik)
    else if (hash(bs, course, 94) < 0.16 && lx > 6 && lx < 12 && ty > 4 && ty < 11 && (lx + ty) % 3 === 0) idx -= 1;
    put(x, y, at(S, idx));
  } else if (k === 3) {
    const d = down[i];
    let idx = 4;
    if (x % 40 === 0 || y % 28 === 0) idx = 3;
    if (d === 65) idx = 5; // bibir terang di atas muka dinding
    put(x, y, at(S, idx));
  } else if (k === 0) put(x, y, S[0]);
}
// garis tepi luar tutup
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (cls[y * W + x] !== 3) continue;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H || cls[yy * W + xx] === 0) { put(x, y, S[1]); break; } }
}
// bibir bawah muka dinding: garis gelap 1 px di perbatasan dengan lantai
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (cls[y * W + x] === 2 && down[y * W + x] === 1) put(x, y, S[0]);

// ---------------------------------------------------------------- pola lantai yang bermakna
const ell = (cx, cy, rx, ry, col, step = 1) => {
  const n = Math.round((rx + ry) * 5);
  for (let i = 0; i < n; i += step) { const a = (i / n) * Math.PI * 2; const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry); if (onFloor(x, y)) put(x, y, col); }
};
const ellDash = (cx, cy, rx, ry, col, dash, gap) => {
  const n = Math.round((rx + ry) * 5);
  for (let i = 0; i < n; i++) if (i % (dash + gap) < dash) { const a = (i / n) * Math.PI * 2; const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry); if (onFloor(x, y)) put(x, y, col); }
};
const groove = (cx, cy, rx, ry, lit = F[3], dark = F[0]) => {
  ell(cx, cy, rx, ry, dark); ell(cx, cy, rx - 1, ry - 0.6, dark); ell(cx + 1, cy + 1, rx, ry, lit);
};
const seg = (x0, y0, x1, y1, col) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) { const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n); if (onFloor(x, y)) put(x, y, col); } };
const lineBand = (x0, y0, x1, y1, w, col, hi) => { for (let k = 0; k < w; k++) seg(x0, y0 + k, x1, y1 + k, col); if (hi) seg(x0, y0 - 1, x1, y1 - 1, hi); };

// Gerbang Luar: lajur prosesi bergaris kuningan dan cakram jaga pudar di tengah halaman
{
  for (let y = 1990; y < 2304; y += 64) { put(840, y, M[2]); put(951, y, M[2]); put(841, y, M[3]); put(950, y, M[3]); }
  lineBand(840, 1990, 840, 2304, 1, M[1]); lineBand(951, 1990, 951, 2304, 1, M[1]);
  groove(896, 2160, 118, 66); groove(896, 2160, 92, 51);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; seg(Math.round(896 + Math.cos(a) * 92), Math.round(2160 + Math.sin(a) * 51), Math.round(896 + Math.cos(a) * 112), Math.round(2160 + Math.sin(a) * 63), F[0]); }
  ell(896, 2160, 14, 8, M[1]);
}
// Lorong gerbang: alur jeruji (gerbang jatuh) melintang
{ for (let x = 832; x < 960; x++) for (let k = 0; k < 6; k++) put(x, 1976 + k, F[k === 0 ? 1 : 0]); }
// Aula Lonceng: lantai penunjuk waktu dengan cincin kuningan, 12 tanda jam, dan empat soket pilar
{
  const c = FORTRESS_LAYOUT.sundial;
  groove(c.x, c.y, 248, 140, F[3], F[0]); ell(c.x, c.y, 247, 139, M[1]); ell(c.x + 1, c.y - 1, 246, 138, M[2]);
  groove(c.x, c.y, 200, 114, F[3], F[0]); ell(c.x, c.y, 199, 113.5, M[1]);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; seg(Math.round(c.x + Math.cos(a) * 200), Math.round(c.y + Math.sin(a) * 114), Math.round(c.x + Math.cos(a) * 246), Math.round(c.y + Math.sin(a) * 139), M[1]); }
  for (const p of FORTRESS_PROPS.filter((q) => q.id.startsWith('seal_'))) { for (let k = 0; k < 8; k++) for (let j = 0; j < 4; j++) put(p.x - 16 + k * 4 - 0, p.y - 2 + j, F[0]); }
  ellDash(c.x, c.y, 150, 85, F[0], 6, 6);
}
// Barak: karpet usang di tengah meja
{
  const x0 = 250, y0 = 1700, w = 128, h = 66;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (!onFloor(x, y)) continue;
    const edge = x < x0 + 3 || x >= x0 + w - 3 || y < y0 + 3 || y >= y0 + h - 3;
    const mid = (Math.floor((x - x0) / 8) + Math.floor((y - y0) / 8)) % 2 === 0;
    put(x, y, edge ? M[1] : mid ? PL[0] : P.plum[0]);
    if (!edge && ((x - x0) % 16 === 8) && ((y - y0) % 16 === 8)) put(x, y, M[1]);
  }
}
// Arsip: karpet pembuka jalan dari pintu menuju pusaka, bergaris kuningan dan berlian di tengah
{
  const x0 = 272, x1 = 336;
  for (let y = 1256; y < 1504; y++) for (let x = x0; x < x1; x++) {
    if (!onFloor(x, y)) continue;
    const edge = x < x0 + 3 || x >= x1 - 3;
    const stripe = x === x0 + 5 || x === x1 - 6;
    let col = edge ? M[1] : stripe ? M[2] : PL[0];
    const d = Math.abs(((y - 1256) % 40) - 20) + Math.abs(x - 304);
    if (!edge && !stripe && d < 8 && d > 5) col = PL[1];
    put(x, y, col);
  }
  groove(304, 1372, 36, 20, F[3], F[0]); ell(304, 1372, 30, 16, M[1]);
}
// Ruang Uji: cincin konsentris dengan sisipan lime putus-putus dan lempeng perisai di tengah
{
  const c = FORTRESS_LAYOUT.trialCircle;
  groove(c.x, c.y, 150, 84, F[2], F[0]); groove(c.x, c.y, 112, 63, F[2], F[0]); groove(c.x, c.y, 74, 42, F[2], F[0]);
  ellDash(c.x, c.y, 131, 73, L[0], 8, 6); ellDash(c.x, c.y, 93, 52, L[1], 5, 7);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; seg(Math.round(c.x + Math.cos(a) * 74), Math.round(c.y + Math.sin(a) * 42), Math.round(c.x + Math.cos(a) * 150), Math.round(c.y + Math.sin(a) * 84), F[0]); }
}
// Koridor Retakan: sambungan potongan (tiga bagian), soket jangkar di selatan, dan garis tengah yang terputus
{
  for (const y0 of [1232, 1104, 976]) for (const dy of [-2, 34]) for (let x = 800; x < 992; x++) { put(x, y0 + dy, F[0]); put(x, y0 + dy + 1, F[1]); }
  for (const x of [838, 954]) { for (let k = 0; k < 40; k++) for (let j = 0; j < 8; j++) put(x - 20 + k, 1318 + j, F[0]); }
  for (let y = 810; y < 1230; y += 24) { put(895, y, M[1]); put(896, y, M[2]); put(895, y + 1, M[1]); put(896, y + 1, M[2]); }
}
// Serambi: garis jaga kuningan menuju pintu Heart; dais lentera
{
  lineBand(895, 490, 895, 800, 2, M[1], M[2]);
  groove(800, 628, 46, 26, F[3], F[0]); ell(800, 628, 40, 22, M[1]);
}
// Ruang Heart: alas melingkar, alur dari kedua pengunci menuju cincin segel, serta tanda jam
{
  const hc = FORTRESS_LAYOUT.heartSeal;
  groove(hc.x, hc.y, 236, 112, F[3], F[0]); ell(hc.x, hc.y, 234, 111, F[1]); groove(hc.x, hc.y, 170, 82, F[3], F[0]);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; put(Math.round(hc.x + Math.cos(a) * 205), Math.round(hc.y + Math.sin(a) * 97), F[0]); put(Math.round(hc.x + Math.cos(a) * 205) + 1, Math.round(hc.y + Math.sin(a) * 97), F[3]); }
  // alur penghubung pengunci -> cincin (tempat daya mengalir bila dibuka)
  for (const [px, py] of [[800, 158], [992, 158]]) {
    const tx = px < 896 ? 842 : 950, ty = 222;
    for (let k = 0; k < 3; k++) seg(px - 1 + k, py, tx - 1 + k, ty, F[0]);
    seg(px + 2, py, tx + 2, ty, F[3]);
  }
}
// Ruang Gema: riak konsentris (lantai air beku) dengan sedikit titik pucat
{
  const cx = 1472, cy = 250;
  for (let r = 24; r <= 170; r += 22) { ell(cx, cy, r, r * 0.55, r % 44 === 0 ? PL[1] : PL[0]); }
  for (const [dx, dy] of [[-60, -10], [44, 20], [-110, 30], [98, -34], [10, 50]]) if (onFloor(cx + dx, cy + dy)) { put(cx + dx, cy + dy, L[1]); put(cx + dx + 1, cy + dy, L[0]); }
}

// ---------------------------------------------------------------- retakan lantai (garis panjang): plum + tepi lime, tanpa bloom
function groundCrack(pts, glow = true) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let k = 0; k <= n; k++) {
      const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n);
      if (!onFloor(x, y)) continue;
      put(x, y, PL[0]); put(x + 1, y, PL[0]);
      if (onFloor(x, y - 1)) put(x, y - 1, L[1]);
      if (glow && onFloor(x - 1, y) && (x + y) % 2 === 0) put(x - 1, y, L[0]);
      if (glow && onFloor(x + 2, y + 1)) put(x + 2, y + 1, L[0]);
    }
  }
}
groundCrack([[620, 2210], [680, 2188], [720, 2204], [760, 2176]]);
groundCrack([[900, 2080], [940, 2070], [980, 2092], [1040, 2080], [1100, 2110]]);
groundCrack([[812, 1700], [840, 1682], [866, 1702], [890, 1678]]); // di kaki lonceng
groundCrack([[920, 1618], [958, 1636], [990, 1610], [1030, 1624]]);
groundCrack([[808, 900], [826, 960], [812, 1010], [830, 1090], [816, 1150], [832, 1210]]); // koridor kiri
groundCrack([[984, 880], [968, 940], [986, 1000], [970, 1070], [988, 1160], [972, 1220]]); // koridor kanan
groundCrack([[760, 330], [790, 310], [800, 280], [830, 262]]); groundCrack([[1030, 330], [1000, 300], [990, 270], [960, 250]]);

// ---------------------------------------------------------------- tepi dan sudut: bayangan (kiri-atas terang, kanan-bawah gelap)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (cls[y * W + x] !== 1) continue;
  const c = get(x, y);
  if (!c || !c.ramp) continue;
  const du = dist(x, y, 0, -1, 10), dl = dist(x, y, -1, 0, 10), drr = dist(x, y, 1, 0, 4);
  let lv = 0;
  if (du <= 3) lv = 2; else if (du <= 9 && (du <= 6 || (x + y) % 2 === 0)) lv = 1;
  if (dl <= 3) lv = Math.max(lv, 2); else if (dl <= 9 && (x + y) % 2 === 0) lv = Math.max(lv, 1);
  if (drr <= 2 && lv === 0) { put(x, y, shade(c, 1)); continue; }
  if (lv) put(x, y, shade(c, -lv));
}

// ---------------------------------------------------------------- cahaya terarah: kolam obor, celah cahaya
const lights = [];
for (const p of FORTRESS_PROPS) {
  if (p.type === 'torch_a') lights.push({ x: p.x, y: p.y + 44, rx: 64, ry: 36 });
  else if (p.type === 'brazier_a') lights.push({ x: p.x, y: p.y + 4, rx: 60, ry: 34 });
}
for (const l of lights) {
  for (let y = Math.floor(l.y - l.ry); y <= Math.ceil(l.y + l.ry); y++) for (let x = Math.floor(l.x - l.rx); x <= Math.ceil(l.x + l.rx); x++) {
    if (!onFloor(x, y)) continue;
    const d = Math.hypot((x - l.x) / l.rx, (y - l.y) / l.ry);
    if (d >= 1) continue;
    const c = get(x, y); if (!c || !c.ramp) continue;
    if (d < 0.5 || (d < 1 && (x + y) % 2 === 0 && d < 0.75)) put(x, y, shade(c, 1));
  }
}
// celah cahaya diagonal dari kiri-atas (dari lubang dinding) pada tiga ruang
const shaft = (x0, y0, len, w, slope = 0.55) => {
  for (let y = y0; y < y0 + len; y++) {
    const cx = x0 + (y - y0) * slope;
    for (let x = Math.floor(cx - w / 2); x <= Math.ceil(cx + w / 2); x++) {
      if (!onFloor(x, y)) continue;
      const edge = Math.abs(x - cx) > w / 2 - 2;
      if (edge && (x + y) % 2) continue;
      const c = get(x, y); if (c && c.ramp) put(x, y, shade(c, 1));
    }
  }
};
shaft(690, 1426, 120, 26); shaft(1120, 1426, 110, 22); // aula lonceng
shaft(178, 1300, 120, 18); shaft(420, 1300, 100, 18); // arsip
shaft(666, 98, 150, 24); // jendela Heart (tertutup, cahaya tipis merembes)
shaft(1300, 120, 110, 22); // ruang gema
shaft(520, 946, 90, 14); // celah pintasan

// ---------------------------------------------------------------- bayangan prop (jatuh ke kanan-bawah)
const SOFT = new Set(['crack_a', 'crack_b', 'crack_c', 'mote']);
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
  for (const p of FORTRESS_PROPS) {
    const s = sprites[p.type], f = FORTRESS_FOOT[p.type] ?? [0, 0];
    if (SOFT.has(p.type) || /^(patrol)/.test(p.id)) continue;
    if (f[0] > 0) add(p.x + Math.min(14, f[0] * 0.28), p.y + 1, f[0] * 0.62 + 6, 4 + Math.min(8, s.c.h / 18));
    else if (/^(riftborn|oathguard|gravorn)/.test(p.type)) add(p.x + 2, p.y, s.c.w * 0.4, 4);
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const lv = map[y * W + x];
    if (!lv || cls[y * W + x] !== 1) continue;
    const c = get(x, y);
    if (c && c.ramp) put(x, y, shade(c, -lv));
  }
}
void FORTRESS_SOLIDS; void FORTRESS_WALKABLE; void FORTRESS_INTERACTABLES; void FORTRESS_TRIGGERS; void FORTRESS_DYNAMIC; void FORTRESS_INITIAL_DYNAMIC;

writeFileDeep(resolve(outDir, 'ground.png'), encodePNG(W, H, ground.d));
console.log(`fortress props.png ${atlas.w}x${atlas.h} (${Object.keys(sprites).length} sprite), ground.png ${W}x${H}, ${FORTRESS_PROPS.length} prop`);

// ---------------------------------------------------------------- pratinjau
const OPEN = { door_iron_closed: 'door_iron_open', door_heart_closed: 'door_heart_open', gate_side_closed: 'gate_side_open', echo_seal_closed: 'echo_seal_open', slab_shifted: 'slab_aligned', heart_emblem_sealed: 'heart_emblem_open', heart_seal_sealed: 'heart_seal_open', window_arch_0: 'window_arch_1' };
function propsFor(state) {
  const out = [];
  for (const p of FORTRESS_PROPS) {
    let type = p.type;
    if (state === 'open') {
      if (OPEN[type]) type = OPEN[type];
      type = type.replace(/^(seal_\w+)_off$/, '$1_on').replace('heart_pylon_off', 'heart_pylon_on').replace('trial_pedestal_off', 'trial_pedestal_on').replace('lantern_off', 'lantern_on').replace(/^anchor_(\w)_0$/, 'anchor_$1_1').replace('relic_dim', 'relic_glow').replace('echo_a_off', 'echo_a_on').replace('echo_b_off', 'echo_b_on').replace('chest_closed', 'chest_open');
      if (/^patrol/.test(p.id)) continue;
    }
    const f = state === 'open' ? 0 : 0; void f;
    out.push({ x: p.x, y: p.y, sprite: sprites[type], type });
  }
  return out;
}
function render(rect, zoom, state) {
  const g = new Canvas(W, H); g.d.set(ground.d);
  const list = propsFor(state);
  const decals = list.filter((p) => /^(heart_seal|rubble_b|rubble_c|crack_)/.test(p.type));
  const rest = list.filter((p) => !decals.includes(p));
  for (const p of decals) { const s = p.sprite; g.blit(s.c, Math.round(p.x - (s.anchorX ?? s.c.w / 2)), Math.round(p.y - s.anchorY)); }
  return composePreview(g, rest.map((p) => ({ x: p.x, y: p.y, sprite: p.sprite, depth: p.type === 'portcullis' ? p.y + 3000 : p.y })), rect, zoom);
}
function savePng(big, path) { writeFileDeep(path, encodePNG(big.w, big.h, big.d)); console.log('preview', path); }
function rectOutline(cv, r, col) {
  for (let x = r.x; x < r.x + r.w; x++) { cv.set(x, r.y, col); cv.set(x, r.y + r.h - 1, col); }
  for (let y = r.y; y < r.y + r.h; y++) { cv.set(r.x, y, col); cv.set(r.x + r.w - 1, y, col); }
}
function collisionOverlay(rect, zoom, state = 'initial') {
  const big = render(rect, 1, state);
  const g = new Canvas(big.w, big.h); g.d.set(big.d);
  const dyn = state === 'open' ? [] : FORTRESS_INITIAL_DYNAMIC.map((k) => FORTRESS_DYNAMIC[k]);
  const blocked = (gx, gy) => FORTRESS_SOLIDS.some((s) => gx * 8 < s.x + s.w && gx * 8 + 8 > s.x && gy * 8 < s.y + s.h && gy * 8 + 8 > s.y);
  const dynBlocked = (gx, gy) => dyn.some((s) => gx * 8 < s.x + s.w && gx * 8 + 8 > s.x && gy * 8 < s.y + s.h && gy * 8 + 8 > s.y);
  for (let gy = Math.floor(rect.y / 8); gy < Math.ceil((rect.y + rect.h) / 8); gy++) for (let gx = Math.floor(rect.x / 8); gx < Math.ceil((rect.x + rect.w) / 8); gx++) {
    const cx = gx * 8 + 4, cy = gy * 8 + 4;
    const walk = FORTRESS_WALKABLE.some((w) => cx >= w.x && cx <= w.x + w.w && cy >= w.y && cy <= w.y + w.h);
    const col = walk && !blocked(gx, gy) && !dynBlocked(gx, gy) ? [60, 220, 90] : walk ? [240, 60, 60] : null;
    if (!col) continue;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) g.set(gx * 8 + i - rect.x, gy * 8 + j - rect.y, col, 70);
  }
  for (const s of FORTRESS_SOLIDS) rectOutline(g, { x: s.x - rect.x, y: s.y - rect.y, w: s.w, h: s.h }, [255, 90, 90]);
  for (const d of dyn) rectOutline(g, { x: d.x - rect.x, y: d.y - rect.y, w: d.w, h: d.h }, [255, 160, 40]);
  for (const i of FORTRESS_INTERACTABLES) rectOutline(g, { x: i.x - rect.x, y: i.y - rect.y, w: i.w, h: i.h }, [80, 170, 255]);
  for (const t of FORTRESS_TRIGGERS) rectOutline(g, { x: t.x - rect.x, y: t.y - rect.y, w: t.w, h: t.h }, [255, 230, 60]);
  for (const s of [FORTRESS_SPAWN, ...Object.values(FORTRESS_BATTLE_RETURN), ...Object.values(FORTRESS_STAGE)]) rectOutline(g, { x: s.x - rect.x - 3, y: s.y - rect.y - 3, w: 6, h: 6 }, [255, 255, 255]);
  const out = new Canvas(rect.w * zoom, rect.h * zoom);
  for (let y = 0; y < rect.h; y++) for (let x = 0; x < rect.w; x++) {
    const i = (y * rect.w + x) * 4;
    for (let a = 0; a < zoom; a++) for (let b = 0; b < zoom; b++) { const j = ((y * zoom + a) * out.w + x * zoom + b) * 4; out.d[j] = g.d[i]; out.d[j + 1] = g.d[i + 1]; out.d[j + 2] = g.d[i + 2]; out.d[j + 3] = 255; }
  }
  return out;
}
/** Lembar kontak atlas: tiap frame di atas kotak-kotak gelap, diperbesar. */
function atlasSheet(zoom = 3) {
  const names = Object.keys(sprites);
  const cell = 150, cols = 8, rows = Math.ceil(names.length / cols);
  const sheet = new Canvas(cols * cell, rows * cell);
  for (let y = 0; y < sheet.h; y++) for (let x = 0; x < sheet.w; x++) sheet.set(x, y, ((x >> 3) + (y >> 3)) % 2 ? [46, 40, 52] : [38, 33, 44]);
  names.forEach((n, i) => {
    const s = sprites[n], ox = (i % cols) * cell, oy = Math.floor(i / cols) * cell;
    const z = Math.max(1, Math.min(zoom, Math.floor((cell - 6) / Math.max(s.c.w, s.c.h))));
    for (let y = 0; y < s.c.h; y++) for (let x = 0; x < s.c.w; x++) {
      const k = (y * s.c.w + x) * 4; if (!s.c.d[k + 3]) continue;
      for (let a = 0; a < z; a++) for (let b = 0; b < z; b++) sheet.set(ox + 3 + x * z + b, oy + 3 + y * z + a, [s.c.d[k], s.c.d[k + 1], s.c.d[k + 2]]);
    }
  });
  return { sheet, names };
}
if (process.env.PREVIEW) {
  const [x, y, w, h, z, out] = process.env.PREVIEW.split(',');
  savePng(render({ x: +x, y: +y, w: +w, h: +h }, +z, process.env.PREVIEW_STATE ?? 'initial'), out);
}
if (process.argv.includes('--preview')) {
  const full = { x: 0, y: 0, w: W, h: H };
  savePng(render(full, 1, 'initial'), resolve(previewDir, 'map_initial.png'));
  savePng(render(full, 1, 'open'), resolve(previewDir, 'map_open.png'));
  const rooms = {
    approach_outer: [560, 1960, 640, 472], bellhall: [480, 1340, 840, 540], barracks_archive: [100, 1180, 400, 700], trial: [1300, 1500, 400, 380],
    rift: [740, 760, 320, 640], serambi: [660, 400, 480, 420], heart: [540, 20, 720, 400], echo: [1200, 60, 500, 340], shortcut: [420, 580, 300, 860],
  };
  for (const [name, [x, y, w, h]] of Object.entries(rooms)) {
    savePng(render({ x, y, w, h }, 2, 'initial'), resolve(previewDir, `room_${name}.png`));
    if (['heart', 'echo', 'rift', 'bellhall'].includes(name)) savePng(render({ x, y, w, h }, 2, 'open'), resolve(previewDir, `room_${name}_open.png`));
  }
  savePng(collisionOverlay({ x: 0, y: 1180, w: 1792, h: 1252 }, 1), resolve(previewDir, 'collision_south.png'));
  savePng(collisionOverlay({ x: 400, y: 0, w: 1300, h: 1430 }, 1), resolve(previewDir, 'collision_north.png'));
  const { sheet } = atlasSheet(3);
  savePng(sheet, resolve(previewDir, 'atlas_sheet.png'));
}
void hash;
