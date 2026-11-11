// Sprite Hutan 2 (DRAFT, dilukis oleh kode). Identitas: hutan yang lebih tua dan sunyi. Bentuk: batang tua melintir dan
// berakar banir lebar, kanopi tipis-tinggi (dahan terlihat di antara gugusan daun), batang berongga, pohon mati dengan lumut
// menjuntai, cemara tua berbatang panjang; penanda batu bermotif dua garis hampir bertemu; tanda halus gangguan waktu:
// daun yang tertahan di udara (bayangannya di tanah), pecahan waktu berfaset. Palet dingin (forest2Palette).
import { Canvas, Rng, clamp, hash } from './pixelkit.mjs';
import { buttress, drawBush, drawCanopy, drawConifer, hangingMoss, limb, trunkAlong } from './envTrees.mjs';
import { buildRocks, drawChest, drawFern, drawFlowers, drawLog, drawMushrooms, drawSign, drawTuft } from './envProps.mjs';

function branchTree(c, P, x, y, ang, len, w, depth, rng, ramp) {
  if (depth <= 0 || len < 4) return;
  const x1 = x + Math.cos(ang) * len, y1 = y + Math.sin(ang) * len;
  limb(c, P, x, y, x1, y1, w, Math.max(1, w - 1), ramp);
  const n = depth > 2 ? 2 : rng.chance(0.6) ? 2 : 1;
  for (let i = 0; i < n; i++) branchTree(c, P, x1, y1, ang + (i === 0 ? -1 : 1) * rng.range(0.4, 0.9) + rng.range(-0.15, 0.15), len * rng.range(0.62, 0.8), Math.max(1, w - 1), depth - 1, rng, ramp);
}

export function buildForest2Trees(P) {
  const S = {};
  const A = (c, anchorY) => ({ c, anchorY });

  // pohon purba: batang lebar berakar banir, tiga dahan utama, kanopi tipis dengan dua gugus bernada hangat
  {
    const c = new Canvas(164, 180);
    buttress(c, P, 82, 174, 44, 24, 6, 5);
    trunkAlong(c, P, [[82, 174, 17], [82, 152, 14], [81, 124, 12.5], [82, 100, 13]], { seed: 3, mossH: 34 });
    limb(c, P, 78, 104, 42, 70, 6, 2); limb(c, P, 82, 100, 84, 58, 6, 2); limb(c, P, 86, 104, 124, 72, 6, 2);
    limb(c, P, 60, 88, 38, 92, 3, 1); limb(c, P, 104, 90, 130, 96, 3, 1);
    drawCanopy(c, P, [
      { x: 48, y: 56, rx: 23, ry: 16 }, { x: 84, y: 36, rx: 27, ry: 18 }, { x: 122, y: 54, rx: 22, ry: 16, leaf: P.leafWarm },
      { x: 28, y: 84, rx: 15, ry: 10 }, { x: 138, y: 84, rx: 15, ry: 10, leaf: P.leafWarm }, { x: 66, y: 72, rx: 16, ry: 11 }, { x: 102, y: 74, rx: 16, ry: 11 },
    ], 12, { lumpDen: 46 });
    hangingMoss(c, P, 40, 74, 4, 5); hangingMoss(c, P, 112, 78, 5, 6); hangingMoss(c, P, 62, 82, 3, 7);
    c.outline();
    S.tree_old_a = A(c, 174);
  }
  // pohon melintir berbentuk S, kanopi kecil di ujung, satu dahan mati
  {
    const c = new Canvas(132, 164);
    buttress(c, P, 58, 158, 26, 16, 4, 9);
    trunkAlong(c, P, [[58, 158, 12], [50, 140, 9.5], [64, 114, 9], [52, 90, 8], [66, 66, 6.5]], { seed: 8, mossH: 24 });
    limb(c, P, 64, 114, 100, 96, 5, 2); limb(c, P, 52, 90, 22, 70, 4, 1); limb(c, P, 66, 66, 90, 44, 4, 2); limb(c, P, 66, 66, 52, 38, 3, 1);
    drawCanopy(c, P, [{ x: 94, y: 46, rx: 22, ry: 15 }, { x: 56, y: 40, rx: 16, ry: 11 }, { x: 106, y: 92, rx: 16, ry: 11 }, { x: 26, y: 66, rx: 13, ry: 9, leaf: P.leafWarm }], 22, { lumpDen: 44 });
    hangingMoss(c, P, 100, 98, 3, 4);
    c.outline();
    S.tree_old_b = A(c, 158);
  }
  // pohon berongga: batang tebal patah di atas, mulut rongga gelap di depan
  {
    const c = new Canvas(124, 156);
    buttress(c, P, 62, 150, 36, 18, 5, 15);
    trunkAlong(c, P, [[62, 150, 21], [62, 128, 19], [60, 100, 16], [62, 76, 13]], { seed: 15, mossH: 30 });
    // patahan di puncak
    c.poly([[48, 78], [54, 62], [60, 72], [66, 56], [72, 70], [78, 78]], (x, y) => P.wood[y < 70 ? 4 : 3]);
    // mulut rongga
    c.ellipse(60, 116, 9.5, 17, P.wood[2]);
    c.ellipse(60.5, 117, 8, 15.5, P.wood[0]);
    c.ellipse(58.5, 120, 4.5, 11, P.mist[0]);
    for (let y = 104; y < 128; y += 2) c.set(51, y, P.wood[4]);
    for (let i = 0; i < 9; i++) c.set(54 + i, 101 + (i % 2), P.moss[2 + (i % 2)]);
    limb(c, P, 74, 96, 100, 84, 5, 2); limb(c, P, 48, 92, 28, 80, 4, 1);
    drawCanopy(c, P, [{ x: 98, y: 76, rx: 17, ry: 11 }, { x: 30, y: 74, rx: 12, ry: 8 }], 31, { lumpDen: 40 });
    hangingMoss(c, P, 96, 86, 4, 8);
    c.outline();
    S.tree_hollow = A(c, 150);
  }
  // pohon mati bercabang halus dengan lumut menjuntai
  {
    const c = new Canvas(120, 156);
    buttress(c, P, 60, 150, 20, 10, 4, 21);
    trunkAlong(c, P, [[60, 150, 9], [58, 118, 7], [60, 90, 5.5], [58, 66, 4]], { seed: 21, mossH: 18 });
    const rng = new Rng(77);
    branchTree(c, P, 59, 84, -Math.PI / 2 - 0.5, 34, 4, 5, rng);
    branchTree(c, P, 59, 100, -Math.PI / 2 + 0.7, 30, 4, 5, rng);
    branchTree(c, P, 58, 70, -Math.PI / 2 + 0.2, 28, 3, 4, rng);
    branchTree(c, P, 58, 114, -Math.PI / 2 - 1.1, 22, 3, 3, rng);
    hangingMoss(c, P, 36, 76, 5, 3); hangingMoss(c, P, 78, 96, 4, 9);
    c.outline();
    S.tree_dead2 = A(c, 150);
  }
  // cemara tua: batang panjang gelap, tingkat renggang
  S.tree_spruce_old = A(drawConifer(P, {
    w: 96, h: 176, cx: 48, base: 170, trunkH: 62, trunkW: 10, flare: 4,
    tiers: [{ y: 52, hw: 8, h: 24 }, { y: 80, hw: 13, h: 28, lean: 1 }, { y: 112, hw: 18, h: 32, lean: -1 }],
    leaf: P.leaf,
  }, 91), 170);
  // pohon membungkuk lebar (rendah), kanopi pipih
  {
    const c = new Canvas(150, 126);
    buttress(c, P, 52, 120, 30, 14, 4, 33);
    trunkAlong(c, P, [[52, 120, 13], [46, 102, 11], [42, 84, 10], [46, 68, 8]], { seed: 33, mossH: 26 });
    limb(c, P, 44, 80, 104, 62, 8, 3); limb(c, P, 44, 78, 24, 56, 5, 2); limb(c, P, 80, 68, 120, 72, 3, 1);
    drawCanopy(c, P, [{ x: 66, y: 46, rx: 30, ry: 15 }, { x: 108, y: 56, rx: 23, ry: 12 }, { x: 26, y: 50, rx: 17, ry: 11, leaf: P.leafWarm }, { x: 124, y: 74, rx: 12, ry: 8 }], 34, { lumpDen: 44 });
    hangingMoss(c, P, 70, 60, 6, 2);
    c.outline();
    S.tree_gnarl = A(c, 120);
  }
  // tunggul purba bertepi mosaik dengan jamur braket
  {
    const c = new Canvas(76, 70);
    const W = P.wood;
    const cx = 38, topY = 22, baseY = 60;
    for (let y = topY; y < baseY; y++) {
      const t = (y - topY) / (baseY - topY);
      const hw = 22 + t * 3 + (t > 0.78 ? (t - 0.78) * 36 : 0);
      for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) {
        const u = (x + 0.5 - cx) / hw;
        let idx = u < -0.5 ? 3 : u < 0.5 ? 2 : 1;
        const f = hash(x, Math.floor(y / 5), 41);
        if (f < 0.25) idx--; else if (f > 0.92) idx++;
        c.set(x, y, W[clamp(idx, 1, 4)]);
      }
    }
    c.ellipse(cx, topY, 23, 9, W[2]); c.ellipse(cx, topY, 21, 7.8, W[3]); c.ellipse(cx, topY, 15, 5.6, W[4]); c.ellipse(cx, topY, 10, 3.8, W[3]); c.ellipse(cx, topY, 5, 2, W[4]); c.set(cx, topY, W[1]);
    for (let i = 0; i < 14; i++) { const x = 18 + i * 2 + (i % 3), y = topY - 3 + (i % 2); if (c.alpha(x, y) > 200) c.set(x, y, P.moss[2 + (i % 2)]); }
    for (const [bx, by] of [[22, 44], [54, 40]]) { c.ellipse(bx, by, 5, 2.2, P.mushCap[2]); c.ellipse(bx, by - 1, 4, 1.2, P.mushCap[3]); c.line(bx - 4, by + 2, bx + 4, by + 2, P.mushCap[1]); }
    buttress(c, P, cx, baseY, 30, 8, 4, 44);
    c.outline();
    S.stump_old = A(c, 60);
  }
  return S;
}

/** Penanda batu: monolit meruncing dengan motif dua garis hampir bertemu. kind: 'old' | 'second' | 'broken'. */
export function drawMonolith(P, seed, kind) {
  const c = new Canvas(64, 106);
  const S = P.stone;
  const rng = new Rng(seed);
  const base = 98, topY = kind === 'broken' ? 40 : 10;
  const L = 14, R = 50;
  const pts = kind === 'broken'
    ? [[L, base], [L + 1, 62], [L + 3, 46], [L + 8, 40], [L + 12, 44], [L + 17, 38], [L + 22, 45], [L + 27, 40], [R - 1, 52], [R, 70], [R, base]]
    : [[L, base], [L + 1, 50], [L + 3, 26], [L + 9, 12], [L + 16, topY], [L + 24, 8], [R - 6, 16], [R - 2, 36], [R, 60], [R, base]];
  c.poly(pts, (x, y) => {
    const u = (x - L) / (R - L);
    let idx = u < 0.3 ? 3 : u < 0.62 ? 2 : 1;
    if (y < topY + 10 && u < 0.55) idx = 4;
    const f = hash(Math.floor(x / 3), Math.floor(y / 3), seed);
    if (f < 0.15) idx--; else if (f > 0.9) idx++;
    return S[clamp(idx, 1, 4)];
  });
  // retakan dan serpihan
  for (let i = 0; i < 3; i++) { let x = 24 + i * 9, y = topY + 14 + i * 10; for (let k = 0; k < 12; k++) { c.set(x, y, S[0]); const r = rng.next(); if (r < 0.55) y++; else if (r < 0.8) x += rng.chance(0.5) ? 1 : -1; else { x++; y++; } } }
  // motif: dua goresan melengkung yang turun dari kiri-atas dan kanan-atas dan hampir bertemu di tengah (celah kecil), dua tingkat, aus
  const cy = kind === 'broken' ? 62 : 38;
  const lit = kind === 'second' ? P.rune : S[4], dim = kind === 'second' ? P.runeDim : S[0];
  const gap = kind === 'second' ? 2 : 3;
  const stroke = (x0, y0, x1, y1, side) => {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t + side * Math.sin(t * Math.PI) * 2.2, y = y0 + (y1 - y0) * t;
      if (kind !== 'second' && hash(i, side + 5, seed) < 0.16) continue; // aus: goresan putus-putus
      c.set(Math.round(x), Math.round(y), dim); c.set(Math.round(x) - 1, Math.round(y), lit);
    }
  };
  const mid = 32;
  // satu pasang garis yang hampir bertemu (tidak berpasangan dua tingkat: terlalu mirip wajah)
  stroke(mid - 13, cy + 10, mid - gap, cy + 10, 0); stroke(mid + 13, cy + 10, mid + gap, cy + 10, 0);
  stroke(mid - 12, cy + 11, mid - gap - 1, cy + 12, 0); stroke(mid + 12, cy + 11, mid + gap + 1, cy + 12, 0);
  c.line(mid, cy + 18, mid, cy + 26, dim); c.line(mid - 1, cy + 18, mid - 1, cy + 24, lit);
  // lumut: puncak kiri dan dasar tebal, tetesan
  const moss = (x, y, rx, ry) => { for (let yy = Math.floor(y - ry); yy <= Math.ceil(y + ry); yy++) for (let xx = Math.floor(x - rx); xx <= Math.ceil(x + rx); xx++) { const dx = (xx + 0.5 - x) / rx, dy = (yy + 0.5 - y) / ry; if (dx * dx + dy * dy + (hash(xx, yy, 5) - 0.5) * 0.3 > 1) continue; const q = c.col(xx, yy); if (!q) continue; const li = -(dx * 0.6 + dy * 0.8); c.set(xx, yy, P.moss[li > 0.25 ? 3 : li > -0.3 ? 2 : 1]); } };
  moss(24, topY + 12, 7, 3.5); moss(30, base - 3, 17, 5); moss(21, base - 12, 6, 4);
  for (const [x, y, n] of [[19, topY + 15, 5], [40, 64, 4], [27, base - 14, 6]]) for (let i = 0; i < n; i++) { const q = c.col(x, y + i); if (q && q.ramp === S) c.set(x, y + i, P.moss[2]); }
  if (kind === 'broken') {
    // bagian atas yang jatuh di kaki
    c.poly([[L - 12, base], [L - 10, base - 10], [L - 2, base - 14], [L + 4, base - 8], [L + 2, base]], (x, y) => S[y < base - 8 ? 3 : 2]);
    moss(L - 6, base - 12, 5, 2.5);
  }
  c.outline();
  return c;
}

export function drawStake(P, seed, lean = 0) {
  const c = new Canvas(18, 52);
  const W = P.wood;
  const x0 = 5, x1 = 13;
  for (let y = 10; y < 48; y++) {
    const off = Math.round(lean * (48 - y) / 40);
    const tip = y < 18 ? (18 - y) / 8 : 0;
    for (let x = x0 + Math.round(tip * 3); x < x1 - Math.round(tip * 3); x++) {
      const u = (x - x0) / (x1 - x0);
      const f = hash(x, Math.floor(y / 4), seed);
      c.set(x + off, y, W[clamp((u < 0.35 ? 4 : u < 0.7 ? 3 : 1) - (f < 0.22 ? 1 : 0), 1, 4)]);
    }
  }
  for (let i = 0; i < 4; i++) c.line(x0 - 1, 28 + i * 2, x1 + 1, 29 + i * 2, P.rope[i % 2 ? 1 : 2]);
  for (let i = 0; i < 5; i++) c.set(x0 + 1 + (i % 3), 44 + (i % 2), P.moss[2 + (i % 2)]);
  c.outline();
  return c;
}

export function drawShard(P) {
  const c = new Canvas(40, 56);
  const G = P.glow, S = P.steel;
  // kristal berfaset: tiga muka dengan nada dingin; bukan cahaya, hanya sisi yang menangkap cahaya
  c.poly([[20, 4], [10, 20], [12, 46], [20, 52], [20, 20]], S[3]);
  c.poly([[20, 4], [20, 20], [20, 52], [30, 46], [31, 22]], S[2]);
  c.poly([[20, 4], [31, 22], [20, 20]], S[4]);
  c.poly([[10, 20], [20, 20], [20, 52], [12, 46]], S[2]);
  c.poly([[20, 20], [31, 22], [30, 46], [20, 52]], S[1]);
  c.line(20, 20, 20, 52, S[0]); c.line(14, 28, 14, 40, S[4]); c.set(22, 12, S[4]); c.set(21, 9, S[4]);
  // serpihan kecil di dekatnya
  c.poly([[32, 40], [37, 46], [34, 52], [30, 49]], S[2]); c.poly([[5, 44], [9, 40], [11, 50], [6, 52]], S[2]);
  c.line(33, 44, 35, 47, S[4]); c.set(8, 43, S[4]);
  c.outline();
  void G;
  return c;
}

export function drawNoteStand(P) {
  const c = new Canvas(34, 48);
  const W = P.wood;
  for (let y = 14; y < 42; y++) for (let x = 14; x < 19; x++) c.set(x, y, W[x < 16 ? 3 : x < 18 ? 2 : 1]);
  c.poly([[5, 8], [28, 6], [30, 24], [7, 26]], (x, y) => W[y < 11 ? 4 : y < 20 ? 3 : 2]);
  c.poly([[8, 10], [26, 9], [27, 22], [9, 23]], (x, y) => P.paper[y < 14 ? 2 : 1]);
  for (const yy of [13, 16, 19]) c.line(10, yy, 24 - (yy % 3), yy, P.paper[0]);
  c.set(7, 8, P.iron[3]); c.set(28, 8, P.iron[3]);
  for (let i = 0; i < 5; i++) c.set(13 + (i % 3), 41 - Math.floor(i / 3), P.moss[2 + (i % 2)]);
  c.outline();
  return c;
}

export function drawBedroll(P) {
  const c = new Canvas(46, 28);
  const C = P.cloth;
  c.poly([[5, 6], [38, 4], [41, 22], [7, 24]], (x, y) => C[y < 10 ? 3 : y < 18 ? 2 : 1]);
  for (let i = 0; i < 5; i++) { c.line(12 + i * 6, 5 - Math.floor(i / 4), 14 + i * 6, 23, C[i % 2 ? 1 : 2]); }
  c.poly([[5, 6], [14, 5], [15, 22], [7, 24]], (x, y) => P.paper[y < 12 ? 2 : 1]); // bantal
  c.poly([[30, 5], [38, 4], [41, 22], [33, 23]], () => C[1]); // lipatan selimut
  c.line(14, 5, 15, 22, P.paper[0]);
  c.set(24, 12, P.rope[2]); c.set(25, 12, P.rope[2]);
  c.outline();
  return c;
}

/** log pendek berbaring ke arah utara-selatan (untuk palisade): ujung selatan (menghadap kamera) terlihat berlingkaran tahun. */
export function drawLogV(P, seed, len) {
  const c = new Canvas(22, len + 12);
  const W = P.wood;
  for (let y = 2; y < len; y++) for (let x = 3; x < 19; x++) {
    const u = (x - 3) / 16;
    let idx = u < 0.3 ? 4 : u < 0.55 ? 3 : u < 0.8 ? 2 : 1;
    const seg = Math.floor((y + hash(x, 3, seed) * 7) / (5 + hash(x, 4, seed) * 6));
    const f = hash(x, seg, seed + 2);
    if (f < 0.24) idx--; else if (f > 0.93) idx++;
    c.set(x, y, W[clamp(idx, 1, 4)]);
  }
  c.ellipse(11, len, 8, 5.4, W[2]); c.ellipse(11, len, 6.8, 4.4, W[4]); c.ellipse(11, len, 4.2, 2.8, W[3]); c.set(11, len, W[1]);
  for (let i = 0; i < 4; i++) c.line(3, 8 + i, 18, 9 + i, P.rope[i % 2 ? 1 : 2]);
  for (let i = 0; i < 4; i++) c.set(4 + i, 2 + (i % 2), P.moss[2 + (i % 2)]);
  c.outline();
  return c;
}

export function drawLantern(P) {
  const c = new Canvas(18, 24);
  const I = P.iron;
  c.rect(5, 18, 8, 3, I[2]); c.rect(5, 18, 8, 1, I[3]);
  c.rect(6, 8, 6, 10, P.mist[0]); c.line(6, 8, 6, 17, I[3]); c.line(11, 8, 11, 17, I[1]);
  c.rect(5, 6, 8, 2, I[2]); c.rect(7, 4, 4, 2, I[1]); c.line(9, 1, 9, 3, I[2]); c.set(8, 0, I[2]); c.set(10, 0, I[2]);
  c.set(8, 12, P.gold);
  c.outline();
  return c;
}

/** daun yang tertahan di udara: kolom daun pada ketinggian berbeda. */
export function drawFrozenLeaves(P, seed, count, height) {
  const w = 26, c = new Canvas(w, height + 6);
  const F = P.frozen;
  const rng = new Rng(seed);
  for (let i = 0; i < count; i++) {
    const x = 4 + Math.round(rng.range(0, w - 12)), y = 2 + Math.round(((i + rng.range(0, 0.6)) / count) * (height - 8));
    const tilt = rng.int(0, 2);
    for (let k = 0; k < 8; k++) { const px = x + k, py = y + (tilt === 0 ? 0 : tilt === 1 ? Math.floor(k / 4) : -Math.floor(k / 4) + 1); const hh = k === 0 || k === 7 ? 0 : k < 3 || k > 5 ? 1 : 2; for (let j = -1; j < hh; j++) c.set(px, py + j, F[j < 0 ? 2 : j === 0 ? 1 : 0]); }
    c.line(x + 1, y, x + 6, y + (tilt === 1 ? 1 : 0), F[2]);
  }
  return c;
}

export function buildForest2(P) {
  const S = buildForest2Trees(P);
  const A = (c, anchorY) => ({ c, anchorY });
  Object.assign(S, buildRocks(P));
  S.marker_old = A(drawMonolith(P, 6, 'old'), 98);
  S.marker_second = A(drawMonolith(P, 11, 'second'), 98);
  S.marker_broken = A(drawMonolith(P, 17, 'broken'), 98);
  S.sign_west = A(drawSign(P, 'left'), 59);
  S.sign_east = A(drawSign(P, 'right'), 59);
  S.log_fallen = A(drawLog(P, 5, true, 96), 35);
  S.log_worked = (() => {
    const c = drawLog(P, 9, false, 64);
    // takik kapak berbentuk V di punggung kayu + serpihan
    c.line(30, 13, 36, 20, P.wood[0]); c.line(36, 20, 42, 13, P.wood[0]); c.line(31, 14, 36, 19, P.wood[4]);
    for (const [x, y] of [[26, 30], [44, 31], [50, 32]]) { c.set(x, y, P.wood[4]); c.set(x + 1, y, P.wood[3]); }
    // baji besi tertancap
    c.rect(58, 12, 3, 5, P.iron[2]); c.rect(58, 12, 3, 1, P.iron[3]);
    return A(c, 35);
  })();
  S.bedroll = A(drawBedroll(P), 23);
  S.blog_a = A(drawLogV(P, 5, 30), 38);
  S.blog_b = A(drawLogV(P, 8, 26), 34);
  S.lantern = A(drawLantern(P), 21);
  S.note_stand = A(drawNoteStand(P), 42);
  S.time_shard = A(drawShard(P), 52);
  S.stake_a = A(drawStake(P, 1, 0), 48);
  S.stake_b = A(drawStake(P, 2, 2), 48);
  S.stake_c = A(drawStake(P, 3, -2), 48);
  S.leaves_a = A(drawFrozenLeaves(P, 4, 3, 46), 50);
  S.leaves_b = A(drawFrozenLeaves(P, 9, 2, 30), 34);
  S.leaves_c = A(drawFrozenLeaves(P, 13, 2, 20), 24);
  S.log_short = A(drawLog(P, 12, true, 40), 35);
  S.bush = A(drawBush(P, 'round', 5), 38);
  S.bush_hedge = A(drawBush(P, 'hedge', 6), 36);
  S.fern = A(drawFern(P, 3), 31);
  S.fern_b = A(drawFern(P, 12, 0.8), 25);
  S.tuft_a = A(drawTuft(P, 2, 1), 20);
  S.tuft_b = A(drawTuft(P, 5, 0.7), 20);
  S.flowers_v = A(drawFlowers(P, 'v', 3), 24);
  S.flowers = A(drawFlowers(P, 'w', 5), 24);
  S.mushrooms = A(drawMushrooms(P, 1, 2), 24);
  S.mushrooms_b = A(drawMushrooms(P, 2, 4), 24);
  return S;
}
void drawChest;
