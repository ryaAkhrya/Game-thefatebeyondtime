// Toolkit gambar piksel untuk generator lingkungan (Hutan 1, Tepi Hutan, Hutan 2). Deterministik, tanpa aset luar.
// Berisi: encoder PNG, RNG/noise, palet berjenjang (ramp) dengan operasi "shade", kanvas piksel (poligon, elips, garis,
// garis tepi selektif), packer atlas Phaser, dan compositor pratinjau (untuk iterasi tanpa browser).
import { mkdirSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';
import { dirname } from 'node:path';

// ---------------------------------------------------------------- PNG
export function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
export function writeFileDeep(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}

// ---------------------------------------------------------------- util
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export function hash(ix, iy, seed = 0) {
  let h = Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(seed | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
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
  pick(arr) { return arr[Math.floor(this.f() * arr.length)]; }
  chance(p) { return this.f() < p; }
}

// ---------------------------------------------------------------- palet
const REG = new Map();
const hexRGB = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
/** Membuat ramp warna (gelap -> terang). Indeks 0 = nada garis tepi/bayangan terdalam. Warna adalah array [r,g,b]. */
export function ramp(name, hexes) {
  const arr = hexes.map(hexRGB);
  arr.name = name;
  arr.forEach((c, i) => {
    c.ramp = arr;
    c.i = i;
    c.rampName = name;
    REG.set((c[0] << 16) | (c[1] << 8) | c[2], c);
  });
  return arr;
}
export function solid(name, hexStr) {
  const c = hexRGB(hexStr);
  c.ramp = null;
  c.name = name;
  REG.set((c[0] << 16) | (c[1] << 8) | c[2], c);
  return c;
}
export const lookup = (r, g, b) => REG.get((r << 16) | (g << 8) | b);
/** Geser n langkah dalam ramp yang sama (negatif = lebih gelap). Warna tanpa ramp tidak berubah. */
export const shade = (c, n) => (c.ramp ? c.ramp[clamp(c.i + n, 0, c.ramp.length - 1)] : c);

// ---------------------------------------------------------------- kanvas
export class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }
  set(x, y, c, a = 255) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (a >= 255) {
      this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255;
    } else {
      const sa = a / 255, da = this.d[i + 3] / 255, oa = sa + da * (1 - sa);
      for (let k = 0; k < 3; k++) this.d[i + k] = (c[k] * sa + this.d[i + k] * da * (1 - sa)) / (oa || 1);
      this.d[i + 3] = oa * 255;
    }
  }
  alpha(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[(y * this.w + x) * 4 + 3];
  }
  /** warna objek terdaftar pada piksel (atau undefined) */
  col(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return undefined;
    const i = (y * this.w + x) * 4;
    if (this.d[i + 3] < 128) return undefined;
    return lookup(this.d[i], this.d[i + 1], this.d[i + 2]) ?? [this.d[i], this.d[i + 1], this.d[i + 2]];
  }
  rect(x, y, w, h, c, a = 255) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, a);
  }
  ellipse(cx, cy, rx, ry, c, a = 255) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, typeof c === 'function' ? c(x, y, dx, dy) : c, a);
      }
  }
  line(x0, y0, x1, y1, c, a = 255) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= n; i++) this.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c, a);
  }
  /** Poligon (isi even-odd) per piksel; c boleh fungsi (x,y) -> warna. */
  poly(pts, c) {
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yy = y + 0.5;
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + ((yy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, typeof c === 'function' ? c(x, y) : c);
    }
  }
  /**
   * Garis tepi luar 1 px. Warna = nada ramp[0] dari tetangga buram (selektif per bahan); mode 'flat' memakai warna tunggal.
   * Bagian dasar (baris bawah dengan alfa penuh) tidak diberi garis jika skipBottom.
   */
  outline(flat = null, opts = {}) {
    const add = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) > 40) continue;
        let src = null;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (this.alpha(x + dx, y + dy) > 200) { src = this.col(x + dx, y + dy); break; }
        }
        if (!src) continue;
        if (opts.skipBottom && this.alpha(x, y - 1) > 200 && y >= opts.skipBottom) continue;
        add.push([x, y, flat ?? (src.ramp ? src.ramp[0] : src)]);
      }
    for (const [x, y, c] of add) this.set(x, y, c);
  }
  blit(src, dx, dy) {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4;
        if (src.d[i + 3]) this.set(dx + x, dy + y, [src.d[i], src.d[i + 1], src.d[i + 2]], src.d[i + 3]);
      }
  }
  /** isi ulang semua piksel buram dengan fn(x,y,color) -> color */
  map(fn) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.col(x, y);
        if (!c) continue;
        const n = fn(x, y, c);
        if (n && n !== c) this.set(x, y, n);
      }
  }
}

// ---------------------------------------------------------------- noise periodik (ground)
export function makeNoise(zs, PP) {
  /** koordinat periodik: untuk x >= zs, bergulung tiap PP (kolom x dan x+PP identik) */
  const u = (x) => (x < zs ? x : zs + ((x - zs) % PP));
  function vnoise(x, y, cell, seed) {
    const gx = x / cell, gy = y / cell;
    const ix = Math.floor(gx), iy = Math.floor(gy);
    const fx = gx - ix, fy = gy - iy;
    const n = Math.round(PP / cell);
    const wrapI = (i) => {
      const rel = i * cell - zs;
      if (rel < 0) return i;
      return Math.floor(zs / cell) + (((Math.round(rel / cell) % n) + n) % n);
    };
    const h = (a, b) => hash(wrapI(a), b, seed);
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return (h(ix, iy) * (1 - sx) + h(ix + 1, iy) * sx) * (1 - sy) + (h(ix, iy + 1) * (1 - sx) + h(ix + 1, iy + 1) * sx) * sy;
  }
  return { u, vnoise };
}

// ---------------------------------------------------------------- atlas
/** Packer rak sederhana; mengembalikan {canvas, frames} dalam format Phaser JSON Hash. sprites: {name:{c:Canvas, anchorY, anchorX?, foot?}} */
export function packAtlas(sprites, width = 512, meta = {}) {
  let x = 0, y = 0, rowH = 0;
  const placed = {};
  for (const [name, s] of Object.entries(sprites)) {
    if (x + s.c.w + 2 > width) { x = 0; y += rowH + 2; rowH = 0; }
    placed[name] = { x, y };
    x += s.c.w + 2;
    rowH = Math.max(rowH, s.c.h);
  }
  const H = y + rowH + 2;
  const atlas = new Canvas(width, H);
  const frames = {};
  for (const [name, s] of Object.entries(sprites)) {
    const p = placed[name];
    atlas.blit(s.c, p.x, p.y);
    frames[name] = {
      frame: { x: p.x, y: p.y, w: s.c.w, h: s.c.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: s.c.w, h: s.c.h },
      sourceSize: { w: s.c.w, h: s.c.h },
      pivot: { x: (s.anchorX ?? s.c.w / 2) / s.c.w, y: s.anchorY / s.c.h },
      foot: s.foot ?? [0, 0],
    };
  }
  return { atlas, frames, json: { frames, meta: { app: 'web/scripts', version: '2', image: meta.image ?? 'props.png', format: 'RGBA8888', size: { w: atlas.w, h: atlas.h }, scale: '1', status: 'DRAFT', ...meta } } };
}

// ---------------------------------------------------------------- pratinjau
/**
 * Menyusun pratinjau: ground (Canvas) + daftar prop {x,y,sprite:{c,anchorY,anchorX}} diurutkan menurut y, dipotong ke rect
 * dan diperbesar zoom kali. Untuk iterasi tanpa browser (bukan bagian build).
 */
export function composePreview(ground, props, rect, zoom, extra = []) {
  const out = new Canvas(rect.w, rect.h);
  for (let y = 0; y < rect.h; y++)
    for (let x = 0; x < rect.w; x++) {
      const gx = rect.x + x, gy = rect.y + y;
      if (gx < 0 || gy < 0 || gx >= ground.w || gy >= ground.h) { out.set(x, y, [30, 22, 37]); continue; }
      const i = (gy * ground.w + gx) * 4;
      out.set(x, y, [ground.d[i], ground.d[i + 1], ground.d[i + 2]]);
    }
  const list = [...props.map((p) => ({ ...p, depth: p.y })), ...extra].sort((a, b) => a.depth - b.depth);
  for (const p of list) {
    const s = p.sprite;
    const ox = p.x - (s.anchorX ?? s.c.w / 2) - rect.x, oy = p.y - s.anchorY - rect.y;
    if (ox > rect.w || oy > rect.h || ox + s.c.w < 0 || oy + s.c.h < 0) continue;
    out.blit(s.c, Math.round(ox), Math.round(oy));
  }
  const big = new Canvas(rect.w * zoom, rect.h * zoom);
  for (let y = 0; y < rect.h; y++)
    for (let x = 0; x < rect.w; x++) {
      const i = (y * rect.w + x) * 4;
      for (let a = 0; a < zoom; a++) for (let b = 0; b < zoom; b++) {
        const j = ((y * zoom + a) * big.w + x * zoom + b) * 4;
        big.d[j] = out.d[i]; big.d[j + 1] = out.d[i + 1]; big.d[j + 2] = out.d[i + 2]; big.d[j + 3] = 255;
      }
    }
  return big;
}
