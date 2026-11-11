// Prop non-pohon: batu, tunggul, kayu tumbang, papan, peti, pedang, penanda, flora kecil. Palet P dari palettes.mjs.
// Aturan garis tepi: benda padat (batu, kayu, papan, peti) diberi garis tepi selektif 1 px; flora tanah (pakis, rumput, bunga,
// jamur) tanpa garis tepi, hanya piksel pangkal gelap, agar tidak berat. Cahaya selalu dari kiri-atas.
import { Canvas, Rng, clamp, hash } from './pixelkit.mjs';
import { drawCanopy, drawTrunk } from './envTrees.mjs';

// ---------------------------------------------------------------- batu
function stoneTexture(c, P, face, seed, density) {
  const rng = new Rng(seed);
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const [x, y] of face.pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const area = (maxX - minX) * (maxY - minY);
  const inFace = (x, y) => { const q = c.col(x, y); return q && q.i === face.tone && q.ramp === P.stone; };
  for (let i = 0; i < area * density; i++) {
    const x = Math.floor(rng.range(minX, maxX)), y = Math.floor(rng.range(minY, maxY));
    if (!inFace(x, y) || !inFace(x + 1, y)) continue;
    const dark = rng.chance(0.55);
    c.set(x, y, P.stone[clamp(face.tone + (dark ? -1 : 1), 1, 4)]);
    c.set(x + 1, y, P.stone[clamp(face.tone + (dark ? -1 : 1), 1, 4)]);
    if (dark && inFace(x + 1, y + 1)) c.set(x + 1, y + 1, P.stone[clamp(face.tone + 1, 1, 4)]);
  }
}
function crack(c, P, x, y, len, rng) {
  let cx = x, cy = y;
  for (let i = 0; i < len; i++) {
    c.set(cx, cy, P.stone[0]);
    const r = rng.next();
    if (r < 0.5) cy++; else if (r < 0.8) cx += rng.chance(0.5) ? 1 : -1; else { cx += 1; cy++; }
  }
}
function mossBlob(c, P, x, y, rx, ry, rng) {
  for (let yy = Math.floor(y - ry); yy <= Math.ceil(y + ry); yy++)
    for (let xx = Math.floor(x - rx); xx <= Math.ceil(x + rx); xx++) {
      const dx = (xx + 0.5 - x) / rx, dy = (yy + 0.5 - y) / ry;
      const wob = (hash(xx, yy, 9) - 0.5) * 0.25;
      if (dx * dx + dy * dy + wob > 1) continue;
      const q = c.col(xx, yy);
      if (!q) continue;
      const lit = -(dx * 0.6 + dy * 0.8);
      c.set(xx, yy, P.moss[lit > 0.25 ? 3 : lit > -0.3 ? 2 : 1]);
    }
}

export function drawRock(P, spec, seed) {
  const c = new Canvas(spec.w, spec.h);
  const rng = new Rng(seed);
  for (const f of spec.faces) c.poly(f.pts, P.stone[f.tone]);
  for (const f of spec.faces) stoneTexture(c, P, f, seed + f.tone, spec.tex ?? 0.012);
  // tepi terang pada tepi atas-kiri tiap muka
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const q = c.col(x, y);
    if (!q || q.ramp !== P.stone) continue;
    const up = c.col(x, y - 1), lf = c.col(x - 1, y);
    if ((!up || (up.ramp === P.stone && up.i < q.i - 0 && q.i >= 2)) && !(up && up.i >= q.i)) { if (!up) c.set(x, y, P.stone[clamp(q.i + 1, 1, 4)]); }
    else if (!lf && q.i >= 2) c.set(x, y, P.stone[clamp(q.i + 1, 1, 4)]);
  }
  for (const k of spec.cracks ?? []) crack(c, P, k[0], k[1], k[2], rng);
  for (const m of spec.moss ?? []) mossBlob(c, P, m[0], m[1], m[2], m[3], rng);
  for (const d of spec.drips ?? []) for (let i = 0; i < d[2]; i++) { const q = c.col(d[0], d[1] + i); if (q && q.ramp === P.stone) c.set(d[0], d[1] + i, P.moss[i === d[2] - 1 ? 1 : 2]); }
  c.outline();
  return c;
}

export function buildRocks(P) {
  const S = {};
  S.rock_l = { c: drawRock(P, {
    w: 72, h: 54,
    faces: [
      { tone: 3, pts: [[9, 22], [18, 12], [34, 8], [50, 10], [60, 17], [64, 22], [50, 27], [34, 28], [20, 27]] },
      { tone: 2, pts: [[5, 40], [4, 30], [9, 22], [20, 27], [34, 28], [32, 46], [16, 46], [8, 44]] },
      { tone: 1, pts: [[34, 28], [50, 27], [64, 22], [68, 32], [67, 40], [60, 46], [44, 47], [32, 46]] },
    ],
    cracks: [[40, 30, 9], [14, 31, 6]], moss: [[26, 15, 11, 4], [48, 17, 7, 3], [12, 24, 4, 2.5]], drips: [[17, 27, 5], [29, 28, 7], [43, 26, 3]],
  }, 3), anchorY: 46 };
  S.rock_s = { c: drawRock(P, {
    w: 38, h: 30,
    faces: [
      { tone: 3, pts: [[4, 14], [10, 6], [20, 4], [28, 8], [33, 14], [22, 17], [12, 17]] },
      { tone: 2, pts: [[3, 22], [4, 14], [12, 17], [22, 17], [20, 26], [9, 26]] },
      { tone: 1, pts: [[22, 17], [33, 14], [35, 21], [31, 26], [20, 26]] },
    ],
    cracks: [[24, 19, 5]], moss: [[14, 9, 7, 3]], drips: [[10, 17, 4]],
  }, 9), anchorY: 25 };
  // lempeng pipih tinggi (berdiri miring), tanpa lumut, retak halus
  S.rock_slab = { c: drawRock(P, {
    w: 44, h: 56,
    faces: [
      { tone: 3, pts: [[8, 14], [18, 6], [30, 10], [32, 18], [22, 20], [12, 22]] },
      { tone: 2, pts: [[6, 46], [8, 14], [12, 22], [22, 20], [24, 50], [14, 50]] },
      { tone: 1, pts: [[22, 20], [32, 18], [36, 30], [36, 44], [28, 50], [24, 50]] },
    ],
    cracks: [[16, 26, 12], [28, 24, 8]], moss: [[16, 13, 6, 2.5]], drips: [[9, 22, 4]],
  }, 14), anchorY: 49 };
  // tumpukan tiga batu kecil
  {
    const c = new Canvas(54, 30);
    const a = drawRock(P, { w: 24, h: 20, faces: [{ tone: 3, pts: [[3, 9], [8, 3], [16, 3], [21, 9], [14, 11], [7, 11]] }, { tone: 2, pts: [[2, 15], [3, 9], [7, 11], [14, 11], [13, 17], [5, 17]] }, { tone: 1, pts: [[14, 11], [21, 9], [22, 14], [19, 17], [13, 17]] }], moss: [[10, 6, 4, 2]] }, 21);
    const b = drawRock(P, { w: 20, h: 16, faces: [{ tone: 3, pts: [[2, 8], [6, 2], [13, 3], [17, 8], [10, 10], [5, 10]] }, { tone: 2, pts: [[2, 12], [2, 8], [5, 10], [10, 10], [9, 14], [4, 14]] }, { tone: 1, pts: [[10, 10], [17, 8], [18, 12], [15, 14], [9, 14]] }] }, 22);
    c.blit(a, 5, 5); c.blit(b, 28, 11); c.blit(b, 22, 2);
    S.rock_c = { c, anchorY: 25 };
  }
  return S;
}

// ---------------------------------------------------------------- tunggul, kayu tumbang
export function drawStump(P, seed) {
  const c = new Canvas(54, 50);
  const W = P.wood;
  const cx = 27, topY = 18, baseY = 43;
  for (let y = topY; y < baseY; y++) {
    const t = (y - topY) / (baseY - topY);
    const hw = 14 + t * 3 + (t > 0.8 ? (t - 0.8) * 22 : 0);
    for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) {
      const u = (x + 0.5 - cx) / hw;
      let idx = u < -0.5 ? 3 : u < 0.1 ? 2 : u < 0.55 ? 2 : 1;
      const f = hash(x, Math.floor(y / 4), seed);
      if (f < 0.25) idx--; else if (f > 0.92) idx++;
      if (x === Math.round(cx + hw) - 1) idx = 1;
      c.set(x, y, W[clamp(idx, 1, 4)]);
    }
  }
  // akar dasar
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) { const x = cx + s * (17 + i), y = baseY - 2 + Math.floor(i * 0.3); c.set(x, y, W[s < 0 ? 3 : 1]); c.set(x, y + 1, W[s < 0 ? 2 : 1]); }
  // permukaan potong: lingkaran tahun
  c.ellipse(cx, topY, 15, 6.6, W[2]);
  c.ellipse(cx, topY, 13.4, 5.6, W[4]);
  c.ellipse(cx, topY, 10, 4.2, W[3]);
  c.ellipse(cx, topY, 7, 3, W[4]);
  c.ellipse(cx, topY, 4, 1.8, W[3]);
  c.ellipse(cx, topY, 1.6, 0.9, W[1]);
  c.line(cx + 2, topY, cx + 11, topY + 1, W[2]); // retak radial
  // lumut di tepi kiri atas dan di dasar
  for (const [x, y, r] of [[17, topY + 1, 3], [14, topY + 5, 2.5], [18, baseY - 3, 3]]) for (let yy = -3; yy <= 3; yy++) for (let xx = -4; xx <= 4; xx++) if ((xx / r) ** 2 + (yy / (r * 0.7)) ** 2 <= 1 && c.alpha(x + xx, y + yy) > 200) c.set(x + xx, y + yy, P.moss[hash(xx, yy, 3) > 0.6 ? 3 : 2]);
  c.outline();
  return c;
}

export function drawLog(P, seed, broken = true, len = 88) {
  const c = new Canvas(len + 24, 46);
  const W = P.wood;
  const x0 = 12, x1 = 12 + len, cy = 24, R = 11;
  for (let x = x0; x < x1; x++) {
    const jag = broken && x > x1 - 8 ? Math.floor(hash(x, 1, seed) * 5) : 0;
    for (let y = cy - R; y <= cy + R - 1; y++) {
      const d = (y + 0.5 - cy) / R;
      if (broken && x > x1 - 8 && ((d < -0.2 && jag > 2) || (d > 0.3 && jag < 1))) continue;
      let idx = d < -0.7 ? 4 : d < -0.15 ? 3 : d < 0.45 ? 2 : 1;
      const seg = Math.floor((x + hash(y, 2, seed) * 11) / (6 + hash(y, 3, seed) * 6));
      const f = hash(seg, y, seed + 4);
      if (f < 0.22) idx--; else if (f > 0.93) idx++;
      c.set(x, y, W[clamp(idx, 1, 4)]);
    }
  }
  // sisi potong kiri (elips) dengan lingkaran tahun
  c.ellipse(x0, cy, 5.4, R, W[2]);
  c.ellipse(x0, cy, 4.2, R - 1.4, W[4]);
  c.ellipse(x0, cy, 3, R - 4, W[3]);
  c.ellipse(x0, cy, 1.6, R - 7, W[4]);
  c.set(x0, cy, W[1]);
  // tunggul dahan kecil di punggung dan serpihan kulit
  for (let i = 0; i < 4; i++) c.set(60 + i, 12 - Math.floor(i / 2), W[3 - (i % 2)]);
  c.rect(60, 13, 4, 2, W[2]);
  for (const [x, y, r] of [[36, cy - R + 1, 6], [66, cy - R, 5], [84, cy - R + 1, 4]]) for (let yy = -2; yy <= 2; yy++) for (let xx = -r; xx <= r; xx++) if ((xx / r) ** 2 + (yy / 2.2) ** 2 <= 1 && c.alpha(x + xx, y + yy) > 200 && yy < 2) c.set(x + xx, y + yy, P.moss[hash(xx, yy, 5) > 0.55 ? 3 : 2]);
  c.outline();
  return c;
}

// ---------------------------------------------------------------- papan, peti, pedang, penanda
export function drawSign(P, dir = 'right') {
  const c = new Canvas(56, 66);
  const W = P.wood;
  // tiang
  for (let y = 22; y < 60; y++) for (let x = 25; x < 31; x++) c.set(x, y, W[x < 27 ? 3 : x < 29 ? 2 : 1]);
  for (let y = 24; y < 58; y += 5) { c.set(26, y, W[1]); c.set(28, y + 2, W[1]); }
  // papan petunjuk berbentuk panah menunjuk timur
  const board = dir === 'left' ? [[51, 9], [18, 8], [5, 16], [18, 24], [51, 25]] : [[5, 9], [38, 8], [51, 16], [38, 24], [5, 25]];
  c.poly(board, (x, y) => { const d = (y - 8) / 17; const g = hash(Math.floor(x / 6), y, 3); return W[clamp(d < 0.14 ? 4 : d < 0.55 ? 3 : d < 0.9 ? 2 : 1, 1, 4) - (g > 0.86 ? 1 : 0)]; });
  for (let x = 6; x < 36; x++) { c.set(x, 13, W[2]); c.set(x, 20, W[2]); } // alur serat
  // ukiran: dua garis hampir bertemu, goresan
  c.line(10, 16, 22, 16, W[0]); c.line(26, 16, 38, 16, W[0]);
  c.line(10, 17, 20, 17, W[1]); c.line(28, 17, 36, 17, W[1]);
  for (const [x, y] of [[8, 11], [8, 22], [37, 10], [37, 23]]) { c.set(x, y, P.iron[3]); c.set(x + 1, y, P.iron[1]); }
  // tali pengikat
  for (let i = 0; i < 5; i++) { c.line(24, 29 + i * 2, 32, 30 + i * 2, P.rope[i % 2 ? 1 : 2]); }
  // papan kecil menggantung miring dengan rantai
  c.line(30, 33, 30, 36, P.iron[2]);
  c.poly([[30, 36], [46, 38], [45, 46], [29, 45]], (x, y) => W[y < 40 ? 3 : 2]);
  c.line(32, 41, 43, 42, W[1]);
  // lumut di dasar tiang
  for (let i = 0; i < 6; i++) c.set(25 + (i % 3), 57 - Math.floor(i / 3), P.moss[2 + (i % 2)]);
  c.outline();
  return c;
}

export function drawChest(P, open) {
  const c = new Canvas(46, 44);
  const W = P.wood;
  const body = (x0, y0, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) c.set(x0 + x, y0 + y, W[x < 3 ? 4 : x < w - 4 ? (y % 5 === 4 ? 2 : 3) : 1]);
  };
  body(7, 22, 32, 15);
  c.rect(7, 27, 32, 2, P.iron[2]); c.rect(7, 27, 32, 1, P.iron[3]);
  c.rect(7, 22, 2, 15, P.iron[2]); c.rect(37, 22, 2, 15, P.iron[1]);
  c.rect(20, 28, 6, 6, P.gold); c.rect(22, 30, 2, 3, P.iron[0]);
  if (!open) {
    for (let y = 0; y < 10; y++) for (let x = 0; x < 32; x++) {
      const t = (x - 15.5) / 16;
      if (y < Math.round((1 - Math.sqrt(1 - t * t)) * 7)) continue;
      c.set(7 + x, 13 + y, W[y < 2 ? 4 : x < 4 ? 4 : x > 27 ? 1 : 3]);
    }
    c.rect(7, 21, 32, 2, P.iron[2]);
    c.rect(20, 20, 6, 4, P.gold); c.set(22, 21, P.iron[0]);
    for (const x of [12, 33]) for (let y = 14; y < 21; y++) c.set(x, y, P.iron[y === 14 ? 3 : 2]);
  } else {
    c.rect(9, 21, 28, 5, W[0]);
    c.rect(11, 24, 24, 1, P.gold);
    for (let y = 0; y < 11; y++) for (let x = 0; x < 30; x++) c.set(8 + x, 8 + y, W[x < 3 ? 4 : x > 25 ? 1 : y < 2 ? 3 : 2]);
    c.rect(8, 17, 30, 2, P.iron[2]);
    c.rect(18, 22, 6, 1, P.gold); c.set(26, 23, P.gold);
  }
  c.outline();
  return c;
}

export function drawSword(P) {
  const c = new Canvas(34, 78);
  const S = P.steel;
  const cx = 17;
  // bilah (ujung tertancap di tanah pada y=68)
  for (let y = 24; y < 68; y++) {
    const hw = y > 62 ? 1 : 3;
    for (let x = -hw; x <= hw; x++) c.set(cx + x, y, S[x < -1 ? 4 : x < 1 ? (x === 0 ? 2 : 3) : 1]);
    if (y > 28 && y < 60) c.set(cx, y, S[1]); // lekuk bilah
  }
  for (const [x, y] of [[cx + 2, 40], [cx + 2, 41], [cx - 2, 52]]) c.set(x, y, S[2]); // goresan
  c.set(cx - 1, 33, S[2]); c.set(cx + 1, 47, S[2]);
  // pelindung silang
  c.rect(cx - 7, 21, 15, 3, P.iron[2]); c.rect(cx - 7, 21, 15, 1, P.iron[3]); c.rect(cx - 8, 22, 1, 2, P.iron[1]); c.rect(cx + 8, 22, 1, 2, P.iron[1]);
  c.rect(cx - 2, 20, 5, 1, P.iron[3]);
  // gagang berbalut kulit, pangkal pedang
  for (let y = 10; y < 20; y++) { c.rect(cx - 2, y, 5, 1, P.wood[y % 3 === 0 ? 1 : 2]); c.set(cx - 2, y, P.wood[3]); }
  c.rect(cx - 3, 7, 7, 3, P.iron[2]); c.rect(cx - 3, 7, 7, 1, P.iron[3]);
  c.rect(cx - 1, 4, 3, 3, P.iron[1]);
  // ikatan kain usang di gagang
  c.rect(cx - 2, 13, 5, 2, P.litter[1]);
  c.outline();
  return c;
}

export function drawMarker(P, seed, opts = {}) {
  const c = new Canvas(46, 70);
  const S = P.stone;
  const base = 62;
  const pts = [[8, base], [10, 26], [12, 14], [19, 7], [27, 10], [31, 5], [36, 14], [37, 26], [38, base]];
  c.poly(pts, (x, y) => {
    const u = (x - 8) / 30;
    let idx = u < 0.3 ? 3 : u < 0.62 ? 2 : 1;
    if (y < 16 && u < 0.6) idx = 4;
    const f = hash(Math.floor(x / 3), Math.floor(y / 3), seed);
    if (f < 0.14) idx--; else if (f > 0.9) idx++;
    return S[clamp(idx, 1, 4)];
  });
  const rng = new Rng(seed);
  crack(c, P, 28, 14, 10, rng); crack(c, P, 14, 38, 6, rng);
  // motif: dua garis hampir bertemu
  const lit = opts.glow ? P.rune : S[4], dim = opts.glow ? P.runeDim : S[0];
  c.line(13, 30, 21, 30, dim); c.line(25, 30, 33, 30, dim);
  c.line(13, 29, 21, 29, lit); c.line(25, 29, 33, 29, lit);
  c.line(15, 35, 21, 35, dim); c.line(25, 35, 31, 35, dim);
  c.set(22, 30, dim); c.set(23, 29, lit); // celah kecil di tengah
  mossBlob(c, P, 17, 14, 6, 3, rng); mossBlob(c, P, 24, base - 2, 14, 4, rng);
  for (const [x, y, n] of [[12, 21, 4], [31, 22, 3], [20, 52, 5]]) for (let i = 0; i < n; i++) { const q = c.col(x, y + i); if (q && q.ramp === S) c.set(x, y + i, P.moss[2]); }
  c.outline();
  return c;
}

// ---------------------------------------------------------------- flora tanah
export function drawFern(P, seed, size = 1) {
  const c = new Canvas(Math.round(46 * size), Math.round(36 * size));
  const L = P.leaf;
  const rng = new Rng(seed);
  const n = 7;
  for (let f = 0; f < n; f++) {
    const ang = -Math.PI / 2 + (f - (n - 1) / 2) * 0.46 + rng.range(-0.08, 0.08);
    const len = (13 + rng.range(0, 8)) * size;
    const sx = c.w / 2, sy = c.h - 5;
    let px = sx, py = sy;
    for (let t = 0; t <= len; t++) {
      const k = t / len;
      const x = sx + Math.cos(ang) * t + Math.sin(ang + Math.PI / 2) * 0 + (Math.cos(ang) > 0 ? 1 : -1) * k * k * 5;
      const y = sy + Math.sin(ang) * t * 0.9 + k * k * k * 6;
      c.set(x, y, L[2]);
      if (t > 2 && t % 2 === 0) {
        const lw = (1 - k) * 4 * size + 1;
        for (let i = 1; i <= lw; i++) { c.set(x - i, y + 1 + Math.floor(i / 2), L[i < lw ? 3 : 2]); c.set(x + i, y + 1 + Math.floor(i / 2), L[i < lw ? 2 : 1]); }
      }
      px = x; py = y;
    }
    c.set(px, py, L[4]);
  }
  c.set(c.w / 2, c.h - 5, L[0]); c.set(c.w / 2 - 1, c.h - 4, L[0]); c.set(c.w / 2 + 1, c.h - 4, L[0]);
  return c;
}

export function drawTuft(P, seed, tall = 1) {
  const c = new Canvas(26, 22);
  const G = P.grass;
  const rng = new Rng(seed);
  const n = 8 + Math.floor(tall * 3);
  for (let i = 0; i < n; i++) {
    const bx = 13 + (i - n / 2) * 1.4 + rng.range(-1, 1);
    const len = Math.round((7 + rng.range(0, 9)) * tall);
    const bend = rng.range(-5, 5);
    for (let t = 0; t < len; t++) {
      const k = t / len;
      const x = bx + bend * k * k, y = 19 - t;
      c.set(x, y, G[clamp(3 + Math.floor(k * 3) + (bend < 0 ? 1 : 0), 2, 6)]);
    }
    c.set(bx + bend, 19 - len, G[6]);
  }
  for (let x = 6; x < 20; x++) if (hash(x, 1, seed) > 0.4) c.set(x, 20, G[0]);
  return c;
}

export function drawFlowers(P, kind, seed) {
  const c = new Canvas(40, 26);
  const rng = new Rng(seed);
  const cols = kind === 'y' ? [P.yellow, P.yellow, P.white] : kind === 'v' ? [P.violet, P.violet, P.pink] : [P.white, P.white, P.yellow];
  const L = P.leaf;
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x = 5 + Math.round(((i + rng.next() * 0.7) / n) * 30), y = 8 + rng.int(0, 10);
    for (let k = 0; k < 6 + rng.int(0, 3); k++) c.set(x + (k > 4 ? 1 : 0), y + k, L[k < 3 ? 3 : 2]);
    c.set(x - 2, y + 4, L[3]); c.set(x - 3, y + 3, L[3]); c.set(x + 2, y + 5, L[2]);
    const col = cols[i % cols.length];
    c.set(x, y, col); c.set(x - 1, y, col); c.set(x + 1, y, col); c.set(x, y - 1, col);
    c.set(x, y + 1, kind === 'y' ? P.white : P.yellow);
    if (kind === 'v') { c.set(x - 1, y + 1, col); }
  }
  // tanah/daun di dasar
  for (let x = 4; x < 36; x += 1) if (hash(x, 4, seed) > 0.55) c.set(x, 22 + (x % 2), L[1]);
  return c;
}

export function drawMushrooms(P, kind, seed) {
  const c = new Canvas(36, 26);
  const C = P.mushCap, T = P.mushStem;
  const list = kind === 2 ? [[10, 18, 4.5], [19, 15, 6], [27, 20, 3.5], [15, 22, 3]] : [[9, 17, 5], [19, 14, 6.5], [26, 19, 4]];
  for (const [x, y, r] of list) {
    c.rect(x - 1, y, 3, 6, T[2]); c.rect(x + 1, y, 1, 6, T[1]);
    c.ellipse(x, y, r, r * 0.62, C[2]);
    c.ellipse(x - r * 0.2, y - r * 0.16, r * 0.62, r * 0.34, C[3]);
    for (let xx = Math.round(x - r); xx <= Math.round(x + r); xx++) c.set(xx, Math.round(y + r * 0.5), C[1]);
    c.set(Math.round(x + r * 0.35), Math.round(y - 1), T[2]); c.set(Math.round(x - r * 0.55), Math.round(y), T[2]);
  }
  c.outline();
  return c;
}

// ---------------------------------------------------------------- semak berduri
export function drawThicket(P, open, seed) {
  const c = new Canvas(96, 64);
  const rng = new Rng(seed);
  const mass = (cx, cy, rx, ry, n) => drawCanopy(c, P, Array.from({ length: n }, (_, i) => ({ x: cx + (i - n / 2) * rx * 0.45 + rng.range(-3, 3), y: cy + rng.range(-ry * 0.4, ry * 0.4), rx: rx * rng.range(0.55, 0.8), ry: ry * rng.range(0.6, 0.85) })), seed + cx, { leaf: P.leaf.map((q) => q), lumpDen: 30 });
  // dua massa samping (selalu), massa tengah hanya saat tertutup
  const left = [{ x: 18, y: 40, rx: 15, ry: 14 }, { x: 30, y: 31, rx: 14, ry: 12 }, { x: 10, y: 47, rx: 10, ry: 8 }, { x: 26, y: 46, rx: 13, ry: 9 }];
  const right = [{ x: 78, y: 40, rx: 15, ry: 14 }, { x: 66, y: 31, rx: 14, ry: 12 }, { x: 86, y: 47, rx: 10, ry: 8 }, { x: 70, y: 46, rx: 13, ry: 9 }];
  const mid = [{ x: 48, y: 36, rx: 16, ry: 14 }, { x: 44, y: 44, rx: 12, ry: 9 }, { x: 54, y: 44, rx: 12, ry: 9 }, { x: 48, y: 27, rx: 11, ry: 9 }];
  void mass;
  drawCanopy(c, P, open ? [...left, ...right] : [...left, ...right, ...mid], seed, { leaf: P.leaf, lumpDen: 34 });
  // dahan berduri melengkung di atas massa daun
  const cane = (x0, y0, x1, y1, bow) => {
    const n = Math.hypot(x1 - x0, y1 - y0);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * bow;
      c.set(x, y, P.wood[2]); c.set(x, y + 1, P.wood[1]);
      if (i % 5 === 2) { c.set(x, y - 1, P.thorn); c.set(x + (t < 0.5 ? 1 : -1), y - 2, P.thorn); }
    }
  };
  const canes = open ? [[6, 46, 34, 36, 10], [90, 46, 62, 36, 10], [12, 50, 30, 30, 8], [84, 50, 66, 30, 8]] : [[6, 46, 48, 30, 12], [90, 46, 48, 30, 12], [12, 50, 82, 40, 8], [14, 40, 80, 46, 9], [24, 54, 70, 52, 6], [30, 34, 66, 36, 8]];
  for (const [a, b, d, e, f] of canes) cane(a, b, d, e, f);
  if (open) {
    // celah terinjak: tanah terbuka di antara dua massa
    for (let y = 40; y < 60; y++) for (let x = 34; x < 62; x++) {
      if (c.alpha(x, y) > 60) continue;
      const half = 13 - (y - 40) * 0.12;
      if (Math.abs(x - 48) < half) c.set(x, y, P.dirt[(x + y) % 4 === 0 ? 2 : 3]);
    }
  }
  c.outline();
  return c;
}

// ---------------------------------------------------------------- pohon mati
export function drawDeadTree(P, seed) {
  const c = new Canvas(84, 116);
  const W = P.wood;
  drawTrunk(c, P, { cx: 42, base: 108, h: 62, w: 12, flare: 5, lean: -3, taper: 0.45, seed, mossH: 14, ramp: P.bark2.length ? P.wood : P.wood });
  const br = (x0, y0, x1, y1, w) => { for (let i = 0; i < w; i++) c.line(x0 + i, y0, x1 + i, y1, W[i === 0 ? 3 : 2 - (i > 1 ? 1 : 0)]); };
  br(40, 56, 20, 34, 3); br(20, 34, 10, 30, 2); br(24, 38, 24, 22, 2);
  br(44, 50, 62, 30, 3); br(62, 30, 72, 28, 2); br(58, 34, 64, 18, 2);
  br(42, 48, 40, 14, 3); br(41, 28, 32, 16, 2);
  br(44, 40, 52, 24, 2);
  // rongga pada batang
  c.ellipse(41, 88, 3.4, 5.6, W[0]); c.set(39, 85, W[2]);
  c.outline();
  return c;
}
