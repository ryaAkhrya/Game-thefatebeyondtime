// Kit gambar piksel VFX (Phase 7). Kanvas berindeks palet: 0 = transparan, 1..N = indeks warna. Dengan begitu setiap atlas
// MUSTAHIL memuat warna di luar palet tertutupnya, alfa selalu 0/255 (tanpa blur, tanpa gradien halus).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { encodePNG } from '../lib/pixelkit.mjs';

export function writeDeep(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export class Rng {
  constructor(seed) { this.f = mulberry32(seed); }
  next() { return this.f(); }
  range(a, b) { return a + (b - a) * this.f(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  chance(p) { return this.f() < p; }
  pick(arr) { return arr[Math.floor(this.f() * arr.length)]; }
}

const hexRGB = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

/** Palet tertutup: {nama:'#rrggbb'} -> {idx:{nama:1..}, rgb:[null,[r,g,b],...]} */
export function makePalette(map) {
  const idx = {}, rgb = [null];
  for (const [name, hex] of Object.entries(map)) { rgb.push(hexRGB(hex)); idx[name] = rgb.length - 1; }
  return { idx, rgb, size: rgb.length - 1 };
}

export class Cv {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8Array(w * h); }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (this.inb(x, y)) this.d[y * this.w + x] = c; }
  get(x, y) { return this.inb(x, y) ? this.d[y * this.w + x] : 0; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  line(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= n; i++) this.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
  }
  /** elips terisi; c boleh fungsi (x,y,dx,dy)->indeks (dx,dy ternormalisasi -1..1) */
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, typeof c === 'function' ? c(x, y, dx, dy) : c);
      }
  }
  /** cincin elips setebal th piksel (diukur pada sumbu terpendek) */
  ring(cx, cy, rx, ry, th, c, skip) {
    const ix = Math.max(rx - th, 0.001), iy = Math.max(ry - th, 0.001);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx), dy = (y + 0.5 - cy);
        const o = (dx / rx) ** 2 + (dy / ry) ** 2, i = (dx / ix) ** 2 + (dy / iy) ** 2;
        if (o <= 1 && i > 1) {
          if (skip && skip(x, y, Math.atan2(dy, dx))) continue;
          this.set(x, y, typeof c === 'function' ? c(x, y, dx / rx, dy / ry) : c);
        }
      }
  }
  /** poligon even-odd (titik pusat piksel) */
  poly(pts, c) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yy = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + ((yy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, typeof c === 'function' ? c(x, y) : c);
    }
  }
  /** elips terputar (sumbu panjang len, lebar wid, sudut deg) berpangkal di (x,y) menuju arah sudut */
  petal(x, y, len, wid, deg, c) {
    const a = (deg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    const cx = x + (ca * len) / 2, cy = y + (sa * len) / 2;
    const R = Math.ceil(len / 2 + wid / 2) + 1;
    for (let j = -R; j <= R; j++)
      for (let i = -R; i <= R; i++) {
        const px = Math.round(cx) + i, py = Math.round(cy) + j;
        const dx = px + 0.5 - cx, dy = py + 0.5 - cy;
        const u = (dx * ca + dy * sa) / (len / 2), v = (-dx * sa + dy * ca) / (wid / 2);
        // bentuk tetes: menyempit di ujung (u -> +-1)
        const taper = 1 - 0.55 * Math.max(0, u) ** 2 - 0.2 * Math.min(0, u) ** 2;
        if (u * u <= 1 && Math.abs(v) <= taper * 1) this.set(px, py, typeof c === 'function' ? c(px, py, u, v) : c);
      }
  }
  /** garis tepi 1 px (4-tetangga) ke piksel transparan di sekitar piksel terisi */
  outline(c) {
    const add = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1)) add.push([x, y]);
      }
    for (const [x, y] of add) this.set(x, y, c);
  }
  /** hapus piksel menurut pola papan catur (dither); keep=0 hapus pola genap, 1 ganjil; density 1=semua kena, 0.5 setengah */
  dither(level) {
    // level 0 = tidak ada yang dihapus; 1 = jarang (1/4); 2 = papan catur (1/2); 3 = 3/4
    if (!level) return;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const k = (x & 1) + 2 * (y & 1);
        const kill = level === 1 ? k === 0 : level === 2 ? k === 0 || k === 3 : k !== 1;
        if (kill) this.d[y * this.w + x] = 0;
      }
  }
  mirrorH() { for (let y = 0; y < this.h; y++) for (let x = 0; x < Math.floor(this.w / 2); x++) { const v = this.get(x, y); if (v) this.set(this.w - 1 - x, y, v); } }
  count() { let n = 0; for (const v of this.d) if (v) n++; return n; }
  blit(src, ox, oy) { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const v = src.d[y * src.w + x]; if (v) this.set(ox + x, oy + y, v); } }
}

/**
 * Goresan meruncing antara dua titik. profile(s) -> setengah-lebar relatif 0..1 (s 0..1 sepanjang goresan).
 * shade(d, w) memilih warna menurut jarak bertanda terhadap sumbu (d<0 sisi kiri-atas) dan setengah-lebar w.
 */
export function stroke(cv, pts, halfW, profile, shade) {
  // pts: polyline titik tengah; hitung tiap piksel jarak ke segmen terdekat
  const segs = [];
  let total = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    segs.push({ a: pts[i], b: pts[i + 1], l, s0: total }); total += l;
  }
  for (let y = 0; y < cv.h; y++)
    for (let x = 0; x < cv.w; x++) {
      const px = x + 0.5, py = y + 0.5;
      let best = null;
      for (const sg of segs) {
        const dx = sg.b[0] - sg.a[0], dy = sg.b[1] - sg.a[1];
        const t = Math.max(0, Math.min(1, ((px - sg.a[0]) * dx + (py - sg.a[1]) * dy) / (sg.l * sg.l || 1)));
        const qx = sg.a[0] + dx * t, qy = sg.a[1] + dy * t;
        const dist = Math.hypot(px - qx, py - qy);
        // tanda: sisi kiri-atas negatif. normal (dy,-dx) menghadap kanan-atas arah gerak; pakai lintas-produk
        const cross = dx * (py - sg.a[1]) - dy * (px - sg.a[0]);
        if (!best || dist < best.dist) best = { dist, s: (sg.s0 + t * sg.l) / total, side: cross };
      }
      if (!best) continue;
      const w = halfW * profile(best.s);
      if (w <= 0 || best.dist > w) continue;
      const c = shade(best.side < 0 ? -best.dist / w : best.dist / w, best.s, x, y);
      if (c) cv.set(x, y, c);
    }
}

/** Titik pada busur lingkaran: sudut matematika (derajat, y ke atas) -> koordinat layar */
export const arcPt = (cx, cy, r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy - r * Math.sin((deg * Math.PI) / 180)];
export const arcPts = (cx, cy, r, d0, d1, n = 24) => Array.from({ length: n + 1 }, (_, i) => arcPt(cx, cy, r, d0 + ((d1 - d0) * i) / n));

/** Atlas: rak sederhana. frames: [{name, cv, pivotY}] -> {pixels(RGBA), json, w,h, placed} */
export function buildAtlas(key, imageFile, palette, frames, width = 256, packed = false) {
  const gap = 2;
  // packed (atlas Phase 8): frame dipangkas ke kotak isi (trimmed: true, spriteSourceSize/sourceSize utuh, pivot terhadap sourceSize)
  // dan rak diurutkan menurut tinggi agar atlas padat; urutan JSON tidak berarti.
  const boxOf = (cv) => {
    if (!packed) return { x: 0, y: 0, w: cv.w, h: cv.h };
    let x0 = cv.w, y0 = cv.h, x1 = -1, y1 = -1;
    for (let j = 0; j < cv.h; j++) for (let i = 0; i < cv.w; i++) if (cv.d[j * cv.w + i]) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j); }
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };
  let items = frames.map((f) => ({ f, b: boxOf(f.cv) }));
  if (packed) items = items.sort((a, b) => b.b.h - a.b.h || b.b.w - a.b.w);
  let x = gap, y = gap, rowH = 0;
  const placed = [];
  for (const it of items) {
    if (x + it.b.w + gap > width) { x = gap; y += rowH + gap; rowH = 0; }
    placed.push({ f: it.f, b: it.b, x, y });
    x += it.b.w + gap;
    rowH = Math.max(rowH, it.b.h);
  }
  const H = y + rowH + gap;
  const px = new Uint8Array(width * H * 4);
  const jsonFrames = {};
  for (const { f, b, x: fx, y: fy } of placed) {
    for (let j = 0; j < b.h; j++)
      for (let i = 0; i < b.w; i++) {
        const v = f.cv.d[(b.y + j) * f.cv.w + b.x + i];
        if (!v) continue;
        const o = ((fy + j) * width + fx + i) * 4, c = palette.rgb[v];
        px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
      }
    const trimmed = b.w !== f.cv.w || b.h !== f.cv.h;
    jsonFrames[f.name] = {
      frame: { x: fx, y: fy, w: b.w, h: b.h }, rotated: false, trimmed,
      spriteSourceSize: { x: b.x, y: b.y, w: b.w, h: b.h }, sourceSize: { w: f.cv.w, h: f.cv.h },
      pivot: { x: 0.5, y: f.pivotY ?? 0.5 },
    };
  }
  const json = { frames: jsonFrames, meta: { app: 'web/scripts/vfx/build.mjs', version: '1', image: imageFile, format: 'RGBA8888', size: { w: width, h: H }, scale: '1', status: 'DRAFT', key } };
  return { px, w: width, h: H, json, placed, png: () => encodePNG(width, H, px) };
}

// ---- pratinjau (contact sheet): bendera 4x di atas latar tanah/hutan & papan catur ----
const DIGITS = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'],
};
export function contactSheet(rows, palette, zoom = 4) {
  // rows: [{frames:[Cv...]}]; tiap sel diberi latar tanah #65533E + gelap #304734 di separuh atas
  const pad = 6;
  const cellW = Math.max(...rows.flatMap((r) => r.frames.map((c) => c.w))) + pad * 2;
  const rowsH = rows.map((r) => Math.max(...r.frames.map((c) => c.h)) + pad * 2);
  const cols = Math.max(...rows.map((r) => r.frames.length));
  const labelW = 14;
  const W = (labelW + cols * cellW) * zoom, H = rowsH.reduce((a, b) => a + b, 0) * zoom;
  const px = new Uint8Array(W * H * 4);
  const fill = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const o = (y * W + x) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255; };
  let y0 = 0;
  rows.forEach((r, ri) => {
    const rh = rowsH[ri];
    // latar
    for (let y = 0; y < rh * zoom; y++) for (let x = 0; x < W; x++) fill(x, y0 * zoom + y, y < rh * zoom * 0.45 ? [0x30, 0x47, 0x34] : [0x65, 0x53, 0x3e]);
    // label nomor baris (digit 3x5 putih)
    String(ri + 1).split('').forEach((d, k) => DIGITS[d].forEach((line, j) => [...line].forEach((b, i) => { if (b === '1') for (let a = 0; a < zoom; a++) for (let bb = 0; bb < zoom; bb++) fill((2 + k * 4 + i) * zoom + a, (y0 + 2 + j) * zoom + bb, [236, 227, 214]); })));
    r.frames.forEach((cv, ci) => {
      const ox = labelW + ci * cellW + pad, oy = y0 + pad;
      // kotak bingkai sel (garis tipis) agar batas frame terlihat
      for (let i = -1; i <= cv.w; i++) for (const j of [-1, cv.h]) for (let a = 0; a < zoom; a++) fill((ox + i) * zoom + a, (oy + j) * zoom, [90, 80, 110]);
      for (let j = -1; j <= cv.h; j++) for (const i of [-1, cv.w]) for (let b = 0; b < zoom; b++) fill((ox + i) * zoom, (oy + j) * zoom + b, [90, 80, 110]);
      for (let j = 0; j < cv.h; j++) for (let i = 0; i < cv.w; i++) {
        const v = cv.d[j * cv.w + i];
        if (!v) continue;
        for (let a = 0; a < zoom; a++) for (let b = 0; b < zoom; b++) fill((ox + i) * zoom + a, (oy + j) * zoom + b, palette.rgb[v]);
      }
    });
    y0 += rh;
  });
  return encodePNG(W, H, px);
}
