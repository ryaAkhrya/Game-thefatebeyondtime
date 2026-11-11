// Primitif pohon/semak untuk generator lingkungan. Semua fungsi menerima palet P (lihat gen-forest-art.mjs):
//   P.leaf[0..5] P.wood[0..4] P.bark2[0..4] (kulit pucat) P.moss[0..3] P.stone[0..4]
// Aturan bentuk: cahaya dari kiri-atas; tepi atas-kiri siluet diberi nada terang, kanan-bawah gelap; garis tepi 1 px = nada
// ramp[0] dari bahan tetangga (selektif). Kanopi = gugusan daun (clump) berlapis dari belakang ke depan, bukan noise.
import { Canvas, Rng, clamp, hash } from './pixelkit.mjs';

/** Batang: tepi kiri terang, kanan gelap, alur kulit vertikal bersegmen, akar melebar di dasar, lumut di sisi kiri bawah. */
export function drawTrunk(c, P, o) {
  const W = o.ramp ?? P.wood;
  const seed = o.seed ?? 1;
  const { cx, base, h, w } = o;
  const flare = o.flare ?? 4;
  const lean = o.lean ?? 0;
  const topW = o.taper ?? 0.22;
  for (let r = 0; r < h; r++) {
    const y = base - r;
    const t = r / h;
    const ce = cx + lean * Math.pow(t, 1.6);
    const hw0 = (w / 2) * (1 - topW * t);
    const span = flare * 1.7;
    const fl = r < span ? Math.pow((span - r) / span, 2) * flare : 0;
    const hw = hw0 + fl;
    const x0 = Math.round(ce - hw), x1 = Math.round(ce + hw);
    for (let x = x0; x < x1; x++) {
      const u = (x + 0.5 - ce) / hw;
      let idx = u < -0.55 ? 4 : u < 0.0 ? 3 : u < 0.55 ? 2 : 1;
      const seg = Math.floor((y + hash(x, 0, seed) * 9) / (5 + hash(x, 1, seed) * 5));
      const f = hash(x, seg, seed + 3);
      if (f < 0.24) idx -= 1;
      else if (f > 0.9) idx += 1;
      if (x === x0) idx = Math.max(idx, 3);
      if (x === x1 - 1) idx = 1;
      c.set(x, y, W[clamp(idx, 1, W.length - 1)]);
    }
    // lumut di sisi kiri, bergerombol
    if (o.moss !== false && r < (o.mossH ?? 18)) {
      for (let x = x0; x < x0 + 3; x++) {
        const k = hash(Math.floor(x / 1), Math.floor(r / 3), seed + 8);
        if (k > 0.52 - (1 - r / (o.mossH ?? 18)) * 0.2) c.set(x, y, P.moss[k > 0.8 ? 3 : 2]);
      }
    }
  }
  // akar dasar
  const rootLen = o.rootLen ?? Math.round(w * 0.55);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      const sx = cx + side * (w / 2 + flare * 0.4 - k * 2);
      const ex = sx + side * (rootLen - k * 5);
      const ey = base + (k === 0 ? 1 : -1);
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const x = sx + (ex - sx) * t, y = base - 4 + (ey - (base - 4)) * t * t + (k ? -1 : 1) * Math.sin(t * 3) * 0.6;
        c.set(x, y, W[side < 0 ? 3 : 1]);
        if (i < 7) c.set(x, y + 1, W[side < 0 ? 2 : 1]);
      }
    }
  }
  if (o.knot) {
    const kx = o.knot[0], ky = o.knot[1];
    c.ellipse(kx, ky, 2.2, 3.2, W[0]);
    c.set(kx - 1, ky - 2, W[2]); c.set(kx, ky + 3, W[4]);
  }
}

function lineThick(c, x0, y0, x1, y1, w, W) {
  for (let i = 0; i < w; i++) c.line(x0 + i - Math.floor(w / 2), y0, x1 + i - Math.floor(w / 2), y1, W[i === 0 ? 3 : i === w - 1 ? 1 : 2]);
}
export function drawBranches(c, P, list, ramp) {
  const W = ramp ?? P.wood;
  for (const [x0, y0, x1, y1, w] of list) lineThick(c, x0, y0, x1, y1, w, W);
}

function paintLumps(own, tone, w, h, ci, k, n, rng, top) {
  const rx = k.rx ?? k.r, ry = k.ry ?? k.r;
  for (let i = 0; i < n; i++) {
    const a0 = rng.range(Math.PI * 0.95, Math.PI * 1.85), rr = rng.range(0.12, 0.72);
    const lx = k.x + Math.cos(a0) * rr * rx, ly = k.y + Math.sin(a0) * rr * ry;
    const lrx = rng.range(3, 5.4), lry = rng.range(2.4, 4);
    for (let y = Math.floor(ly - lry); y <= Math.ceil(ly + lry); y++)
      for (let x = Math.floor(lx - lrx); x <= Math.ceil(lx + lrx); x++) {
        if (x < 0 || y < 0 || x >= w || y >= h || own[y * w + x] !== ci) continue;
        const dx = (x + 0.5 - lx) / lrx, dy = (y + 0.5 - ly) / lry;
        if (dx * dx + dy * dy > 1) continue;
        const ll = -(dx * 0.6 + dy * 0.8);
        const t = tone[y * w + x];
        if (ll > 0.28) tone[y * w + x] = Math.min(t + 1, top);
        else if (ll < -0.6) tone[y * w + x] = Math.max(t - 1, 1);
      }
  }
}
function finishTone(c, own, tone, Lof) {
  const rampOf = typeof Lof === 'function' ? Lof : () => Lof;
  const out = [];
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const i = y * c.w + x;
      if (own[i] < 0) continue;
      const empty = (xx, yy) => xx < 0 || yy < 0 || xx >= c.w || yy >= c.h || own[yy * c.w + xx] < 0;
      let t = tone[i];
      const top = rampOf(own[i]).length - 1;
      if (empty(x - 1, y) || empty(x, y - 1)) t = Math.min(t + 1, top);
      else if (empty(x + 1, y) || empty(x, y + 1)) t = Math.max(t - 1, 1);
      out.push([x, y, t]);
    }
  for (const [x, y, t] of out) c.set(x, y, rampOf(own[y * c.w + x])[t]);
}

/** Kanopi daun dari clump berlapis. clumps: {x,y,rx,ry,bias?} urut dari belakang (atas) ke depan (bawah). */
export function drawCanopy(c, P, clumps, seed, o = {}) {
  const L = o.leaf ?? P.leaf;
  const rng = new Rng(seed);
  const own = new Int16Array(c.w * c.h).fill(-1);
  const tone = new Int8Array(c.w * c.h);
  const top = L.length - 1;
  clumps.forEach((k, ci) => {
    const rx = k.rx ?? k.r, ry = k.ry ?? k.r;
    const ph = [rng.range(0, 6.283), rng.range(0, 6.283), rng.range(0, 6.283)];
    for (let y = Math.floor(k.y - ry - 4); y <= Math.ceil(k.y + ry + 4); y++)
      for (let x = Math.floor(k.x - rx - 4); x <= Math.ceil(k.x + rx + 4); x++) {
        if (x < 0 || y < 0 || x >= c.w || y >= c.h) continue;
        const dx = (x + 0.5 - k.x) / rx, dy = (y + 0.5 - k.y) / ry;
        const ang = Math.atan2(dy, dx);
        const lump = 1 + 0.09 * Math.sin(3 * ang + ph[0]) + 0.06 * Math.sin(5 * ang + ph[1]) + 0.04 * Math.sin(8 * ang + ph[2]);
        const d = Math.hypot(dx, dy) / lump;
        if (d > 1) continue;
        const light = -(dx * 0.6 + dy * 0.8);
        const s = light * 0.55 - d * 0.3 + 0.24 + (k.bias ?? 0);
        let idx = s > 0.34 ? 4 : s > 0.02 ? 3 : s > -0.32 ? 2 : 1;
        if (dy > 0.58) idx = Math.min(idx, 2);
        if (dy > 0.78) idx = 1;
        own[y * c.w + x] = ci;
        tone[y * c.w + x] = idx;
      }
    paintLumps(own, tone, c.w, c.h, ci, k, Math.round((rx * ry) / (o.lumpDen ?? 52)), rng, top);
  });
  finishTone(c, own, tone, (ci) => clumps[ci].leaf ?? L);
}

export function canopyOutline(c) { c.outline(); }

/** Pohon berdaun lebar dari spesifikasi. */
export function drawBroadleaf(P, spec, seed) {
  const c = new Canvas(spec.w, spec.h);
  drawTrunk(c, P, { ...spec.trunk, base: spec.base, seed });
  if (spec.branches) drawBranches(c, P, spec.branches, spec.trunk.ramp);
  if (spec.trunk2) drawTrunk(c, P, { ...spec.trunk2, base: spec.base, seed: seed + 5 });
  drawCanopy(c, P, spec.clumps, seed, { leaf: spec.leaf, lumpDen: spec.lumpDen });
  c.outline();
  return c;
}

/** Konifer bertingkat: tiap tingkat = kerucut menjuntai bertepi bergerigi (asimetris), tekstur gerombol sama dengan kanopi. */
export function drawConifer(P, spec, seed) {
  const c = new Canvas(spec.w, spec.h);
  const L = spec.leaf ?? P.leaf;
  drawTrunk(c, P, { cx: spec.cx, base: spec.base, h: spec.trunkH, w: spec.trunkW, flare: spec.flare ?? 3, seed, mossH: 10 });
  const rng = new Rng(seed);
  const own = new Int16Array(c.w * c.h).fill(-1);
  const tone = new Int8Array(c.w * c.h);
  for (const [ti, t] of spec.tiers.entries()) {
    const phase = rng.int(0, 7), lean = t.lean ?? 0;
    const apex = t.y - t.h;
    const jagL = [], jagR = [];
    for (let j = 0; j <= t.h; j++) { jagL.push(Math.round((rng.next() - 0.4) * 2.6)); jagR.push(Math.round((rng.next() - 0.4) * 2.6)); }
    for (let j = 0; j <= t.h; j++) {
      const k = j / t.h;
      const base = t.hw * Math.pow(k, 0.8);
      const lhw = Math.max(0.5, base + (j > 3 ? jagL[j] : 0)), rhw = Math.max(0.5, base + (j > 3 ? jagR[j] : 0));
      for (let x = -Math.ceil(lhw); x <= Math.floor(rhw); x++) {
        if (x < 0 ? -x > lhw : x > rhw) continue;
        const tooth = Math.abs(((x + 1000 + phase) % 9) - 4.5);
        const cutDepth = Math.abs(x) > base * 0.25 ? Math.round(4 * (tooth / 4.5)) : 0;
        const jMax = t.h - cutDepth;
        if (j > jMax) continue;
        const u = x / base;
        let idx = u < -0.4 ? 4 : u < 0.3 ? 3 : 2;
        if (j < t.h * 0.22 && u < 0.35) idx = Math.min(idx + 1, 4);
        if (j >= jMax - 1 && j > 5) idx = 1;
        else if (j >= jMax - 3 && j > 5) idx = Math.min(idx, 2);
        const px = spec.cx + lean + x, py = apex + j;
        if (px < 0 || py < 0 || px >= c.w || py >= c.h) continue;
        own[py * c.w + px] = ti;
        tone[py * c.w + px] = clamp(idx, 1, 4);
      }
    }
    paintLumps(own, tone, c.w, c.h, ti, { x: spec.cx + lean, y: apex + t.h * 0.62, rx: t.hw * 0.85, ry: t.h * 0.42 }, Math.round((t.hw * t.h) / 62), rng, 5);
  }
  finishTone(c, own, tone, L);
  c.outline();
  return c;
}

/** Semak: clump kecil, tanpa batang; varian: 'round' | 'hedge' | 'berry'. */
export function drawBush(P, kind, seed) {
  const L = P.leaf;
  if (kind === 'hedge') {
    const c = new Canvas(76, 40);
    drawCanopy(c, P, [{ x: 20, y: 20, rx: 14, ry: 12 }, { x: 40, y: 17, rx: 17, ry: 13 }, { x: 58, y: 21, rx: 14, ry: 11 }, { x: 32, y: 26, rx: 15, ry: 9 }, { x: 50, y: 28, rx: 14, ry: 8 }], seed, { leaf: L, lumpDen: 40 });
    c.outline();
    return c;
  }
  if (kind === 'berry') {
    const c = new Canvas(52, 42);
    drawCanopy(c, P, [{ x: 26, y: 18, rx: 15, ry: 13 }, { x: 14, y: 26, rx: 11, ry: 9 }, { x: 38, y: 27, rx: 11, ry: 9 }, { x: 26, y: 30, rx: 13, ry: 8 }], seed, { leaf: L, lumpDen: 40 });
    c.outline();
    for (const [x, y] of [[18, 20], [28, 14], [34, 24], [22, 30], [12, 28], [40, 29]]) { c.set(x, y, P.berry[1]); c.set(x + 1, y, P.berry[1]); c.set(x, y - 1, P.berry[2]); c.set(x + 1, y + 1, P.berry[0]); }
    return c;
  }
  const c = new Canvas(56, 44);
  drawCanopy(c, P, [{ x: 28, y: 20, rx: 17, ry: 14 }, { x: 15, y: 28, rx: 12, ry: 10 }, { x: 42, y: 28, rx: 12, ry: 10 }, { x: 28, y: 32, rx: 15, ry: 9 }], seed, { leaf: L, lumpDen: 40 });
  c.outline();
  return c;
}

/** Batang mengikuti kurva: pts = [[x, y, setengahLebar], ...] dari pangkal (y besar) ke atas (y kecil). Bayangan kiri-terang/kanan-gelap, alur kulit bersegmen. */
export function trunkAlong(c, P, pts, o = {}) {
  const W = o.ramp ?? P.wood;
  const seed = o.seed ?? 1;
  const yb = pts[0][1], yt = pts[pts.length - 1][1];
  for (let y = yb; y >= yt; y--) {
    let k = 0;
    while (k < pts.length - 2 && y < pts[k + 1][1]) k++;
    const a = pts[k], b = pts[k + 1];
    const t = (a[1] - y) / (a[1] - b[1] || 1);
    const sm = t * t * (3 - 2 * t);
    const ce = a[0] + (b[0] - a[0]) * sm, hw = a[2] + (b[2] - a[2]) * t;
    const x0 = Math.round(ce - hw), x1 = Math.round(ce + hw);
    for (let x = x0; x < x1; x++) {
      const u = (x + 0.5 - ce) / hw;
      let idx = u < -0.5 ? 4 : u < 0.0 ? 3 : u < 0.5 ? 2 : 1;
      const seg = Math.floor((y + hash(x, 0, seed) * 9) / (6 + hash(x, 1, seed) * 6));
      const f = hash(x, seg, seed + 3);
      if (f < 0.26) idx -= 1; else if (f > 0.9) idx += 1;
      if (x === x0) idx = Math.max(idx, 3);
      if (x === x1 - 1) idx = 1;
      c.set(x, y, W[clamp(idx, 1, W.length - 1)]);
    }
    if (o.moss !== false && y > yb - (o.mossH ?? 22)) for (let x = x0; x < x0 + 3; x++) { const q = hash(x, Math.floor(y / 3), seed + 8); if (q > 0.5) c.set(x, y, P.moss[q > 0.82 ? 3 : 2]); }
  }
}
/** Dahan meruncing dari (x0,y0,w0) ke (x1,y1,w1). */
export function limb(c, P, x0, y0, x1, y1, w0, w1, ramp) {
  const W = ramp ?? P.wood;
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, w = Math.max(1, w0 + (w1 - w0) * t);
    for (let k = 0; k < Math.round(w); k++) c.set(x + k - Math.floor(w / 2), y, W[k === 0 ? 3 : k === Math.round(w) - 1 ? 1 : 2]);
  }
}
/** Akar banir lebar di pangkal batang: tiap akar = poligon melebar ke tanah, kiri terang kanan gelap. */
export function buttress(c, P, cx, base, spread, height, count, seed, ramp) {
  const W = ramp ?? P.wood;
  const rng = new Rng(seed);
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const reach = spread * rng.range(0.55, 1) * (i < 2 ? 1 : 0.7);
    const sx = cx + side * rng.range(2, 6), ex = cx + side * reach;
    const pts = [[sx - 5, base - height * rng.range(0.7, 1)], [sx + 5, base - height * rng.range(0.7, 1)], [ex + side * 2 + 3, base - 1], [ex, base + rng.range(0, 2)], [sx - side * 8, base + 1]];
    c.poly(pts, (x, y) => W[clamp((side < 0 ? 3 : 2) - (y > base - 3 ? 1 : 0) - (hash(x, Math.floor(y / 4), seed + i) < 0.2 ? 1 : 0), 1, 4)]);
    // alur akar
    for (let t = 0; t < 8; t++) { const px = sx + (ex - sx) * (t / 8), py = base - height * 0.5 * (1 - t / 8) ; c.set(px, py, W[1]); }
  }
}
/** Lumut menjuntai: garis vertikal tak beraturan. */
export function hangingMoss(c, P, x, y, len, seed) {
  const rng = new Rng(seed);
  for (let i = 0; i < len; i++) {
    const l = Math.round(rng.range(3, 9));
    const xx = x + i * 2 + (rng.next() > 0.6 ? 1 : 0);
    for (let k = 0; k < l; k++) c.set(xx, y + k, P.moss[k > l - 3 ? 3 : 2]);
  }
}
