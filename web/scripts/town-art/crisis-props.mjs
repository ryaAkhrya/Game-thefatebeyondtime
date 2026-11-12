// Prop krisis Aveloria (Chapter III): retakan waktu sebagai PERUBAHAN LINGKUNGAN, bukan glitch digital.
// Palet: palet Aveloria + satu ramp "retakan" emas pucat (hanya dipakai di sini; pengecualian eksplisit dari 'tanpa emas').
// Semua deterministik; tanpa blur/bloom; garis tepi 1 px; alfa hanya untuk bayangan datar.
import { Canvas, H, rng } from './pixel.mjs';
import { AV } from './ave-palette.mjs';
import { R, INK, ramp } from './kit.mjs';
import { frame } from './ave-sprites.mjs';
import * as B from './ave-buildings.mjs';
import * as P from './ave-props.mjs';

export const GOLD = ramp('#6e5d33', '#a8924d', '#d8c680', '#f2e8b8');
const CRACK = ramp('#1d1625', '#2a2230', '#3d3447');
const SHADOW = AV.shadow;

/** Jalur retakan bergerigi dari titik-titik acuan; deterministik. */
function jag(pts, seed, amp = 2.2, step = 4) {
  const rand = rng(seed), out = [];
  for (let k = 0; k + 1 < pts.length; k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / step));
    const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    for (let i = 0; i < n; i++) {
      const t = i / n, o = (rand() - 0.5) * 2 * amp * (i === 0 ? 0.2 : 1);
      out.push([Math.round(x0 + (x1 - x0) * t + nx * o), Math.round(y0 + (y1 - y0) * t + ny * o)]);
    }
  }
  out.push(pts[pts.length - 1].map(Math.round));
  return out;
}

/** Retakan paving: celah gelap 3 px, bibir terang di sisi kiri-atas, inti emas pucat 1 px yang putus-putus. */
function seam(name, w, h, paths, seed) {
  const c = new Canvas(w, h), rand = rng(seed + 5);
  const lines = paths.map((p, i) => ({ pts: jag(p.pts, seed + i * 7, p.amp ?? 2.2), thin: !!p.thin }));
  // celah
  for (const l of lines) for (let i = 0; i + 1 < l.pts.length; i++) {
    const [x0, y0] = l.pts[i], [x1, y1] = l.pts[i + 1], nn = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let s = 0; s <= nn; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / nn), y = Math.round(y0 + ((y1 - y0) * s) / nn);
      const wide = !l.thin && ((i + (s > nn / 2 ? 1 : 0)) % 5 !== 0);
      c.set(x, y, R(CRACK, 1)); c.set(x + 1, y, R(CRACK, 0));
      if (wide) { c.set(x, y + 1, R(CRACK, 0)); c.set(x - 1, y, R(CRACK, 1)); c.set(x + 1, y + 1, R(CRACK, 0)); }
    }
  }
  // bibir terang (kiri-atas) dan gelap (kanan-bawah) di luar celah
  const lip = [], dark = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (c.alpha(x, y)) continue;
    if (c.alpha(x + 1, y) && c.alpha(x, y + 1)) lip.push([x, y]);
    else if (c.alpha(x - 1, y) || c.alpha(x, y - 1)) dark.push([x, y]);
  }
  for (const [x, y] of lip) c.set(x, y, AV.pave[4]);
  for (const [x, y] of dark) c.set(x, y, R(AV.pave, 0));
  // inti emas: putus-putus agar terbaca sebagai celah yang bercahaya, bukan garis neon
  for (const l of lines) {
    let gap = 0;
    for (let i = 0; i + 1 < l.pts.length; i++) {
      const [x0, y0] = l.pts[i], [x1, y1] = l.pts[i + 1], nn = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
      if (gap > 0) { gap--; continue; }
      if (rand() < 0.13) { gap = 1 + Math.floor(rand() * 2); continue; }
      for (let s = 0; s <= nn; s++) {
        const x = Math.round(x0 + ((x1 - x0) * s) / nn), y = Math.round(y0 + ((y1 - y0) * s) / nn);
        { c.set(x, y, R(GOLD, l.thin ? 1 : 2)); if (!l.thin && (s % 2 === 0)) c.set(x + 1, y, R(GOLD, 1)); }
        if (!l.thin && rand() < 0.14) c.set(x, y - 1, R(GOLD, 3));
      }
    }
  }
  // serpihan paving terlepas di dekat celah
  const chips = Math.round(w / 40);
  for (let k = 0; k < chips; k++) {
    const l = lines[Math.floor(rand() * lines.length)], p = l.pts[Math.floor(rand() * l.pts.length)];
    const x = p[0] + (rand() < 0.5 ? -3 : 3), y = p[1] + (rand() < 0.5 ? -3 : 2);
    if (x > 2 && y > 2 && x < w - 3 && y < h - 3 && !c.alpha(x, y)) { c.rect(x, y, 2, 2, AV.pave[3]); c.set(x + 1, y + 1, R(AV.pave, 1)); }
  }
  return { name, c, pivot: { x: 0.5, y: 0.5 } };
}

export function seams() {
  return [
    seam('crisis_seam_long', 280, 44, [
      { pts: [[4, 14], [60, 18], [118, 26], [176, 22], [238, 32], [276, 30]] },
      { pts: [[118, 26], [132, 38], [160, 42]], thin: true }, { pts: [[176, 22], [196, 8], [226, 4]], thin: true },
    ], 11),
    seam('crisis_seam_diag', 150, 100, [
      { pts: [[6, 6], [38, 30], [70, 44], [104, 70], [142, 94]] }, { pts: [[70, 44], [96, 36], [124, 40]], thin: true }, { pts: [[38, 30], [34, 52], [42, 72]], thin: true },
    ], 23),
    seam('crisis_seam_gate', 130, 64, [
      { pts: [[4, 40], [34, 34], [66, 40], [100, 28], [126, 22]] }, { pts: [[66, 40], [78, 58]], thin: true },
    ], 37),
    seam('crisis_seam_court', 150, 44, [
      { pts: [[4, 20], [40, 14], [78, 24], [114, 18], [146, 28]] }, { pts: [[78, 24], [84, 38]], thin: true },
    ], 41),
    seam('crisis_seam_market', 120, 46, [
      { pts: [[6, 10], [36, 20], [66, 16], [98, 34], [116, 38]] }, { pts: [[66, 16], [78, 4]], thin: true },
    ], 53),
    seam('crisis_seam_east', 140, 54, [
      { pts: [[4, 46], [30, 36], [62, 38], [96, 20], [134, 10]] }, { pts: [[62, 38], [70, 52]], thin: true }, { pts: [[96, 20], [112, 30]], thin: true },
    ], 67),
  ];
}

/** Batu melayang: gumpalan batu pucat, dasar bergaris emas tipis (celah yang menahan). 4 bentuk. pivot = tengah-bawah. */
function floatStone(name, seed, w, h) {
  const c = new Canvas(w, h + 4), rand = rng(seed);
  const cx = w / 2, pts = [];
  const n = 8;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rand() * 0.4, rx = (w / 2 - 2) * (0.78 + rand() * 0.22), ry = (h / 2 - 1) * (0.74 + rand() * 0.26);
    pts.push([cx + Math.cos(a) * rx, h / 2 + 1 + Math.sin(a) * ry]);
  }
  c.poly(pts, (x, y) => {
    const lx = (x - cx) / (w / 2), ly = (y - h / 2) / (h / 2);
    let k = 2 + (lx + ly < -0.55 ? 2 : lx + ly < -0.1 ? 1 : lx + ly > 0.5 ? -2 : lx + ly > 0.15 ? -1 : 0);
    if (((x * 7 + y * 13) % 11) === 0) k -= 1;
    return R(AV.stone, k);
  });
  c.outline(INK);
  // dasar emas: 1 px di bawah batu, putus-putus
  const bottom = [];
  for (let x = 0; x < w; x++) for (let y = h + 3; y >= 0; y--) if (c.alpha(x, y) > 200) { bottom.push([x, y]); break; }
  bottom.forEach(([x, y], i) => { if (i % 4 !== 3) c.set(x, y + 1, R(GOLD, i % 2 ? 1 : 2)); });
  return { name, c, pivot: { x: 0.5, y: 0.5 } };
}
export function floatStones() {
  return [floatStone('crisis_stone_a', 3, 22, 16), floatStone('crisis_stone_b', 9, 16, 13), floatStone('crisis_stone_c', 15, 28, 19), floatStone('crisis_stone_d', 21, 12, 10)];
}

/** Bayangan bulat datar di tanah di bawah benda yang melayang (menandakan jaraknya dari tanah). */
export function floatShadow(rx, name) {
  const c = new Canvas(rx * 2 + 2, Math.round(rx * 0.7) + 3);
  c.ellipse(rx + 1, c.h / 2, rx, rx * 0.34, SHADOW, 125);
  return { name, c, pivot: { x: 0.5, y: 0.5 } };
}

/** Bayangan SALAH ARAH: siluet sprite diproyeksikan ke kiri-atas (cahaya datang dari kanan-bawah) dengan sx/sy terbalik. */
function wrongShadow(name, fr, cap, sx = -0.55, sy = -0.16, alpha = 92) {
  const sc = fr.c, baseRow = Math.round(fr.pivot.y * sc.h) - 1, bx = Math.round(fr.pivot.x * sc.w);
  const pix = new Set();
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (let i = 0; i < sc.w; i++) {
    let top = -1;
    for (let j = 0; j <= sc.h; j++) if (sc.alpha(i, j) > 128) { top = j; break; }
    if (top < 0) continue;
    const hgt = Math.min(cap, baseRow - top); if (hgt <= 0) continue;
    const steps = Math.ceil(hgt * 0.55);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, x = Math.round(i - bx + hgt * sx * t), y = Math.round(hgt * sy * t);
      pix.add(`${x},${y}`); minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  const w = maxX - minX + 1, h = maxY - minY + 1, c = new Canvas(w, h);
  for (const k of pix) { const [x, y] = k.split(',').map(Number); c.set(x - minX, y - minY, SHADOW, alpha); }
  // tepi berdither papan catur: buang piksel tepi bergantian agar tidak terbaca sebagai blok solid
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!c.alpha(x, y)) continue;
    const edge = !c.alpha(x - 1, y) || !c.alpha(x + 1, y) || !c.alpha(x, y - 1) || !c.alpha(x, y + 1);
    if (edge && ((x + y) & 1)) c.d[(y * w + x) * 4 + 3] = 0;
  }
  return { name, c, pivot: { x: -minX / w, y: (-minY + 1) / h } };
}
export function wrongShadows() {
  return [
    wrongShadow('crisis_shadow_tower', B.avTower(), 150),
    wrongShadow('crisis_shadow_lamp', P.avLamp(), 62),
    wrongShadow('crisis_shadow_well', P.avWell(), 70),
    wrongShadow('crisis_shadow_banner', banner(0, 'x'), 50),
  ];
}

/** Jam menara: cakram + jarum. Lingkar jam asli (ave_tower) tertimpa utuh; retakan emas melintas. min = 0..4 (arah jarum menit), hour = jam. */
function clockFrame(name, minDir, hourDir) {
  const c = new Canvas(30, 30), cx = 15, cy = 15;
  c.ellipse(cx, cy, 14, 14, R(AV.stone, 5)); c.ellipse(cx, cy, 12, 12, (x, y) => (x + y < cx + cy - 4 ? AV.linen : AV.cream));
  for (let a = 0; a < 12; a++) { const t = (a / 12) * Math.PI * 2; c.set(Math.round(cx + Math.sin(t) * 10), Math.round(cy - Math.cos(t) * 10), R(AV.slate, 0)); }
  const hand = (len, ang, th, col) => {
    for (let s = 0; s <= len; s++) for (let k = 0; k < th; k++) c.set(Math.round(cx + Math.sin(ang) * s + (th > 1 ? k * Math.cos(ang) : 0)), Math.round(cy - Math.cos(ang) * s + (th > 1 ? k * Math.sin(ang) : 0)), col);
  };
  hand(6, (hourDir / 12) * Math.PI * 2, 2, R(AV.slate, 0));
  hand(9, (minDir / 60) * Math.PI * 2, 1, R(AV.slate, 1));
  c.set(cx, cy, R(AV.bronze, 2));
  // retakan di muka jam: gelap + emas, dari kiri-atas ke kanan-bawah, menembus bingkai
  const path = jag([[3, 5], [9, 10], [14, 14], [19, 21], [26, 25]], 5, 1.4, 3);
  for (const [x, y] of path) { if (c.alpha(x, y)) { c.set(x, y, R(CRACK, 1)); c.set(x + 1, y, R(CRACK, 0)); } }
  path.forEach(([x, y], i) => { if (c.alpha(x, y) && i % 4 !== 2) c.set(x, y, R(GOLD, 2)); });
  c.outline(INK);
  return { name, c, pivot: { x: 0.5, y: 0.5 } };
}
export function clockFrames() {
  // jarum menit mencoba maju 0 -> 5 -> 10 -> 15 menit lalu dilempar kembali ke 0; jarum jam bergetar 9 -> 10 pada tahap parah.
  return [clockFrame('crisis_clock_0', 0, 9), clockFrame('crisis_clock_1', 5, 9), clockFrame('crisis_clock_2', 10, 9), clockFrame('crisis_clock_3', 15, 9), clockFrame('crisis_clock_4', 0, 10), clockFrame('crisis_clock_5', 55, 8)];
}

/** Api lampu yang membeku: dua pose miring (kiri/kanan), kaca lampu asli tetap di bawahnya. 8x10. */
function flame(name, lean) {
  const c = new Canvas(8, 11);
  const rows = [[3, 1], [3, 2], [3, 2], [2, 4], [2, 4], [2, 4], [2, 4], [3, 3], [3, 2]];
  rows.forEach(([x0, w], j) => { for (let i = 0; i < w; i++) c.set(x0 + i + Math.round((lean * (8 - j)) / 5), 1 + j, j < 3 ? R(GOLD, 3) : j < 6 ? R(GOLD, 2) : R(GOLD, 1)); });
  c.outline(R(GOLD, 0));
  return { name, c, pivot: { x: 0.5, y: 0.5 } };
}
export function flames() { return [flame('crisis_flame_l', -2), flame('crisis_flame_r', 2), flame('crisis_flame_c', 0)]; }

/** Percikan air sumur yang menggantung: kolom tetes berhenti di tengah gerak. 2 pose (satu tetes bergeser 1 px). */
function wellWater(name, shift) {
  const c = new Canvas(44, 46);
  const W = AV.water;
  const drop = (x, y, h, hi) => { c.rect(x, y, 2, h, R(W, 2)); c.set(x, y, R(W, 3)); if (hi) c.set(x, y + 1, [236, 246, 244]); c.rect(x + 2, y + 1, 1, Math.max(1, h - 1), R(W, 1)); };
  // alas: riak yang terangkat dari permukaan
  c.ellipse(22, 43, 12, 3, R(W, 1)); c.ellipse(21, 42, 9, 2, R(W, 2)); c.hline(15, 41, 5, R(W, 3));
  // kolom: batang tipis di tengah, melebar menjadi mahkota di atas, tetes terlepas di sisi
  for (let y = 24; y < 41; y++) { const w = y < 30 ? 5 : y < 36 ? 3 : 2; c.rect(22 - Math.floor(w / 2), y, w, 1, R(W, y < 30 ? 2 : 1)); c.set(22 - Math.floor(w / 2), y, R(W, 3)); }
  c.ellipse(22, 22, 8, 3, R(W, 2)); c.ellipse(21, 21, 6, 2, R(W, 3)); c.hline(17, 20, 4, [236, 246, 244]);
  drop(10, 12 + shift, 4, true); drop(15, 4, 3, false); drop(30, 8 - shift, 4, true); drop(35, 17, 3, false); drop(24, 1 + shift, 3, true); drop(6, 26, 3, false); drop(37, 28 + shift, 3, false);
  c.outline(R(W, 0));
  return { name, c, pivot: { x: 0.5, y: 43 / 46 } };
}
export function wellWaters() { return [wellWater('crisis_well_water_a', 0), wellWater('crisis_well_water_b', 1)]; }

/** Panji plum pada tiang: 4 pose kibar. wave = fase; 'x' = pose berhenti (dipakai bayangan). Pivot dasar tiang. */
function banner(phase, name) {
  const c = new Canvas(30, 70), B0 = 66;
  c.rect(11, 6, 4, B0 - 5, R(AV.wood, 2)); c.vline(11, 6, B0 - 5, R(AV.wood, 3)); c.vline(14, 6, B0 - 5, R(AV.wood, 1));
  c.rect(8, B0 - 2, 10, 3, R(AV.stone, 3)); c.hline(8, B0 - 2, 10, R(AV.stone, 4));
  c.rect(10, 3, 14, 3, R(AV.wood, 3)); c.hline(10, 3, 14, R(AV.wood, 4)); c.set(12, 1, R(AV.bronze, 3)); c.set(12, 2, R(AV.bronze, 2));
  // kain: 22 baris, geser horizontal menurut gelombang; ujung ekor bercabang
  for (let j = 0; j < 38; j++) {
    const amp = 0.8 + (j / 38) * 2.6, off = Math.round(Math.sin(j * 0.22 + phase * 1.57) * amp + (phase === 0 || phase === 'x' ? 0 : (phase === 2 ? 2 : 1)) * (j / 38));
    const x0 = 15 + off, w = 14 - (j > 29 ? Math.floor((j - 29) * 0.5) : 0);
    if (w <= 0) continue;
    for (let i = 0; i < w; i++) { const fold = ((i + Math.round(j * 0.25)) % 5) === 0; c.set(x0 + i, 6 + j, R(AV.plum, i < 2 ? 3 : i > w - 3 ? 1 : fold ? 1 : 2)); }
    if (j % 6 === 3 && w > 7 && j < 30) { c.set(x0 + 5, 6 + j, R(AV.bronze, 2)); c.set(x0 + 8, 6 + j, R(AV.bronze, 2)); }
    if (j > 31 && (j % 3 === 0) && w > 8) c.set(x0 + (w >> 1), 6 + j, [0, 0, 0], 0);
  }
  c.outline(INK);
  return { name, c, pivot: { x: 13 / 30, y: (B0 + 1) / 70 } };
}
export function banners() { return [0, 1, 2, 3].map(p => banner(p, `crisis_banner_${p}`)); }

/** Gerobak penuh barang (pengungsian): gerobak asli + tumpukan karung, buntalan kain, gulungan tikar. */
export function cartLoaded() {
  const base = P.avCart(), by = Math.round(base.pivot.y * base.c.h) - 1;
  const c = new Canvas(80, 76), oy = 28;
  c.blit(base.c, 2, oy);
  const baseY = oy + by;
  // muatan: karung (stone/linen), buntalan plum, gulungan tikar, panci
  const sack = (x, y, w, h, col) => { c.rect(x, y, w, h, R(col, 2)); c.hline(x, y, w, R(col, 3)); c.vline(x, y, h, R(col, 3)); c.hline(x, y + h - 1, w, R(col, 0)); c.vline(x + w - 1, y, h, R(col, 1)); c.rect(x + 2, y - 2, w - 4, 3, R(col, 2)); c.hline(x + 2, y - 2, w - 4, R(col, 3)); c.set(x + (w >> 1), y + 2, R(col, 0)); };
  sack(14, baseY - 40, 16, 16, AV.earth); sack(31, baseY - 36, 14, 12, AV.stone);
  sack(18, baseY - 54, 14, 14, AV.plum); sack(34, baseY - 48, 12, 11, AV.teal);
  c.rect(46, baseY - 44, 6, 14, AV.cream); c.vline(46, baseY - 44, 14, AV.linen); c.hline(46, baseY - 44, 6, [245, 240, 226]); c.hline(46, baseY - 38, 6, R(AV.wood, 2)); c.hline(46, baseY - 33, 6, R(AV.wood, 2));
  c.ellipse(24, baseY - 58, 4, 3, R(AV.iron, 2)); c.hline(21, baseY - 60, 6, R(AV.iron, 3));
  c.outline(INK);
  return { name: 'crisis_cart_loaded', c, pivot: { x: (2 + 38) / 80, y: (baseY + 1) / 76 } };
}

/** Peti angkut kecil untuk Torvan/warga (16x12) dan buntalan jatuh (14x12). */
export function crateCarry() {
  const c = new Canvas(18, 14), W = AV.wood;
  c.rect(1, 2, 16, 10, R(W, 2)); c.hline(1, 2, 16, R(W, 4)); c.vline(1, 2, 10, R(W, 3)); c.hline(1, 11, 16, R(W, 0)); c.vline(16, 2, 10, R(W, 1));
  c.hline(2, 6, 14, R(W, 1)); c.vline(9, 3, 8, R(W, 1));
  c.set(4, 4, AV.tomato); c.set(5, 4, AV.tomato); c.set(12, 3, AV.leaf);
  c.outline(INK);
  return { name: 'crisis_crate_carry', c, pivot: { x: 0.5, y: 0.5 } };
}
export function bundles() {
  const mk = (name, col, w, h, seed) => {
    const c = new Canvas(w + 4, h + 6), rand = rng(seed);
    c.ellipse(w / 2 + 2, h / 2 + 3, w / 2, h / 2, (x, y) => R(col, x + y < w + 2 ? 3 : 2));
    c.hline(2, h + 1, w, R(col, 1)); c.vline(w >> 1, 3, h, R(AV.wood, 1)); c.hline(3, h >> 1, w - 2, R(AV.wood, 2));
    for (let k = 0; k < 3; k++) c.set(3 + Math.floor(rand() * (w - 3)), 4 + Math.floor(rand() * (h - 3)), R(col, 1));
    c.outline(INK);
    return { name, c, pivot: { x: 0.5, y: (h + 5) / (h + 6) } };
  };
  return [mk('crisis_bundle_a', AV.plum, 14, 10, 3), mk('crisis_bundle_b', AV.earth, 12, 9, 7), mk('crisis_bundle_c', AV.teal, 13, 8, 9)];
}

/** Keranjang jatuh + apel yang menggantung: keranjang miring di udara, tiga apel berhenti di tengah jatuh. */
export function basketFrame() {
  const c = new Canvas(40, 30), W = AV.wood;
  c.poly([[6, 18], [30, 12], [33, 26], [9, 30]], (x, y) => R(W, 2 + ((x + y) % 4 === 0 ? 1 : 0) + (x < 12 ? 1 : 0) - (y > 26 ? 1 : 0)));
  for (let k = 0; k < 4; k++) c.line(8 + k * 6, 20 + Math.round(k * -1.5), 10 + k * 6, 28 - k, R(W, 1));
  c.line(6, 18, 30, 12, R(W, 4)); c.line(9, 30, 33, 26, R(W, 0));
  c.line(10, 16, 18, 4, R(W, 3)); c.line(18, 4, 28, 10, R(W, 3));
  c.outline(INK);
  return { name: 'crisis_basket', c, pivot: { x: 0.5, y: 0.5 } };
}
export function apple() {
  const c = new Canvas(8, 8);
  c.ellipse(4, 4.5, 3, 3, (x, y) => (x + y < 7 ? AV.tomato : [133, 56, 48]));
  c.set(3, 2, [232, 150, 130]); c.set(4, 0, R(AV.wood, 2)); c.set(5, 0, AV.leaf);
  c.outline(INK);
  return { name: 'crisis_apple', c, pivot: { x: 0.5, y: 0.5 } };
}

/** Patok pasir waktu? TIDAK dipakai (bukan varian jam pasir). Pelindung: tidak ada ikon jam pasir di aset krisis. */

export function propFrames() {
  return [...seams(), ...floatStones(), floatShadow(7, 'crisis_fshadow_s'), floatShadow(10, 'crisis_fshadow_m'), ...wrongShadows(), ...clockFrames(), ...flames(), ...wellWaters(), ...banners(),
    cartLoaded(), crateCarry(), ...bundles(), basketFrame(), apple()];
}
void H; void frame;
