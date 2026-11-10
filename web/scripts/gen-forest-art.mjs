// Generator art DRAFT untuk Hutan 1 (lingkungan). Menulis:
//   public/assets/environment/forest1/ground.png        dasar peta (rumput, jalan tanah, glade, jejak)
//   public/assets/environment/forest1/props.png + .json atlas prop (pohon, batu, papan, peti, dll.; format Phaser JSON Hash)
// Seluruh gambar digambar oleh kode ini (tanpa aset luar / internet / lisensi pihak ketiga). STATUS: DRAFT dev art,
// mudah diganti: tukar file PNG/JSON dengan nama yang sama, peta dan collision tidak berubah (collision dari forest1.map.mjs).
//   node scripts/gen-forest-art.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';
import { buildForest1, FOOT, TILE } from '../src/game/data/maps/forest1.map.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/assets/environment/forest1');
mkdirSync(outDir, { recursive: true });

// ---------- PNG ----------
function encodePNG(w, h, rgba) {
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

// ---------- util ----------
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const H = (h) => hex(h);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function hash(ix, iy, seed = 0) {
  let h = Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(seed | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }
  set(x, y, c, a = 255) {
    x |= 0;
    y |= 0;
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
  rect(x, y, w, h, c, a = 255) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, a);
  }
  ellipse(cx, cy, rx, ry, c, a = 255) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c, a);
      }
  }
  line(x0, y0, x1, y1, c, a = 255) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= n; i++) this.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c, a);
  }
  /** garis luar 1 px pada tepi alfa */
  outline(c) {
    const add = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) > 200) continue;
        if (this.alpha(x + 1, y) > 200 || this.alpha(x - 1, y) > 200 || this.alpha(x, y + 1) > 200 || this.alpha(x, y - 1) > 200) add.push([x, y]);
      }
    for (const [x, y] of add) this.set(x, y, c);
  }
  blit(src, dx, dy) {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4;
        if (src.d[i + 3]) this.set(dx + x, dy + y, [src.d[i], src.d[i + 1], src.d[i + 2]], src.d[i + 3]);
      }
  }
}

// ---------- palet ----------
const OUT = H('#1b1620');
const LEAF = ['#1d3628', '#2a4d34', '#3b683c', '#55874a', '#7dab5b'].map(H);
const GRASS = ['#2e4934', '#395a3b', '#466b42', '#58804a', '#739a58'].map(H);
const DIRT = ['#5a3f2f', '#74533a', '#8f6a45', '#aa8657'].map(H);
const DIRT_RIM = H('#47311f');
const STONE = ['#34333f', '#52515f', '#757580', '#a2a29f'].map(H);
const MOSS = H('#5d7d46');
const WOOD = ['#2f221b', '#4b3425', '#6b4a31', '#8d6841'].map(H);
const IRON = ['#2a2a32', '#4c4c58', '#7e7e8a'].map(H);
const STEEL = ['#3a3d4a', '#6b7083', '#a3a9bb', '#d4d8e2'].map(H);
const SHADOW = H('#10161a');

// ---------- sprite: kanopi ----------
function canopy(c, blobs, rnd, pal = LEAF, seed = 1) {
  const minX = Math.min(...blobs.map((b) => b.x - b.r - 2)), maxX = Math.max(...blobs.map((b) => b.x + b.r + 2));
  const minY = Math.min(...blobs.map((b) => b.y - b.r - 2)), maxY = Math.max(...blobs.map((b) => b.y + b.r + 2));
  for (let y = Math.floor(minY); y <= maxY; y++)
    for (let x = Math.floor(minX); x <= maxX; x++) {
      let best = null;
      for (const b of blobs) {
        const wob = (hash(Math.floor(x / 3), Math.floor(y / 3), seed) - 0.5) * 3.4;
        const d = Math.hypot(x + 0.5 - b.x, y + 0.5 - b.y) + wob;
        if (d <= b.r) {
          const nd = d / b.r;
          const light = ((x - b.x) * -0.55 + (y - b.y) * -0.83) / b.r; // cahaya dari kiri-atas
          if (!best || nd < best.nd) best = { nd, light, b };
        }
      }
      if (!best) continue;
      const clump = hash(Math.floor(x / 3), Math.floor(y / 3), seed + 9);
      let s = 0.52 + best.light * 0.34 - best.nd * 0.18 + (clump - 0.5) * 0.42;
      s += (bayer(x, y) - 0.5) * 0.16;
      c.set(x, y, pal[clamp(Math.floor(s * pal.length), 0, pal.length - 1)]);
    }
  void rnd;
}

function groundShadow(c, cx, cy, rx, ry) {
  c.ellipse(cx, cy, rx, ry, SHADOW, 70);
}

function trunk(c, cx, baseY, w, h, flare = 4) {
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const hw = Math.round(w / 2 + (t > 0.75 ? ((t - 0.75) / 0.25) * flare : 0));
    for (let x = -hw; x <= hw; x++) {
      const n = hash(x + 50, Math.floor(y / 3), 5);
      const lit = x < -hw * 0.25 ? 2 : x < hw * 0.35 ? 1 : 0;
      c.set(cx + x, baseY - y, WOOD[clamp(lit + (n > 0.78 ? -1 : 0) + (n < 0.12 ? 1 : 0), 0, 3)]);
    }
  }
}

function drawTree(variant, seed) {
  const c = new Canvas(112, 136);
  const cx = 56, base = 128;
  groundShadow(c, cx, base - 2, 26, 6);
  trunk(c, cx, base, 11 + (variant === 'b' ? 2 : 0), 54, 5);
  const blobs =
    variant === 'a'
      ? [{ x: cx, y: 52, r: 24 }, { x: cx - 20, y: 62, r: 17 }, { x: cx + 21, y: 60, r: 18 }, { x: cx - 8, y: 36, r: 16 }, { x: cx + 12, y: 40, r: 15 }, { x: cx + 2, y: 70, r: 14 }]
      : [{ x: cx - 4, y: 50, r: 22 }, { x: cx + 18, y: 56, r: 19 }, { x: cx - 22, y: 58, r: 15 }, { x: cx + 4, y: 30, r: 15 }, { x: cx - 14, y: 38, r: 13 }, { x: cx + 20, y: 38, r: 12 }, { x: cx + 6, y: 68, r: 13 }];
  canopy(c, blobs, null, LEAF, seed);
  c.outline(OUT);
  return c;
}

function drawPine(seed) {
  const c = new Canvas(80, 140);
  const cx = 40, base = 132;
  groundShadow(c, cx, base - 2, 20, 5);
  trunk(c, cx, base, 7, 40, 3);
  const tiers = [{ y: 92, w: 30, h: 34 }, { y: 70, w: 25, h: 32 }, { y: 49, w: 20, h: 29 }, { y: 30, w: 14, h: 26 }, { y: 14, w: 8, h: 20 }];
  for (const [ti, t] of tiers.entries()) {
    for (let j = 0; j < t.h; j++) {
      const k = j / t.h;
      const hw = t.w * (0.18 + 0.82 * k);
      const jag = (hash(j, ti, seed) - 0.5) * 3;
      for (let x = -Math.floor(hw + jag); x <= Math.floor(hw + jag); x++) {
        const light = (-x / (hw + 1)) * 0.5 - k * 0.25 + 0.35;
        const clump = hash(Math.floor((x + 40) / 3), Math.floor((t.y + j) / 3), seed + ti);
        const s = light + (clump - 0.5) * 0.45 + (bayer(x + 40, t.y + j) - 0.5) * 0.14;
        c.set(cx + x, t.y - t.h + j + 6 + (ti === 0 ? 0 : 0), LEAF[clamp(Math.floor(s * 5), 0, 4)]);
      }
    }
  }
  c.outline(OUT);
  return c;
}

function drawDead() {
  const c = new Canvas(80, 110);
  const cx = 40, base = 102;
  groundShadow(c, cx, base - 2, 16, 4);
  trunk(c, cx, base, 8, 62, 4);
  const br = (x0, y0, x1, y1, w) => {
    for (let i = 0; i < w; i++) {
      c.line(x0 + i, y0, x1 + i, y1, WOOD[1]);
    }
    c.line(x0, y0, x1, y1, WOOD[2]);
  };
  br(cx - 3, base - 50, cx - 24, base - 76, 3);
  br(cx + 2, base - 44, cx + 22, base - 68, 3);
  br(cx, base - 62, cx - 6, base - 90, 3);
  br(cx - 14, base - 66, cx - 24, base - 70, 2);
  br(cx + 12, base - 56, cx + 24, base - 82, 2);
  c.outline(OUT);
  return c;
}

function drawRock(w, h, seed, moss = true) {
  const c = new Canvas(w + 8, h + 10);
  const cx = (w + 8) / 2, cy = h * 0.58;
  groundShadow(c, cx, cy + h * 0.5, w * 0.5, 4);
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const dx = (x + 0.5 - cx) / (w / 2), dy = (y + 0.5 - cy) / (h * 0.55);
      const wob = (hash(Math.floor(x / 4), Math.floor(y / 4), seed) - 0.5) * 0.28;
      const d = Math.hypot(dx, dy * (dy < 0 ? 1.05 : 1.4)) + wob;
      if (d > 1) continue;
      const light = -dx * 0.45 - dy * 0.7;
      const facet = hash(Math.floor((x + y) / 5), Math.floor((x - y) / 5), seed + 3);
      let s = 0.45 + light * 0.4 + (facet - 0.5) * 0.35 + (bayer(x, y) - 0.5) * 0.12;
      let col = STONE[clamp(Math.floor(s * 4), 0, 3)];
      if (moss && dy < -0.15 && hash(Math.floor(x / 3), Math.floor(y / 3), seed + 11) > 0.45) col = MOSS;
      c.set(x, y, col);
    }
  c.outline(OUT);
  return c;
}

function drawBush(seed, dark = false) {
  const c = new Canvas(64, 50);
  groundShadow(c, 32, 44, 22, 4);
  canopy(c, [{ x: 32, y: 26, r: 15 }, { x: 18, y: 32, r: 11 }, { x: 46, y: 32, r: 11 }, { x: 28, y: 18, r: 10 }, { x: 40, y: 22, r: 9 }], null, dark ? LEAF.map((v) => v.map((q) => Math.round(q * 0.85))) : LEAF, seed);
  c.outline(OUT);
  return c;
}

function drawThicket(open, seed) {
  const c = new Canvas(88, 58);
  const dark = LEAF.map((v) => v.map((q) => Math.round(q * 0.8)));
  groundShadow(c, 44, 52, 34, 4);
  const blobsLeft = [{ x: 18, y: 36, r: 15 }, { x: 28, y: 28, r: 13 }, { x: 10, y: 42, r: 9 }, { x: 24, y: 42, r: 10 }];
  const blobsRight = [{ x: 70, y: 36, r: 15 }, { x: 60, y: 28, r: 13 }, { x: 78, y: 42, r: 9 }, { x: 64, y: 42, r: 10 }];
  const mid = [{ x: 44, y: 32, r: 14 }, { x: 40, y: 40, r: 11 }, { x: 50, y: 40, r: 11 }, { x: 44, y: 24, r: 9 }];
  canopy(c, open ? [...blobsLeft, ...blobsRight] : [...blobsLeft, ...blobsRight, ...mid], null, dark, seed);
  // duri
  for (let i = 0; i < (open ? 16 : 30); i++) {
    const x = Math.floor(hash(i, 1, seed) * 84) + 2, y = Math.floor(hash(i, 2, seed) * 36) + 16;
    if (c.alpha(x, y) > 0 && !(open && x > 30 && x < 58)) {
      c.line(x, y, x + (hash(i, 3, seed) > 0.5 ? 3 : -3), y - 3, H('#a8946a'));
    }
  }
  if (open) {
    // tanah terinjak pada celah
    for (let y = 36; y < 54; y++) for (let x = 32; x < 56; x++) if (c.alpha(x, y) === 0 && Math.abs(x - 44) < 12 - (y - 36) * 0.15) c.set(x, y, DIRT[(x + y) % 3 === 0 ? 1 : 2], 255);
  }
  c.outline(OUT);
  return c;
}

function drawStump() {
  const c = new Canvas(48, 44);
  groundShadow(c, 24, 38, 16, 4);
  for (let y = 14; y < 38; y++) for (let x = 8; x < 40; x++) {
    const dx = (x - 24) / 16;
    if (Math.abs(dx) > 1) continue;
    const lit = dx < -0.3 ? 2 : dx < 0.4 ? 1 : 0;
    c.set(x, y, WOOD[clamp(lit + (hash(x, Math.floor(y / 2), 8) > 0.82 ? -1 : 0), 0, 3)]);
  }
  c.ellipse(24, 16, 16, 7, WOOD[3]);
  c.ellipse(24, 16, 11, 4.5, WOOD[2]);
  c.ellipse(24, 16, 6, 2.5, WOOD[3]);
  c.ellipse(24, 16, 2, 1, WOOD[1]);
  for (let i = 0; i < 8; i++) c.set(10 + i * 3, 14 + (i % 2), MOSS);
  c.outline(OUT);
  return c;
}

function drawLog() {
  const c = new Canvas(104, 40);
  groundShadow(c, 52, 34, 40, 4);
  for (let x = 8; x < 96; x++) for (let y = 12; y < 33; y++) {
    const dy = (y - 22.5) / 10.5;
    if (Math.abs(dy) > 1) continue;
    const lit = dy < -0.35 ? 3 : dy < 0.25 ? 2 : dy < 0.65 ? 1 : 0;
    c.set(x, y, WOOD[clamp(lit - (hash(Math.floor(x / 4), y, 4) > 0.86 ? 1 : 0), 0, 3)]);
  }
  c.ellipse(9, 22.5, 4, 10.5, WOOD[3]);
  c.ellipse(9, 22.5, 2.2, 6, WOOD[2]);
  for (let x = 22; x < 80; x += 2) if (hash(x, 1, 6) > 0.35) c.set(x, 13 + (x % 3), MOSS);
  c.outline(OUT);
  return c;
}

function drawSign() {
  const c = new Canvas(48, 60);
  groundShadow(c, 24, 54, 11, 3);
  c.rect(22, 20, 5, 34, WOOD[1]);
  c.rect(22, 20, 2, 34, WOOD[2]);
  // papan miring sedikit
  for (let y = 0; y < 15; y++) for (let x = 0; x < 38; x++) {
    const yy = 8 + y + Math.floor((x - 19) * 0.04);
    c.set(5 + x, yy, y < 2 ? WOOD[3] : y > 12 ? WOOD[0] : WOOD[hash(Math.floor(x / 5), y, 12) > 0.8 ? 1 : 2]);
  }
  for (let x = 9; x < 40; x += 3) c.set(x, 13 + (x % 2), WOOD[0]); // goresan tulisan
  for (let x = 9; x < 34; x += 3) c.set(x, 17 + (x % 2), WOOD[0]);
  for (const [x, y] of [[8, 11], [39, 12], [8, 20], [39, 21]]) c.set(x, y, IRON[2]); // paku
  // tali ikat ulang pada tiang
  for (let i = 0; i < 5; i++) c.line(21, 26 + i * 2, 27, 27 + i * 2, H('#b09a6a'));
  c.outline(OUT);
  return c;
}

function drawChest(open) {
  const c = new Canvas(40, 40);
  groundShadow(c, 20, 34, 15, 3);
  const body = (x0, y0, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) c.set(x0 + x, y0 + y, WOOD[x < 3 ? 3 : x > w - 4 ? 1 : 2 - (y % 6 === 5 ? 1 : 0)]);
  };
  body(6, 20, 28, 14);
  c.rect(6, 25, 28, 2, IRON[1]);
  c.rect(18, 24, 4, 5, IRON[2]);
  c.rect(19, 26, 2, 2, IRON[0]);
  if (!open) {
    for (let y = 0; y < 9; y++) for (let x = 0; x < 28; x++) {
      const t = (x - 14) / 14;
      if (y > 8 - Math.round((1 - t * t) * 3) - 6 + 6) continue;
      c.set(6 + x, 12 + y, WOOD[x < 4 ? 3 : x > 24 ? 1 : 2]);
    }
    c.rect(6, 12, 28, 1, IRON[2]);
    c.rect(6, 18, 28, 2, IRON[1]);
    c.rect(18, 17, 4, 5, IRON[2]);
  } else {
    c.rect(8, 19, 24, 5, WOOD[0]); // bagian dalam gelap
    for (let y = 0; y < 11; y++) for (let x = 0; x < 26; x++) c.set(7 + x, 8 + y, WOOD[x < 3 ? 3 : x > 22 ? 1 : 1 + (y % 5 === 0 ? 0 : 1)]); // tutup terangkat
    c.rect(7, 16, 26, 2, IRON[1]);
    c.rect(11, 22, 18, 1, H('#c9a640')); // kilau isi
  }
  c.outline(OUT);
  return c;
}

function drawSword() {
  const c = new Canvas(32, 72);
  groundShadow(c, 16, 66, 8, 2);
  for (let y = 0; y < 44; y++) {
    const hw = y < 6 ? 1 + Math.floor(y / 3) : 3;
    const tipTaper = y > 38 ? 0 : 0;
    void tipTaper;
    for (let x = -hw; x <= hw; x++) c.set(16 + x, 62 - y - 0, STEEL[x < -1 ? 3 : x < 1 ? 2 : x < 3 ? 1 : 0]);
  }
  c.rect(12, 14, 9, 3, WOOD[1]); // gagang di atas
  c.rect(13, 6, 7, 8, WOOD[2]);
  c.rect(10, 17, 13, 2, IRON[1]);
  c.rect(14, 3, 5, 3, WOOD[1]);
  c.rect(16, 63, 1, 2, H('#2c2118')); // tertancap tanah
  c.outline(OUT);
  return c;
}

function drawMarker(seed) {
  const c = new Canvas(40, 62);
  groundShadow(c, 20, 56, 13, 3);
  for (let y = 6; y < 56; y++) for (let x = 6; x < 34; x++) {
    const dx = (x - 20) / 14;
    const top = 10 + Math.abs(dx) * 8;
    if (y < top || Math.abs(dx) > 1 - Math.max(0, (y - 48) / 30) * 0.05) continue;
    const lit = dx < -0.25 ? 2 : dx < 0.35 ? 1 : 0;
    const n = hash(Math.floor(x / 3), Math.floor(y / 3), seed);
    c.set(x, y, STONE[clamp(lit + (n > 0.8 ? -1 : n < 0.15 ? 1 : 0) + 1, 0, 3)]);
    if (y < 22 && n > 0.55) c.set(x, y, MOSS);
  }
  // motif dua garis hampir bertemu (ukiran halus)
  c.line(11, 34, 18, 34, STONE[3]);
  c.line(22, 34, 29, 34, STONE[3]);
  c.line(12, 36, 18, 36, STONE[0]);
  c.line(22, 36, 28, 36, STONE[0]);
  c.outline(OUT);
  return c;
}

function drawFern(seed) {
  const c = new Canvas(40, 34);
  for (let f = 0; f < 7; f++) {
    const ang = -Math.PI / 2 + (f - 3) * 0.42;
    const len = 12 + hash(f, 1, seed) * 6;
    for (let t = 0; t <= len; t++) {
      const x = 20 + Math.cos(ang) * t, y = 30 + Math.sin(ang) * t * 0.9 + (t * t) / 60;
      c.set(x, y, LEAF[2 + (t % 3 === 0 ? 1 : 0)]);
      if (t > 3 && t % 2 === 0) { c.set(x - 1, y + 1, LEAF[1]); c.set(x + 1, y + 1, LEAF[3]); }
    }
  }
  c.outline(OUT);
  return c;
}

function drawFlowers(seed) {
  const c = new Canvas(36, 24);
  for (let i = 0; i < 12; i++) {
    const x = 4 + Math.floor(hash(i, 1, seed) * 28), y = 8 + Math.floor(hash(i, 2, seed) * 12);
    c.line(x, y, x, y + 5, LEAF[1]);
    c.set(x - 1, y + 3, LEAF[3]);
  }
  const cols = [H('#e6dfc4'), H('#d8b84c'), H('#9a7ec0'), H('#e6dfc4')];
  for (let i = 0; i < 9; i++) {
    const x = 4 + Math.floor(hash(i + 20, 1, seed) * 28), y = 6 + Math.floor(hash(i + 20, 2, seed) * 12);
    const col = cols[i % 4];
    c.set(x, y, col); c.set(x - 1, y, col); c.set(x + 1, y, col); c.set(x, y - 1, col); c.set(x, y + 1, H('#f3e08a'));
  }
  return c;
}

function drawMushrooms() {
  const c = new Canvas(32, 24);
  for (const [x, y, r] of [[9, 17, 5], [18, 14, 6], [24, 19, 4]]) {
    c.rect(x - 1, y, 3, 5, H('#d9cdb4'));
    c.ellipse(x, y, r, r * 0.65, H('#a85d3e'));
    c.ellipse(x - 1, y - 1, r * 0.55, r * 0.3, H('#c97f55'));
    c.set(x + 1, y - 1, H('#efe4cd')); c.set(x - 2, y, H('#efe4cd'));
  }
  c.outline(OUT);
  return c;
}

// ---------- atlas ----------
const sprites = {
  tree_a: drawTree('a', 3),
  tree_b: drawTree('b', 7),
  tree_pine: drawPine(5),
  tree_dead: drawDead(),
  rock_l: drawRock(64, 44, 2),
  rock_s: drawRock(34, 24, 9),
  bush: drawBush(4),
  thicket_closed: drawThicket(false, 21),
  thicket_open: drawThicket(true, 21),
  stump: drawStump(),
  log: drawLog(),
  sign: drawSign(),
  chest_closed: drawChest(false),
  chest_open: drawChest(true),
  sword: drawSword(),
  marker_stone: drawMarker(6),
  fern: drawFern(3),
  flowers: drawFlowers(5),
  mushrooms: drawMushrooms(),
};

// titik acuan (tengah-bawah) per sprite: baris dasar (y) tempat objek berpijak
const ANCHOR_Y = { tree_a: 128, tree_b: 128, tree_pine: 132, tree_dead: 102, rock_l: 45, rock_s: 25, bush: 44, thicket_closed: 52, thicket_open: 52, stump: 38, log: 34, sign: 54, chest_closed: 34, chest_open: 34, sword: 64, marker_stone: 56, fern: 31, flowers: 23, mushrooms: 22 };

let x = 0, y = 0, rowH = 0;
const ATLAS_W = 512;
const placed = {};
for (const [name, s] of Object.entries(sprites)) {
  if (x + s.w + 2 > ATLAS_W) { x = 0; y += rowH + 2; rowH = 0; }
  placed[name] = { x, y, w: s.w, h: s.h };
  x += s.w + 2;
  rowH = Math.max(rowH, s.h);
}
const ATLAS_H = y + rowH + 2;
const atlas = new Canvas(ATLAS_W, ATLAS_H);
const frames = {};
for (const [name, s] of Object.entries(sprites)) {
  const p = placed[name];
  atlas.blit(s, p.x, p.y);
  frames[name] = {
    frame: { x: p.x, y: p.y, w: p.w, h: p.h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: p.w, h: p.h },
    sourceSize: { w: p.w, h: p.h },
    pivot: { x: 0.5, y: ANCHOR_Y[name] / p.h },
    foot: FOOT[name] ?? [0, 0],
  };
}
writeFileSync(resolve(outDir, 'props.png'), encodePNG(atlas.w, atlas.h, atlas.d));
writeFileSync(
  resolve(outDir, 'props.json'),
  JSON.stringify({ frames, meta: { app: 'web/scripts/gen-forest-art.mjs', version: '1', image: 'props.png', format: 'RGBA8888', size: { w: atlas.w, h: atlas.h }, scale: '1', status: 'DRAFT' } }, null, 1),
);

// ---------- dasar peta ----------
const map = buildForest1();
const { width: GW, height: GH } = map;
const zs = map.zone.start, PP = map.zone.period;
const ground = new Canvas(GW, GH);

/** koordinat periodik: untuk x >= zs, gelombang noise berulang tiap periode agar tidak ada sambungan. */
const u = (x) => (x < zs ? x : zs + ((x - zs) % PP));
function vnoise(x, y, cell, seed) {
  const gx = x / cell, gy = y / cell;
  const ix = Math.floor(gx), iy = Math.floor(gy);
  const fx = gx - ix, fy = gy - iy;
  const wrapI = (i) => {
    const rel = i * cell - zs;
    if (rel < 0) return i;
    const n = Math.round(PP / cell);
    return Math.floor(zs / cell) + (((Math.round(rel / cell) % n) + n) % n);
  };
  const h = (a, b) => hash(wrapI(a), b, seed);
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return (h(ix, iy) * (1 - sx) + h(ix + 1, iy) * sx) * (1 - sy) + (h(ix, iy + 1) * (1 - sx) + h(ix + 1, iy + 1) * sx) * sy;
}
const fbm = (x, y, seed) => vnoise(x, y, 32, seed) * 0.3 + vnoise(x, y, 12, seed + 1) * 0.35 + vnoise(x, y, 4, seed + 2) * 0.35;
const cellHash = (x, y, cell, seed) => {
  const ux = u(x);
  return hash(Math.floor(ux / cell), Math.floor(y / cell), seed);
};

const trailXs = [];
for (let k = 0; k < map.zone.copies; k++) trailXs.push(zs + k * PP + map.trail.localX);
const road = map.road;
const roadC = (road.y0 + road.y1) / 2;

function dirtField(x, y) {
  const ux = u(x);
  // jalan utama: muncul dari tepi clearing
  const wob = (vnoise(ux, y, 16, 31) - 0.5) * 9 + (vnoise(ux, y, 48, 33) - 0.5) * 8;
  let f = 30 + wob - Math.abs(y - roadC);
  const ramp = (x - 232) / 70; // pangkal jalan: mengecil jadi jalur terinjak
  if (ramp < 1) f = Math.min(f, (ramp - 0.15) * 40 + wob);
  // jalan setapak
  for (const tx of trailXs) {
    if (y > 40 && y < road.y0 + 6) {
      const tw = 21 + (vnoise(x, y, 16, 37) - 0.5) * 7 + (y < 90 ? (y - 40) * -0.1 : 0);
      const sway = (vnoise(y, 0, 32, 39) - 0.5) * 10;
      f = Math.max(f, tw - Math.abs(x - (tx + sway)));
    }
  }
  return f;
}

const cl = map.clearing;
const matted = { cx: 150, cy: 447, rx: 38, ry: 21 };
const prints = [
  [118, 468, 0.2], [108, 480, -0.3], [124, 486, 0.1], [98, 466, 0.4], [142, 482, -0.1], [170, 470, 0.3], [182, 486, 0.0], [196, 474, 0.2],
  [110, 428, -0.2], [100, 416, 0.1], [130, 410, 0.0], [212, 450, 0.3], [226, 462, -0.1], [238, 476, 0.2], [250, 488, 0.0],
];

for (let y = 0; y < GH; y++) {
  for (let x = 0; x < GW; x++) {
    const ux = u(x);
    // ---- rumput dasar ----
    const dyCorr = Math.max(0, Math.abs(y - roadC) - 70);
    const inClear = Math.hypot((x - cl.cx) / cl.rx, (y - cl.cy) / cl.ry);
    const glade = (() => {
      let g = 9;
      for (const tx of trailXs) g = Math.min(g, Math.hypot((x - tx) / map.trail.gladeRX, (y - map.trail.gladeCY) / map.trail.gladeRY));
      return g;
    })();
    let forest = smooth(0, 200, dyCorr) * 1.5;
    if (inClear < 1.15) forest = Math.min(forest, smooth(1.0, 1.15, inClear) * 0.9);
    if (x < zs) forest = Math.max(forest, smooth(0, 120, Math.max(0, Math.abs(y - cl.cy) - cl.ry * 0.7)) * 1.2 * smooth(zs - 60, zs - 140, x) + (inClear > 1.1 ? 0.5 : 0));
    if (glade < 1.25) forest = Math.min(forest, smooth(1.0, 1.25, glade) * 1.0);
    // lorong atas jalan setapak (di antara pohon)
    for (const tx of trailXs) if (Math.abs(x - tx) < 40 && y < road.y0 && y > 40) forest = Math.min(forest, 0.7);

    let n = fbm(ux, y, 4);
    n += (vnoise(ux, y, 3, 8) - 0.5) * 0.18;
    let shade = n * 3.0 + 0.4 - forest * 1.35 + (inClear < 1 ? 0.35 : 0) + (glade < 1 ? 0.3 : 0);
    shade += (bayer(x, y) - 0.5) * 0.7;
    let col = GRASS[clamp(Math.floor(shade), 0, 4)];
    // ---- tanah ----
    const f = dirtField(x, y);
    if (f > 0) {
      const dn = vnoise(ux, y, 4, 41) * 0.6 + vnoise(ux, y, 2, 43) * 0.4;
      let di = clamp(Math.floor(dn * 3.2 + (bayer(x, y) - 0.5) * 0.9 + (f < 7 ? -0.6 : 0.2)), 0, 3);
      col = DIRT[di];
      if (f < 2.3) col = DIRT_RIM;
      // alur roda
      const ry = Math.abs(y - (roadC - 9)) < 1 || Math.abs(y - (roadC + 9)) < 1;
      if (ry && x > 330 && cellHash(x, y, 6, 51) > 0.3) col = DIRT[0];
      // kerikil
      const ph = hash(Math.floor(ux), y, 53);
      if (f > 5 && ph > 0.975) col = DIRT_RIM;
      if (f > 5 && ph > 0.992) col = STONE[1];
    } else if (f > -2.6) {
      col = GRASS[clamp(Math.floor(shade) - 1, 0, 2)]; // tepi rumput menggelap
      if (cellHash(x, y, 3, 55) > 0.55) col = GRASS[0];
    }
    // ---- area terinjak tempat Yaric berbaring ----
    const md = Math.hypot((x - matted.cx) / matted.rx, (y - matted.cy) / matted.ry);
    if (md < 1) {
      const wob = vnoise(x, y, 6, 61);
      if (md < 0.8 + wob * 0.2) col = (x + y) % 3 === 0 ? H('#6f7f45') : H('#7d8d4c');
      if (md < 0.55 && bayer(x, y) > 0.45) col = H('#8a9856');
    }
    ground.set(x, y, col);
  }
}

// ---- detail tersebar: jumput rumput, bunga, daun gugur, jejak ----
function tuft(cx, cy, light) {
  const c1 = GRASS[light ? 4 : 0], c2 = GRASS[light ? 3 : 1];
  ground.set(cx, cy, c1); ground.set(cx - 1, cy - 1, c2); ground.set(cx + 1, cy - 1, c2); ground.set(cx, cy - 2, c1);
}
for (let gy = 0; gy < GH; gy += 8) {
  for (let gx = 0; gx < GW; gx += 8) {
    const ux = u(gx);
    const cx = gx + Math.floor(hash(Math.floor(ux / 8), gy, 71) * 8);
    const cy = gy + Math.floor(hash(Math.floor(ux / 8), gy, 72) * 8);
    if (dirtField(cx, cy) > -3) continue;
    const r = hash(Math.floor(ux / 8), gy, 73);
    const dyCorr = Math.max(0, Math.abs(cy - roadC) - 70);
    const dense = 0.32 - smooth(0, 260, dyCorr) * 0.1;
    if (r < dense) tuft(cx, cy, r < dense * 0.45 && dyCorr < 120);
    const fr = hash(Math.floor(ux / 8), gy, 74);
    const lit = dyCorr < 90 || Math.hypot((cx - cl.cx) / cl.rx, (cy - cl.cy) / cl.ry) < 1;
    if (lit && fr < 0.045) {
      const fc = [H('#e6dfc4'), H('#d8b84c'), H('#9a7ec0'), H('#e6dfc4')][Math.floor(hash(Math.floor(ux / 8), gy, 75) * 4)];
      ground.set(cx, cy, fc); ground.set(cx + 1, cy, fc); ground.set(cx, cy - 1, H('#f3e08a'));
    }
    if (fr > 0.985) { // daun gugur hangat (selaras jubah Yaric)
      const lc = [H('#a2583a'), H('#b8893f'), H('#8d4b34')][Math.floor(hash(Math.floor(ux / 8), gy, 76) * 3)];
      ground.set(cx, cy, lc); ground.set(cx + 1, cy, lc);
    }
  }
}
for (const [px, py, tilt] of prints) {
  for (const side of [-1, 1]) {
    const fx = px + side * 3, fy = py + (side > 0 ? 3 : 0);
    ground.ellipse(fx + tilt * 3, fy, 1.8, 3, H('#4c3d28'));
    ground.set(fx + tilt * 3, fy - 2, H('#5f4d33'));
  }
}
// bekas siluet pedang/tas yang menekan rumput dekat tempat bangun
ground.line(212, 424, 232, 428, H('#4c3d28'));

writeFileSync(resolve(outDir, 'ground.png'), encodePNG(GW, GH, ground.d));
console.log(`props.png ${atlas.w}x${atlas.h} (${Object.keys(sprites).length} sprite), ground.png ${GW}x${GH}`);
void TILE;

if (process.env.DEBUG_ZOOM) {
  const z = 3;
  const big = new Canvas(atlas.w * z, atlas.h * z);
  big.rect(0, 0, big.w, big.h, [96, 130, 96]);
  for (let yy = 0; yy < atlas.h; yy++) for (let xx = 0; xx < atlas.w; xx++) {
    const i = (yy * atlas.w + xx) * 4;
    if (atlas.d[i + 3]) for (let a = 0; a < z; a++) for (let b = 0; b < z; b++) big.set(xx * z + a, yy * z + b, [atlas.d[i], atlas.d[i + 1], atlas.d[i + 2]], atlas.d[i + 3]);
  }
  mkdirSync(process.env.DEBUG_ZOOM, { recursive: true });
  writeFileSync(resolve(process.env.DEBUG_ZOOM, 'props_x3.png'), encodePNG(big.w, big.h, big.d));
}
