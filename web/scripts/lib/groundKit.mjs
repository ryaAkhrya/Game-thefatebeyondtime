// Kit dasar peta (ground bake) untuk peta berzona periodik (Hutan 1) maupun peta biasa (periodik tidak aktif).
// Prinsip: nada tanah ditentukan per piksel oleh medan kontinu lalu DIPOSTERISASI dan dihaluskan dengan filter mayoritas
// (gumpalan bersih, bukan noise); detail = stempel kecil yang dirancang dan bergerombol; bayangan = geser ramp ke nada lebih
// gelap (palet tetap tertutup). Semua detail zona digambar ulang untuk tiap salinan periode agar kolom x dan x+periode identik.
import { Canvas, clamp, hash, shade, smooth } from './pixelkit.mjs';

/** Bayangan jatuh per jenis prop: [rx, ry, offsetX, offsetY] (cahaya kiri-atas -> bayangan kanan-bawah). */
export const SHADOW_OF = {
  tree_a: [40, 11, 16, 2], tree_b: [32, 10, 13, 2], tree_c: [40, 11, 12, 2], tree_twin: [46, 11, 16, 2], tree_birch: [20, 7, 8, 2],
  tree_sapling: [14, 5, 6, 1], tree_pine: [22, 8, 10, 2], tree_fir: [28, 9, 12, 2], tree_dead: [12, 4, 6, 1],
  rock_l: [34, 7, 8, 0], rock_s: [18, 5, 5, 0], rock_slab: [16, 5, 6, 1], rock_c: [24, 5, 6, 0],
  bush: [22, 6, 5, -2], bush_hedge: [34, 6, 6, -2], bush_berry: [20, 5, 5, -2],
  stump: [18, 5, 6, 0], log: [50, 7, 6, -1], sign: [14, 4, 5, 0], chest_closed: [20, 5, 4, 0], chest_open: [20, 5, 4, 0],
  sword: [9, 3, 3, 0], marker_stone: [18, 5, 8, 1], thicket_closed: [40, 6, 0, -4], thicket_open: [40, 6, 0, -4],
};

export class GroundKit {
  /** opts: {zs, PP, copies, u, vnoise}; PP=0 menonaktifkan zona periodik. */
  constructor(P, W, H, opts) {
    this.P = P;
    this.W = W;
    this.H = H;
    this.zs = opts.zs;
    this.PP = opts.PP;
    this.copies = opts.copies;
    this.u = opts.u;
    this.vnoise = opts.vnoise;
    this.col = new Array(W * H);
    this.F = new Float32Array(W * H);
    this.clipMin = 0;
    this.clipMax = W;
    this.canvas = new Canvas(W, H);
    this.periodic = this.PP > 0;
  }

  // ---------------- akses piksel
  get(x, y) { return x < 0 || y < 0 || x >= this.W || y >= this.H ? undefined : this.col[y * this.W + x]; }
  set(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < this.clipMin || x >= this.clipMax || y < 0 || y >= this.H) return;
    this.col[y * this.W + x] = c;
  }
  /** menggambar detail pada koordinat salinan-0; bila x di zona periodik, diulang untuk semua salinan (dan salinan tetangga yang terpotong). */
  rep(x, cb) {
    if (!this.periodic || x < this.zs) { this.clipMin = 0; this.clipMax = this.zs > 0 && this.periodic ? this.zs : this.W; cb(x); this.clipMin = 0; this.clipMax = this.W; return; }
    this.clipMin = this.zs;
    this.clipMax = this.W;
    for (let k = -1; k <= this.copies; k++) cb(x + k * this.PP);
    this.clipMin = 0;
  }
  isGrass(c) { return !!c && c.ramp === this.P.grass; }

  // ---------------- dasar: rumput + tanah
  paintBase({ grassTone, dirtField, dirtTone }) {
    const { W, H, P, zs, PP } = this;
    const G = P.grass, D = P.dirt;
    const T = new Int8Array(W * H), DT = new Int8Array(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        T[i] = grassTone(x, y);
        const f = dirtField(x, y);
        this.F[i] = f;
        DT[i] = f > -6 ? dirtTone(x, y) : 3;
      }
    const nbx = (x, d) => {
      let nx = x + d;
      if (this.periodic && x >= zs) { if (nx < zs) nx += PP; else if (nx >= W) nx -= PP; }
      return clamp(nx, 0, W - 1);
    };
    const mode = (arr, passes) => {
      for (let p = 0; p < passes; p++) {
        const out = new Int8Array(arr);
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++) {
            const counts = new Uint8Array(8);
            for (let dy = -1; dy <= 1; dy++) {
              const yy = clamp(y + dy, 0, H - 1);
              for (let dx = -1; dx <= 1; dx++) counts[arr[yy * W + nbx(x, dx)]]++;
            }
            const cur = arr[y * W + x];
            let best = cur;
            for (let t = 0; t < 8; t++) if (counts[t] > counts[best] + (t === cur ? 0 : 0)) best = t;
            if (counts[best] >= 5) out[y * W + x] = best;
          }
        arr.set(out);
      }
    };
    mode(T, 2);
    mode(DT, 1);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const f = this.F[i];
        const ux = this.u(x);
        const gt = T[i];
        let c;
        if (f > 0) {
          const tone = DT[i];
          if (f < 1.4) c = D[1];
          else if (f < 3.4) c = D[Math.min(tone, 2)];
          else c = D[tone];
        } else if (f > -4.5) {
          // bibir jalan: rumput terinjak, tanah mengintip bergerombol (kepadatan turun menjauhi tepi)
          const p = (f + 4.5) / 4.5;
          const clump = hash(Math.floor(ux / 3), Math.floor(y / 3), 55);
          if (clump < p * 0.85) c = clump < p * 0.3 ? D[1] : D[2];
          else c = G[clamp(gt - 1, 1, 6)];
        } else c = G[gt];
        this.col[i] = c;
      }
  }

  // ---------------- detail yang dirancang
  /** kolam cahaya: nada rumput +1, tepi berdither papan catur 2 px */
  lightPool(cx, cy, rx, ry, boost = 1) {
    const G = this.P.grass;
    for (let y = Math.floor(cy - ry - 3); y <= Math.ceil(cy + ry + 3); y++)
      for (let x = Math.floor(cx - rx - 3); x <= Math.ceil(cx + rx + 3); x++) {
        const c = this.get(x, y);
        if (!this.isGrass(c)) continue;
        const wob = (hash(Math.floor(x / 4), Math.floor(y / 4), 17) - 0.5) * 0.18;
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry) + wob;
        if (d < 0.82 || (d < 1.0 && (x + y) % 2 === 0)) this.col[y * this.W + x] = G[clamp(c.i + boost, 1, 6)];
      }
  }

  /** rumput rebah: goresan horizontal pendek bernada lumut-kekuningan di dalam elips, tepi menipis */
  pressedGrass(cx, cy, rx, ry, seed) {
    const M = this.P.moss, G = this.P.grass;
    for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y++)
      for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
        const c = this.get(x, y);
        if (!this.isGrass(c)) continue;
        const wob = (hash(Math.floor(x / 5), Math.floor(y / 5), seed) - 0.5) * 0.3;
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry) + wob;
        if (d > 1) continue;
        const stroke = hash(Math.floor((x + y * 2) / 4), y, seed + 2);
        if (d < 0.78 || stroke > 0.5) this.col[y * this.W + x] = stroke > 0.55 ? M[3] : M[2];
        else this.col[y * this.W + x] = G[clamp(c.i, 3, 5)];
        if (d < 0.7 && stroke < 0.15) this.col[y * this.W + x] = M[1];
      }
  }

  footprint(x, y, tilt) {
    for (const side of [-1, 1]) {
      const fx = Math.round(x + side * 3 + tilt * 3), fy = Math.round(y + (side > 0 ? 3 : 0));
      for (let dy = -3; dy <= 3; dy++) for (let dx = -2; dx <= 2; dx++) {
        const sole = (dx / 1.9) ** 2 + (dy / 2.7) ** 2 <= 1;
        const heel = dy >= 3 && Math.abs(dx) <= 1;
        if (!sole && !heel) continue;
        const c = this.get(fx + dx, fy + dy);
        if (!c) continue;
        const rim = dx >= 1 && dy >= 0;
        this.set(fx + dx, fy + dy, rim ? shade(c, +1) : shade(c, -2));
      }
    }
  }

  swordScuff(x, y) {
    const D = this.P.dirt;
    for (let yy = -4; yy <= 4; yy++) for (let xx = -9; xx <= 9; xx++) {
      const d = (xx / 9) ** 2 + (yy / 3.4) ** 2 + (hash(xx, yy, 77) - 0.5) * 0.4;
      if (d < 1) this.set(x + xx, y + yy, d < 0.45 ? D[1] : D[2]);
    }
    for (const [dx, dy, l] of [[-10, 1, 6], [9, 2, 7], [-4, 5, 4], [6, -4, 5]]) for (let i = 0; i < l; i++) this.set(x + dx + Math.sign(dx || 1) * i, y + dy + (i % 3 === 0 ? 1 : 0), D[1]);
  }

  ruts({ center, half, x0 }) {
    const D = this.P.dirt;
    for (let x = x0; x < (this.periodic ? this.zs + this.PP : this.W); x++) {
      const ux = this.u(x);
      const n = this.vnoise(ux, 0, 28, 61);
      if (n < 0.3) continue;
      for (const off of [-9, 9]) {
        const y = Math.round(center(ux) + off + (this.vnoise(ux, off, 20, 62) - 0.5) * 3);
        const c = this.get(x, y);
        if (!c || c.ramp !== D || this.F[y * this.W + x] < 8) continue;
        this.rep(x, (xx) => { this.set(xx, y, D[1]); this.set(xx, y + 1, D[4]); });
      }
    }
    // satu rep per kolom di atas sudah menggambar ulang untuk semua salinan; kolom salinan lain tidak diproses lagi
  }

  puddle(x, y, rx, ry, seed) {
    const D = this.P.dirt, W = this.P.water;
    this.rep(x, (cx) => {
      for (let yy = Math.floor(y - ry - 3); yy <= Math.ceil(y + ry + 3); yy++)
        for (let xx = Math.floor(cx - rx - 4); xx <= Math.ceil(cx + rx + 4); xx++) {
          const wob = (hash(Math.floor((xx - cx) / 3), Math.floor(yy / 2), seed) - 0.5) * 0.35; // relatif pusat: sama di semua salinan periode
          const d = Math.hypot((xx - cx) / rx, (yy - y) / ry) + wob;
          if (d > 1.32) continue;
          const c = this.get(xx, yy);
          if (!c) continue;
          if (d <= 0.78) {
            const lit = -((xx - cx) / rx * 0.5 + (yy - y) / ry * 0.8);
            this.set(xx, yy, W[lit > 0.35 ? 3 : lit > -0.1 ? 2 : 1]);
          } else if (d <= 1.0) this.set(xx, yy, W[1]);
          else if (d <= 1.32 && c.ramp === D) this.set(xx, yy, D[1]);
        }
      // pantulan: dua goresan terang
      this.set(Math.round(cx - rx * 0.4), Math.round(y - ry * 0.3), W[3]); this.set(Math.round(cx - rx * 0.4) + 1, Math.round(y - ry * 0.3), W[3]);
      this.set(Math.round(cx + rx * 0.2), Math.round(y + ry * 0.2), W[3]);
    });
  }

  pebbles(x, y, n) {
    const S = this.P.stone, D = this.P.dirt;
    this.rep(x, (cx) => {
      for (let i = 0; i < n; i++) {
        const px = Math.round(cx + (hash(i, Math.round(y), 91) - 0.5) * 14), py = Math.round(y + (hash(i, Math.round(y), 92) - 0.5) * 7);
        const w = 2 + (hash(i, py, 93) > 0.55 ? 1 : 0);
        for (let k = 0; k < w; k++) { this.set(px + k, py, S[3]); this.set(px + k, py + 1, S[2]); }
        this.set(px + w, py + 1, D[1]); this.set(px + 1, py + 2, D[1]);
        this.set(px, py - 1, S[4]);
      }
    });
  }

  // ---------------- rumput bergerombol
  tufts({ sunAt, dirtField }) {
    const G = this.P.grass;
    const draw = (cx, cy, kind, base) => {
      const dk = shade(base, -2), mid = shade(base, +1), lt = shade(base, +2);
      if (kind === 0) { this.set(cx, cy, dk); this.set(cx - 1, cy - 1, mid); this.set(cx + 1, cy - 1, mid); this.set(cx, cy - 2, lt); }
      else if (kind === 1) { this.set(cx, cy, dk); this.set(cx, cy - 1, mid); this.set(cx, cy - 2, mid); this.set(cx + 1, cy - 2, lt); this.set(cx - 1, cy - 1, lt); }
      else if (kind === 2) { this.set(cx, cy, mid); this.set(cx + 1, cy, lt); this.set(cx + 2, cy, mid); this.set(cx + 1, cy + 1, dk); }
      else { this.set(cx - 1, cy, dk); this.set(cx, cy, mid); this.set(cx + 1, cy - 1, lt); this.set(cx - 2, cy - 1, mid); this.set(cx, cy - 2, lt); this.set(cx + 2, cy, dk); }
    };
    const zoneEnd = this.periodic ? this.zs + this.PP : this.W;
    for (let gy = 0; gy < this.H; gy += 7)
      for (let gx = 0; gx < zoneEnd; gx += 7) {
        const ux = this.u(gx);
        const cx = gx + Math.floor(hash(Math.floor(ux / 7), gy, 71) * 7), cy = gy + Math.floor(hash(Math.floor(ux / 7), gy, 72) * 7);
        const cux = this.u(cx);
        if (this.periodic && cx >= this.zs && cx < this.zs + 0) continue;
        if (dirtField(cx, cy) > -4) continue;
        const base = this.get(cx, cy);
        if (!this.isGrass(base)) continue;
        const cluster = this.vnoise(cux, cy, 22, 91);
        const sun = sunAt(cx, cy);
        let dens = cluster > 0.58 ? 0.6 : cluster > 0.45 ? 0.16 : 0.02;
        dens *= 0.45 + sun * 0.8;
        const r = hash(Math.floor(cux / 7), gy, 73);
        if (r >= dens) continue;
        const kind = Math.floor(hash(Math.floor(cux / 7), gy, 74) * 4);
        if (this.periodic && cx >= this.zs) this.rep(cx, (xx) => draw(xx, cy, kind, base));
        else { this.clipMax = this.periodic ? this.zs : this.W; draw(cx, cy, kind, base); this.clipMax = this.W; }
      }
    void G;
  }

  /** daun gugur hangat bergerombol di sekitar pangkal pohon berdaun lebar (bukan sebar acak) */
  litterNearTrees(props, kindList) {
    const L = this.P.litter;
    const kinds = new Set(kindList ?? ['tree_a', 'tree_b', 'tree_c', 'tree_twin', 'tree_birch', 'tree_sapling', 'stump']);
    for (const p of props) {
      if (!kinds.has(p.type)) continue;
      if (p.copy !== undefined && p.copy !== 0) continue;
      if (p.y < 380 || p.y > 640) continue;
      const n = 5 + Math.floor(hash(p.x, p.y, 301) * 5);
      this.rep(p.x, (px) => {
        for (let i = 0; i < n; i++) {
          const a = hash(p.x + i, p.y, 302) * 6.283, r = 10 + hash(p.x + i, p.y, 303) * 20;
          const lx = Math.round(px + Math.cos(a) * r + 6), ly = Math.round(p.y + 4 + Math.sin(a) * r * 0.35);
          const c = this.get(lx, ly);
          if (!c || (c.ramp !== this.P.grass && c.ramp !== this.P.dirt)) continue;
          const k = L[Math.floor(hash(i, Math.round(p.y), 304 + p.x) * 3)];
          this.set(lx, ly, k); this.set(lx + 1, ly, hash(i, Math.round(p.y), 305 + p.x) > 0.4 ? k : shade(k, -1));
        }
      });
    }
  }

  /** kolam cahaya berputar (elips miring): tiang cahaya yang jatuh miring dari kiri-atas; tepi berdither papan catur */
  lightPatch(cx, cy, rx, ry, angle, boost = 1) {
    const ca = Math.cos(angle), sa = Math.sin(angle), R = Math.max(rx, ry) + 3;
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++)
      for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        const c = this.get(x, y);
        if (!c || !c.ramp) continue;
        const dx = x - cx, dy = y - cy;
        const px = (dx * ca + dy * sa) / rx, py = (-dx * sa + dy * ca) / ry;
        const wob = (hash(Math.floor(x / 4), Math.floor(y / 4), 23) - 0.5) * 0.16;
        const d = Math.hypot(px, py) + wob;
        if (d < 0.8 || (d < 1.0 && (x + y) % 2 === 0)) this.col[y * this.W + x] = shade(c, boost);
      }
  }

  /** akar permukaan yang merayap dari pangkal pohon ke tanah (kiri-terang, kanan-gelap, bergelombang) */
  groundRoots(props, kinds, perTree = 3) {
    const W = this.P.wood, M = this.P.moss;
    for (const p of props) {
      if (!kinds.includes(p.type)) continue;
      for (let i = 0; i < perTree; i++) {
        const a = Math.PI * (0.1 + 0.8 * ((i + hash(p.x, p.y, 401 + i) * 0.6) / perTree)) + (i % 2 ? Math.PI : 0) * 0;
        const dir = i % 2 === 0 ? 1 : -1;
        const len = 22 + hash(p.x + i, p.y, 402) * 36;
        let x = p.x + dir * 6, y = p.y + 1;
        for (let t = 0; t < len; t++) {
          const k = t / len;
          x += dir * (1 + 0.15 * Math.sin(t * 0.4 + i));
          y += Math.sin(t * 0.22 + i * 2 + p.x) * 0.55 + 0.18;
          const w = Math.max(1, Math.round(3 - k * 2.2));
          for (let j = 0; j < w; j++) {
            const c = this.get(Math.round(x), Math.round(y) + j);
            if (!c || !(c.ramp === this.P.grass || c.ramp === this.P.dirt || c.ramp === M)) continue;
            this.set(Math.round(x), Math.round(y) + j, W[j === 0 ? 3 : w === 1 ? 2 : j === w - 1 ? 1 : 2]);
          }
          if (t % 11 === 5 && hash(Math.round(x), t, 403) > 0.4) this.set(Math.round(x), Math.round(y) - 1, M[2]);
        }
        void a;
      }
    }
  }

  /** cincin riak halus (gangguan waktu): nada +1/-1 berselang pada lingkaran gepeng, putus-putus */
  rings(cx, cy, radii, squash = 0.6) {
    for (const [ri, r] of radii.entries()) {
      const n = Math.round(r * 7);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.283;
        if (hash(i, ri * 7 + Math.round(cx), 411) < 0.4) continue;
        const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r * squash);
        const c = this.get(x, y);
        if (!c || !c.ramp) continue;
        this.set(x, y, shade(c, (ri + i) % 3 === 0 ? -1 : 1));
      }
    }
  }

  /** timpa warna per piksel: fn(x,y,warnaSaatIni) -> warna baru atau null */
  overlay(fn) {
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) { const c = this.col[y * this.W + x]; const n = fn(x, y, c); if (n) this.col[y * this.W + x] = n; }
  }

  // ---------------- bayangan
  shadows(props, table, opts = {}) {
    const { W, H } = this;
    const map = new Uint8Array(W * H);
    const add = (cx, cy, rx, ry, lo, hi) => {
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
        if (y < 0 || y >= H) continue;
        for (let x = Math.max(lo, Math.floor(cx - rx - 1)); x <= Math.min(hi - 1, Math.ceil(cx + rx + 1)); x++) {
          const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
          let lv = 0;
          if (d < 0.74) lv = 2;
          else if (d < 1.0 && (d < 0.88 || (x + y) % 2 === 0)) lv = 1;
          if (lv > map[y * W + x]) map[y * W + x] = lv;
        }
      }
    };
    for (const p of props) {
      const s = table[p.type];
      if (!s) continue;
      const periodic = this.periodic && p.copy !== undefined;
      if (periodic) {
        if (p.copy !== 0) continue;
        for (let k = -1; k <= this.copies; k++) add(p.x + k * this.PP + s[2], p.y + s[3], s[0], s[1], this.zs, W);
      } else add(p.x + s[2], p.y + s[3], s[0], s[1], 0, this.periodic ? this.zs : W);
    }
    for (const e of opts.extra ?? []) add(e.cx, e.cy, e.rx, e.ry, 0, W);
    for (let i = 0; i < W * H; i++) {
      const lv = map[i];
      if (!lv) continue;
      this.col[i] = shade(this.col[i], -lv);
    }
  }

  finish() {
    const { W, H } = this;
    for (let i = 0; i < W * H; i++) {
      const c = this.col[i];
      const j = i * 4;
      this.canvas.d[j] = c[0]; this.canvas.d[j + 1] = c[1]; this.canvas.d[j + 2] = c[2]; this.canvas.d[j + 3] = 255;
    }
  }
}
void smooth;
