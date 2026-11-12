// Penolong gambar bersama untuk atlas VFX Phase 8 (deterministik, tanpa blur/gradien halus).
// Transisi tona dilakukan dengan dither terurut (Bayer 4x4) atau pola papan catur, khas pixel art.
import { Rng } from './kit.mjs';

export const rad = (d) => (d * Math.PI) / 180;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
/** ambang Bayer 4x4 pada (x,y), rentang (0,1) */
export const bayer = (x, y) => (BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4] + 0.5) / 16;

/** pilih satu dari `tones` menurut nilai t (0..1) dengan dither terurut: tepi antar-tona berpola, bukan gradien halus */
export function pickTone(tones, t, x, y, spread = 0.2) {
  const v = clamp(t + (bayer(x, y) - 0.5) * spread, 0, 0.999);
  return tones[Math.floor(v * tones.length)];
}

/** noise periodik 1D terhadap sudut: jumlah sinus berfrekuensi bulat; mengembalikan fungsi (rad) -> -1..1 */
export function ringNoise(seed, terms = 3) {
  const r = new Rng(seed);
  const t = Array.from({ length: terms }, () => ({ f: r.int(2, 7), p: r.range(0, Math.PI * 2), a: r.range(0.5, 1) }));
  const norm = t.reduce((s, q) => s + q.a, 0);
  return (ang) => t.reduce((s, q) => s + q.a * Math.sin(q.f * ang + q.p), 0) / norm;
}

/** poligon bergerigi (pecahan/serpihan) di sekitar (cx,cy) */
export function shard(cv, cx, cy, size, ang, colors, seed = 1, n = 5) {
  const r = new Rng(seed);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rad(ang) + (i / n) * Math.PI * 2;
    const rr = size * (i % 2 ? r.range(0.35, 0.6) : r.range(0.75, 1));
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8]);
  }
  cv.poly(pts, (x, y) => (typeof colors === 'function' ? colors(x, y, cx, cy) : colors[0]));
  return pts;
}

/** garis putus-putus (on piksel nyala, off piksel mati) sepanjang polyline */
export function dashed(cv, pts, on, off, color, phase = 0) {
  let d = phase;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let k = 0; k <= n; k++, d++) {
      const m = d % (on + off);
      if (m < on) cv.set(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), typeof color === 'function' ? color(m, d) : color);
    }
  }
}

/** retakan bergerigi dari (x0,y0) ke (x1,y1): polyline dengan simpangan tegak lurus acak, bisa bercabang */
export function crackPath(x0, y0, x1, y1, amp, segs, rng) {
  const pts = [[x0, y0]];
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  for (let i = 1; i < segs; i++) {
    const t = i / segs, o = (rng.next() * 2 - 1) * amp;
    pts.push([Math.round(x0 + dx * t + nx * o), Math.round(y0 + dy * t + ny * o)]);
  }
  pts.push([x1, y1]);
  return pts;
}
export function polyline(cv, pts, c) { for (let i = 0; i + 1 < pts.length; i++) cv.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c); }

/** bola awan/asap berlapis: gugus lingkaran bernoda (cahaya kiri-atas) dengan dither tona */
export function puff(cv, cx, cy, r, tones, seed = 1, lobes = 5, flat = 1) {
  const rg = new Rng(seed);
  const balls = [{ x: cx, y: cy, r }];
  for (let i = 0; i < lobes; i++) { const a = rg.range(0, Math.PI * 2), d = r * rg.range(0.45, 0.8); balls.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * flat, r: r * rg.range(0.45, 0.75) }); }
  const mask = new Map();
  for (const b of balls)
    for (let y = Math.floor(b.y - b.r); y <= Math.ceil(b.y + b.r); y++)
      for (let x = Math.floor(b.x - b.r); x <= Math.ceil(b.x + b.r); x++) {
        const dx = (x + 0.5 - b.x) / b.r, dy = (y + 0.5 - b.y) / (b.r * flat);
        if (dx * dx + dy * dy > 1) continue;
        const l = clamp(0.62 - 0.4 * dx - 0.5 * dy - 0.25 * (dx * dx + dy * dy), 0, 1);
        const key = `${x},${y}`;
        const prev = mask.get(key);
        if (prev === undefined || l > prev) mask.set(key, l);
      }
  for (const [key, l] of mask) { const [x, y] = key.split(',').map(Number); cv.set(x, y, pickTone(tones, l, x, y, 0.28)); }
}

/** tepi bawah-kanan lebih gelap: pasang `shadeFn` setelah menggambar; di sini helper cermin horizontal sebagian */
export function flipH(cv) { const o = new cv.constructor(cv.w, cv.h); for (let y = 0; y < cv.h; y++) for (let x = 0; x < cv.w; x++) o.d[y * cv.w + (cv.w - 1 - x)] = cv.d[y * cv.w + x]; return o; }

/** peta ulang indeks warna (untuk varian tenang): map = {dariIndeks: keIndeks}; tidak pernah menambah warna baru */
export function remap(cv, map) {
  const o = new cv.constructor(cv.w, cv.h);
  for (let i = 0; i < cv.d.length; i++) { const v = cv.d[i]; o.d[i] = v && map[v] !== undefined ? map[v] : v; }
  return o;
}
/** buang piksel menurut papan catur kuat: level 1..3 (lihat Cv.dither) pada salinan */
export function dithered(cv, level) {
  const o = new cv.constructor(cv.w, cv.h); o.d.set(cv.d); o.dither(level); return o;
}
/** hapus piksel di baris/kolom tertentu menurut fungsi keep(x,y) (peluruhan terarah) */
export function eraseWhere(cv, fn) { for (let y = 0; y < cv.h; y++) for (let x = 0; x < cv.w; x++) if (fn(x, y)) cv.d[y * cv.w + x] = 0; }
/** garis tepi 1 px hanya pada sisi tertentu: tepi atas/kiri lebih terang (opsional) */
export function outlineWith(cv, ink) { cv.outline(ink); }

/** bintang berujung 4 (plus lancip) */
export function glint(cv, x, y, r, c, c2 = c) {
  cv.set(x, y, c2);
  for (let i = 1; i <= r; i++) { cv.set(x - i, y, c); cv.set(x + i, y, c); cv.set(x, y - i, c); cv.set(x, y + i, c); }
}
