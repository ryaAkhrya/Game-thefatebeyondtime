// Alat piksel untuk generator art kota (Aveloria + Liora). Deterministik, tanpa dependensi luar.
import { crc32, deflateSync } from 'node:zlib';

export function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

export const H = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const mix = (c1, c2, t) => [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))];

export function hash(ix, iy, seed = 0) {
  let h = Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(seed | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Value noise 2D yang mulus (untuk gumpalan material, bukan taburan acak). */
export function vnoise(x, y, seed = 0) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const s = (t) => t * t * (3 - 2 * t);
  const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed);
  return lerp(lerp(a, b, s(fx)), lerp(c, d, s(fx)), s(fy));
}
export function fbm(x, y, seed = 0, oct = 3) {
  let v = 0, amp = 0.5, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) { v += vnoise(x * f, y * f, seed + i * 17) * amp; tot += amp; amp *= 0.5; f *= 2; }
  return v / tot;
}
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class Canvas {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  set(x, y, c, a = 255) {
    x |= 0; y |= 0;
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (a >= 255) { this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255; return; }
    const sa = a / 255, da = this.d[i + 3] / 255, oa = sa + da * (1 - sa);
    for (let k = 0; k < 3; k++) this.d[i + k] = (c[k] * sa + this.d[i + k] * da * (1 - sa)) / (oa || 1);
    this.d[i + 3] = oa * 255;
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    const i = (y * this.w + x) * 4;
    return this.d[i + 3] ? [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]] : null;
  }
  alpha(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.d[(y * this.w + x) * 4 + 3]; }
  rect(x, y, w, h, c, a = 255) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, a); }
  hline(x, y, w, c, a = 255) { for (let i = 0; i < w; i++) this.set(x + i, y, c, a); }
  vline(x, y, h, c, a = 255) { for (let j = 0; j < h; j++) this.set(x, y + j, c, a); }
  line(x0, y0, x1, y1, c, a = 255) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= n; i++) this.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c, a);
  }
  /** Isi poligon (even-odd). `col` = warna tetap atau fungsi (x,y)=>warna|null. */
  poly(pts, col, a = 255) {
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const [x, y] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [];
      const yy = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
        if ((y1 <= yy && y2 > yy) || (y2 <= yy && y1 > yy)) xs.push(x1 + ((yy - y1) / (y2 - y1)) * (x2 - x1));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, typeof col === 'function' ? col(x, y) : col, a);
      }
    }
  }
  ellipse(cx, cy, rx, ry, col, a = 255) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, typeof col === 'function' ? col(x, y) : col, a);
      }
  }
  /** Garis tepi 1 px di luar siluet alfa (4 arah). */
  outline(c) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.alpha(x, y) > 200) continue;
      if (this.alpha(x + 1, y) > 200 || this.alpha(x - 1, y) > 200 || this.alpha(x, y + 1) > 200 || this.alpha(x, y - 1) > 200) add.push([x, y]);
    }
    for (const [x, y] of add) this.set(x, y, c);
  }
  blit(src, dx, dy, a = 255) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const i = (y * src.w + x) * 4;
      if (src.d[i + 3]) this.set(dx + x, dy + y, [src.d[i], src.d[i + 1], src.d[i + 2]], a >= 255 ? src.d[i + 3] : (src.d[i + 3] * a) / 255);
    }
  }
  flipX() {
    const o = new Canvas(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = (y * this.w + x) * 4, j = (y * this.w + (this.w - 1 - x)) * 4;
      for (let k = 0; k < 4; k++) o.d[j + k] = this.d[i + k];
    }
    return o;
  }
  /** Ubah warna piksel buram: fn(r,g,b,x,y) => [r,g,b] */
  map(fn) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = (y * this.w + x) * 4;
      if (!this.d[i + 3]) continue;
      const c = fn(this.d[i], this.d[i + 1], this.d[i + 2], x, y);
      this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2];
    }
  }
  png() { return encodePNG(this.w, this.h, this.d); }
}

/** Susun frame ke satu atlas (shelf packing). frames: [{name, c, pivot:{x,y}, extra}] -> {canvas, json} */
export function packAtlas(frames, width = 2048, pad = 2) {
  const list = [...frames].sort((a, b) => b.c.h - a.c.h || b.c.w - a.c.w);
  let x = pad, y = pad, rowH = 0;
  const placed = [];
  for (const f of list) {
    if (x + f.c.w + pad > width) { x = pad; y += rowH + pad; rowH = 0; }
    placed.push({ f, x, y });
    x += f.c.w + pad; rowH = Math.max(rowH, f.c.h);
  }
  const height = y + rowH + pad;
  const canvas = new Canvas(width, height);
  const json = { frames: {}, meta: { app: 'gen-town-art.mjs', image: '', size: { w: width, h: height }, scale: '1' } };
  for (const { f, x: px, y: py } of placed) {
    canvas.blit(f.c, px, py);
    json.frames[f.name] = {
      frame: { x: px, y: py, w: f.c.w, h: f.c.h }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: f.c.w, h: f.c.h }, sourceSize: { w: f.c.w, h: f.c.h },
      pivot: f.pivot, ...(f.extra ?? {}),
    };
  }
  return { canvas, json };
}
