// Palet dan sprite Kuil Jejak (DRAFT, dilukis kode). Batu tua berlumut, ukiran lambang berlapis emas pucat (aksen Bitter Lime
// hanya pada "garis yang ditutup"), Deep Plum untuk kehampaan dan relung. Motif waktu = batu retak/bergeser kuantisasi dan benda
// yang berhenti di udara (lampu, serpihan), BUKAN neon atau jam melayang. Cahaya dari kiri-atas, garis tepi 1 px selektif.
import { Canvas, Rng, clamp, hash, ramp, solid, shade } from './pixelkit.mjs';

export function templePalette() {
  return {
    void: solid('t.void', '#120d19'),
    plum: ramp('t.plum', ['#120d19', '#1d1625', '#2c2038', '#3b2a4a', '#4d3a5f', '#6a5580', '#8a77a0']),
    stone: ramp('t.stone', ['#17131d', '#2b2433', '#433a4a', '#5f5663', '#7e747a', '#a0948f', '#c3b7aa']),
    floor: ramp('t.floor', ['#1e1a22', '#352d36', '#4d4343', '#675a53', '#84756a', '#a39484', '#c0b29d']),
    lit: ramp('t.lit', ['#2a2228', '#4a3c38', '#6e5c48', '#917b55', '#b8a06b', '#d9c88e', '#efe3b4']),
    moss: ramp('t.moss', ['#142a22', '#21402f', '#335c3c', '#4d7d46', '#73a052']),
    lime: ramp('t.lime', ['#3d4a1c', '#6b7d2c', '#9db444', '#c7d96a']),
    gold: ramp('t.gold', ['#4a3a1e', '#7d6530', '#b8964a', '#dcc47a', '#f2e7b6']),
    bronze: ramp('t.bronze', ['#2a1b14', '#523524', '#7d5532', '#a8793f', '#cfa05c']),
    wood: ramp('t.wood', ['#1f150f', '#3d2a1c', '#5c4129', '#7f5c3b', '#a0795a']),
    cloth: ramp('t.cloth', ['#2a2438', '#453b5c', '#645a82', '#8b80a8']),
    cream: ramp('t.cream', ['#5b5040', '#8d7f66', '#bfb08e', '#e3d7b6']),
    red: ramp('t.red', ['#2e1119', '#5a1f2a', '#8d3438', '#bf5a4c']),
    steel: ramp('t.steel', ['#1f1d29', '#3f3d52', '#68667f', '#9694ac', '#c4c2d4']),
    violet: ramp('t.violet', ['#241a3d', '#43307a', '#6e56b8', '#a28cec', '#d4c8ff']),
    fire: ramp('t.fire', ['#6a2b1c', '#b5542a', '#e08a3a', '#f4c862', '#fbefb0']),
    leaf: ramp('t.leaf', ['#0f1f1a', '#1a3329', '#27493a', '#386148', '#528060']),
    sky: ramp('t.sky', ['#3a5662', '#6a8f94', '#a9c9c0', '#e0efd9']),
  };
}

const at = (R, i) => R[clamp(i, 0, R.length - 1)];
export const A = (c, ax, ay, foot) => ({ c, anchorX: ax, anchorY: ay, foot });

// ---------------------------------------------------------------- primitif
/** Muka depan silinder/kotak dengan sisi kiri terang dan kanan gelap. */
function faceBox(c, x, y, w, h, R, base, seed = 1) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      let idx = base;
      if (i < 2) idx += 1; else if (i >= w - 2) idx -= 1; else if (i >= w - 4 && w > 10) idx -= 0;
      if (j === 0) idx += 1;
      if (j === h - 1) idx -= 1;
      const n = hash(x + i >> 1, y + j >> 1, seed);
      if (n < 0.14) idx -= 1; else if (n > 0.9) idx += 1;
      c.set(x + i, y + j, at(R, idx));
    }
}
function topBox(c, x, y, w, h, R, base, seed = 2) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      let idx = base + (j === 0 ? 1 : 0) + (i < 2 ? 1 : 0);
      if (hash(x + i >> 1, y + j, seed) < 0.12) idx -= 1;
      c.set(x + i, y + j, at(R, idx));
    }
}
/** Silinder tegak (kolom): x tengah cx, lebar w, dari y0 ke y1; profil bulat. */
function shaft(c, cx, y0, y1, w, R, base, seed = 3) {
  const half = w / 2;
  for (let y = y0; y <= y1; y++)
    for (let i = 0; i < w; i++) {
      const u = (i + 0.5 - half) / half; // -1..1
      let idx = u < -0.62 ? base + 2 : u < -0.15 ? base + 1 : u < 0.4 ? base : u < 0.78 ? base - 1 : base - 2;
      if (i % 5 === 3 && y > y0 + 4 && y < y1 - 4) idx -= 1; // alur
      const n = hash(cx + i, y >> 1, seed);
      if (n < 0.1) idx -= 1; else if (n > 0.93) idx += 1;
      c.set(Math.round(cx - half) + i, y, at(R, idx));
    }
}
function mossAlong(c, P, x0, x1, y0, depth, seed, fromTop = false) {
  for (let x = x0; x <= x1; x++) {
    const d = Math.floor(depth * hash(x >> 1, seed, 7) * (hash(x >> 3, seed, 8) > 0.35 ? 1 : 0.2));
    for (let k = 0; k < d; k++) {
      const y = fromTop ? y0 + k : y0 - k;
      if (c.alpha(x, y) > 200) c.set(x, y, P.moss[k === d - 1 ? 1 : hash(x, k, seed) > 0.5 ? 2 : 3]);
    }
  }
}
function weather(c, P, seed) {
  const R = new Set([P.stone, P.floor]);
  c.map((x, y, col) => {
    if (!col.ramp || !R.has(col.ramp) || col.i < 2) return null;
    const n = hash(x >> 1, y >> 1, seed);
    if (n < 0.07) return shade(col, -1);
    if (n > 0.965) return shade(col, +1);
    return null;
  });
}
function crack(c, pts, color, lipColor) {
  for (let i = 0; i + 1 < pts.length; i++) {
    c.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], color);
    if (lipColor) c.line(pts[i][0] + 1, pts[i][1], pts[i + 1][0] + 1, pts[i + 1][1], lipColor);
  }
}
function ringPx(c, cx, cy, r, color, rY = r) {
  const n = Math.max(24, Math.round(r * 9));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    c.set(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * rY), color);
  }
}

/**
 * Lambang inti (dipakai di mana-mana, "simbol yang berulang"): cincin dan garis-garis yang hampir bertemu di bawahnya.
 * n = jumlah garis (1 kiri, 2 kiri+kanan, 3 = + garis tengah yang terkikis/ditutup). colors: {ring, line, shade, third}
 */
export function drawEmblem(c, cx, cy, n, scale, colors) {
  const s = scale;
  const r = Math.round(6 * s);
  ringPx(c, cx, cy, r, colors.ring);
  if (s >= 1) ringPx(c, cx, cy, r - 1, colors.ring);
  if (colors.shade) ringPx(c, cx, cy + 1, r + 1, colors.shade);
  const L = [[-14 * s, 22 * s], [-3 * s, 8 * s]];
  const line = (a, b, col, dash) => {
    const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) || 1;
    for (let i = 0; i <= steps; i++) {
      if (dash && i % 3 === 2) continue;
      const x = Math.round(cx + a[0] + ((b[0] - a[0]) * i) / steps), y = Math.round(cy + a[1] + ((b[1] - a[1]) * i) / steps);
      c.set(x, y, col);
      if (s >= 1.5) c.set(x + 1, y, col);
    }
  };
  if (n >= 1) line(L[0], L[1], colors.line);
  if (n >= 2) line([-L[0][0], L[0][1]], [-L[1][0], L[1][1]], colors.line);
  if (n >= 3) line([0, 24 * s], [0, r + 3 * s], colors.third ?? colors.line, true);
}

/**
 * Lambang berukuran tetap untuk pilar dan lukisan: cincin radius R, n garis yang hampir menyentuh cincin. Garis memiliki tepi
 * terang 1 px di kanan-bawah (pahatan). `dim` = garis ketiga yang terkikis (putus-putus).
 */
export function drawGlyph(c, cx, cy, n, R, col) {
  ringPx(c, cx, cy, R, col.ring); ringPx(c, cx, cy, R - 1, col.ring);
  if (col.rim) ringPx(c, cx + 1, cy + 1, R + 1, col.rim);
  const seg = (a, b, color, dash) => {
    const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) || 1;
    for (let i = 0; i <= steps; i++) {
      if (dash && i % 3 === 2) continue;
      const x = Math.round(a[0] + ((b[0] - a[0]) * i) / steps), y = Math.round(a[1] + ((b[1] - a[1]) * i) / steps);
      if (col.rim) c.set(x + 1, y + 1, col.rim);
      c.set(x, y, color); c.set(x + 1, y, color);
    }
  };
  const gap = R + 3;
  if (n >= 1) seg([cx - R * 2.6, cy + R * 4.6], [cx - R * 0.9, cy + gap], col.line, false);
  if (n >= 2) seg([cx + R * 2.6, cy + R * 4.6], [cx + R * 0.9, cy + gap], col.line, false);
  if (n >= 3) seg([cx, cy + R * 5], [cx, cy + gap], col.third ?? col.line, true);
}

// ---------------------------------------------------------------- bangun sprite
export function buildTemple(P) {
  const S = {};
  const st = P.stone;

  // ---- kolom ----
  function column(kind) {
    const c = new Canvas(36, 92);
    const cx = 18;
    // alas
    topBox(c, 5, 74, 26, 4, st, 4); faceBox(c, 5, 78, 26, 8, st, 3, 11);
    const top = kind === 'broken' ? 40 : 18;
    if (kind === 'cracked') {
      shaft(c, cx, 40, 74, 18, st, 3, 5);
      shaft(c, cx + 3, 18, 36, 18, st, 3, 6);
      c.line(cx - 9, 38, cx + 12, 38, st[0]); c.line(cx - 9, 39, cx + 12, 39, P.gold[1]);
      c.set(cx - 2, 39, P.gold[3]); c.set(cx + 5, 39, P.gold[3]);
      crack(c, [[cx - 9, 46], [cx - 5, 52], [cx - 7, 60]], st[0], st[5]);
    } else {
      shaft(c, cx, top, 74, 18, st, 3, 5);
    }
    if (kind === 'broken') {
      // tepi patah bergerigi
      for (let x = cx - 9; x < cx + 9; x++) {
        const j = Math.floor(hash(x, 3, 12) * 7);
        for (let y = top - 4; y < top + j; y++) c.set(x, y, [0, 0, 0], 0);
        for (let y = top - 4; y < top + j; y++) { const o = c.d[(y * c.w + x) * 4 + 3]; if (o) c.d[(y * c.w + x) * 4 + 3] = 0; }
      }
      topBox(c, cx - 8, top + 2, 9, 3, st, 5, 14);
      // serpihan di kaki
      for (const [dx, dy] of [[-12, 84], [13, 85], [6, 87]]) { topBox(c, cx + dx, dy - 2, 5, 2, st, 4, 9); faceBox(c, cx + dx, dy, 5, 3, st, 2, 10); }
    } else {
      // kapital
      topBox(c, 5, 7, 26, 4, st, 5, 15); faceBox(c, 5, 11, 26, 7, st, 3, 16);
      c.line(8, 14, 28, 14, st[1]);
    }
    if (kind === 'ringed') {
      for (let y = 44; y <= 50; y++) for (let x = cx - 10; x <= cx + 9; x++) c.set(x, y, at(P.steel, 1 + ((x - cx + 10) < 4 ? 2 : (x - cx + 10) > 15 ? -1 : 1) + (y === 44 ? 1 : y === 50 ? -1 : 0)));
      c.set(cx + 5, 46, [0, 0, 0], 0); c.d[(46 * c.w + cx + 5) * 4 + 3] = 0;
      for (let y = 44; y <= 51; y++) { c.set(cx + 4 + (y % 2), y, st[0]); }
      c.set(cx - 8, 47, P.bronze[3]); c.set(cx - 8, 48, P.bronze[2]); // paku ikat
      c.line(cx + 6, 51, cx + 8, 58, P.steel[1]);
    }
    mossAlong(c, P, 5, 30, 85, 5, 13); mossAlong(c, P, 8, 14, 72, 8, 14);
    weather(c, P, 20 + top);
    c.outline();
    return A(c, 18, 86, [24, 12]);
  }
  S.column = column('whole');
  S.column_broken = column('broken');
  S.column_cracked = column('cracked');
  S.column_ringed = column('ringed');

  // ---- kolom roboh ----
  {
    const c = new Canvas(88, 30);
    for (let x = 6; x < 80; x++) for (let y = 4; y < 24; y++) {
      const u = (y - 4 + 0.5) / 20;
      let idx = u < 0.18 ? 5 : u < 0.4 ? 4 : u < 0.68 ? 3 : u < 0.88 ? 2 : 1;
      if ((x - 6) % 22 === 0) idx -= 1;
      if (hash(x >> 1, y >> 1, 21) < 0.1) idx -= 1;
      c.set(x, y, at(st, idx));
    }
    c.ellipse(78, 14, 4, 10, st[2]); c.ellipse(77, 14, 3, 8, st[4]); c.ellipse(76, 13, 1.5, 4, st[5]);
    for (let y = 5; y < 22; y++) { c.set(6, y, [0, 0, 0], 0); c.d[(y * c.w + 6) * 4 + 3] = 0; }
    for (let y = 4; y < 24; y++) { const x = 6 + Math.floor(hash(y, 1, 23) * 4); for (let k = 6; k <= x; k++) c.d[(y * c.w + k) * 4 + 3] = 0; }
    mossAlong(c, P, 14, 70, 7, 3, 22, true);
    crack(c, [[40, 4], [43, 11], [41, 18], [44, 23]], st[0], st[5]);
    c.outline();
    S.column_fallen = A(c, 44, 27, [72, 14]);
  }

  // ---- patung penjaga ----
  {
    const c = new Canvas(44, 84);
    topBox(c, 8, 70, 28, 4, st, 4, 31); faceBox(c, 8, 74, 28, 9, st, 3, 32);
    // jubah/tabard
    for (let y = 40; y < 70; y++) for (let x = 14; x < 30; x++) {
      const u = (x - 14) / 16;
      c.set(x, y, at(st, (u < 0.2 ? 5 : u < 0.55 ? 4 : u < 0.85 ? 3 : 2) - (hash(x, y >> 2, 33) < 0.1 ? 1 : 0)));
    }
    for (let y = 40; y < 70; y += 6) c.line(15, y, 28, y, st[2]);
    // bahu dan lengan
    c.ellipse(12, 42, 5, 4, st[4]); c.ellipse(32, 42, 5, 4, st[3]); c.ellipse(11, 41, 3, 2, st[5]);
    // perisai di lengan kiri (cincin lambang)
    for (let y = 44; y < 66; y++) for (let x = 6; x < 17; x++) { const d = (x - 11.5) ** 2 / 30 + (y - 55) ** 2 / 130; if (d <= 1) c.set(x, y, at(st, x < 10 ? 5 : x < 14 ? 4 : 3)); }
    ringPx(c, 11, 54, 3, st[1]);
    // pedang tertancap
    c.rect(21, 48, 2, 22, st[5]); c.rect(23, 48, 1, 22, st[2]); c.rect(18, 46, 8, 2, st[3]); c.rect(21, 44, 2, 2, st[4]);
    // kepala
    c.ellipse(22, 30, 7, 9, st[4]); c.ellipse(21, 29, 5, 7, st[5]); c.ellipse(24, 33, 4, 5, st[3]);
    c.rect(18, 31, 9, 2, st[0]); // celah visor
    c.rect(21, 22, 2, 6, st[3]); // jambul helm
    c.rect(21, 20, 2, 2, st[5]);
    // retak dan lumut
    crack(c, [[26, 24], [24, 30], [27, 36]], st[0], null);
    mossAlong(c, P, 12, 34, 44, 4, 34); mossAlong(c, P, 10, 34, 82, 4, 35);
    weather(c, P, 36);
    c.outline();
    S.statue_guard = A(c, 22, 80, [28, 12]);
  }

  // ---- perapian dingin ----
  {
    const c = new Canvas(34, 46);
    c.line(9, 24, 6, 43, P.bronze[1]); c.line(25, 24, 28, 43, P.bronze[1]); c.line(17, 26, 17, 44, P.bronze[2]); c.line(18, 26, 18, 44, P.bronze[1]);
    c.ellipse(17, 43, 10, 2.5, P.bronze[1]);
    c.ellipse(17, 20, 15, 7, P.bronze[1]); c.ellipse(17, 18, 15, 7, P.bronze[3]);
    c.ellipse(17, 17, 13, 5.5, P.bronze[2]); c.ellipse(17, 17, 11.5, 4.5, P.stone[1]);
    c.ellipse(16, 17, 8, 2.5, P.stone[2]);
    for (const [x, y] of [[12, 16], [17, 18], [22, 16], [15, 17]]) c.set(x, y, P.stone[3]);
    c.rect(4, 20, 26, 2, P.bronze[2]); c.rect(4, 20, 8, 1, P.bronze[4]);
    c.outline();
    S.brazier_cold = A(c, 17, 44, [18, 10]);
  }

  // ---- api unggun (2 frame) ----
  for (const f of ['a', 'b']) {
    const c = new Canvas(52, 44);
    // lingkar batu
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, x = 26 + Math.cos(a) * 19, y = 32 + Math.sin(a) * 7;
      const lit = Math.cos(a) < 0 && Math.sin(a) < 0.3;
      c.ellipse(x, y, 4.5, 3, at(st, lit ? 4 : 2)); c.ellipse(x - 1, y - 1, 2.5, 1.5, at(st, lit ? 5 : 3));
    }
    c.ellipse(26, 32, 14, 4.5, P.floor[0]);
    c.ellipse(26, 32, 11, 3.5, P.stone[0]);
    // kayu bakar
    c.line(14, 34, 38, 28, P.wood[2]); c.line(14, 35, 38, 29, P.wood[1]); c.line(15, 28, 37, 35, P.wood[3]); c.line(15, 29, 37, 36, P.wood[1]);
    c.set(14, 34, P.wood[4]); c.set(37, 35, P.wood[4]);
    // api kecil, tanpa pendar: bentuk padat berlapis
    const sway = f === 'a' ? 0 : 1;
    c.poly([[21, 30], [22, 22], [24 + sway, 16], [26 + sway, 9 + sway], [28, 16], [31 - sway, 21], [32, 30]], P.fire[1]);
    c.poly([[23, 30], [24, 23], [26 + sway, 15 + sway], [28, 21], [30, 30]], P.fire[2]);
    c.poly([[25, 30], [26, 24], [27, 22 - sway], [28, 30]], P.fire[3]);
    c.set(26, 27, P.fire[4]); c.set(26, 28, P.fire[4]);
    c.outline(P.fire[0]);
    S['fire_' + f] = A(c, 26, 38, [40, 14]);
  }

  // ---- gulungan tidur, peti, ransel, kayu duduk ----
  for (const [name, cl] of [['bedroll_a', P.cloth], ['bedroll_b', P.red]]) {
    const c = new Canvas(44, 20);
    for (let y = 3; y < 16; y++) for (let x = 4; x < 38; x++) { const e = (x < 6 || x > 35) && (y < 5 || y > 13); if (e) continue; c.set(x, y, at(cl, y < 5 ? 3 : y < 11 ? 2 : 1)); }
    for (let x = 14; x < 36; x += 8) c.line(x, 4, x, 14, at(cl, 1));
    c.rect(4, 3, 9, 12, P.cream[2]); c.rect(5, 4, 7, 4, P.cream[3]); c.line(4, 15, 12, 15, P.cream[1]);
    c.line(14, 3, 37, 3, at(cl, 3));
    c.outline();
    S[name] = A(c, 22, 17);
  }
  {
    const c = new Canvas(44, 44);
    faceBox(c, 4, 22, 22, 18, P.wood, 3, 51); topBox(c, 4, 17, 22, 5, P.wood, 4, 52);
    faceBox(c, 20, 10, 20, 17, P.wood, 3, 53); topBox(c, 20, 6, 20, 4, P.wood, 4, 54);
    for (const [x, y, w] of [[4, 28, 22], [20, 17, 20]]) { c.line(x, y, x + w - 1, y, P.wood[1]); }
    c.rect(14, 24, 3, 3, P.bronze[3]); c.rect(29, 12, 3, 3, P.bronze[3]);
    c.outline();
    S.crate_stack = A(c, 22, 41, [32, 14]);
  }
  {
    const c = new Canvas(20, 20);
    c.ellipse(10, 11, 7, 7, P.cloth[2]); c.ellipse(9, 9, 5, 4, P.cloth[3]); c.rect(3, 15, 14, 3, P.cloth[1]);
    c.line(5, 7, 15, 7, P.wood[2]); c.line(10, 3, 10, 7, P.wood[2]); c.set(10, 8, P.bronze[3]);
    c.outline();
    S.pack = A(c, 10, 18);
  }
  {
    const c = new Canvas(44, 20);
    for (let x = 4; x < 40; x++) for (let y = 4; y < 17; y++) { const u = (y - 4) / 13; c.set(x, y, P.wood[u < 0.25 ? 3 : u < 0.6 ? 2 : u < 0.85 ? 1 : 0]); if (hash(x >> 1, y, 5) < 0.12) c.set(x, y, P.wood[1]); }
    c.ellipse(5, 10, 3, 6.5, P.wood[3]); c.ellipse(5, 10, 2, 4.5, P.wood[4]); c.ellipse(5, 10, 1, 2, P.wood[2]);
    c.line(14, 6, 16, 14, P.wood[0]); c.line(27, 5, 28, 13, P.wood[0]);
    c.outline();
    S.log_seat = A(c, 22, 18, [32, 10]);
  }

  // ---- pilar bergaris (teka-teki A) ----
  for (let n = 1; n <= 3; n++)
    for (const on of [false, true]) {
      const c = new Canvas(46, 94);
      const cx = 23;
      topBox(c, 5, 76, 36, 4, st, 4, 60); faceBox(c, 5, 80, 36, 9, st, 3, 61);
      for (let y = 16; y < 78; y++) for (let x = 8; x < 38; x++) {
        const u = (x - 8) / 30;
        let idx = u < 0.1 ? 5 : u < 0.62 ? 4 : u < 0.88 ? 3 : 2;
        if (hash(x >> 1, y >> 2, 62 + n) < 0.1) idx -= 1;
        c.set(x, y, at(st, idx));
      }
      for (let y = 16; y < 78; y += 15) c.line(8, y, 37, y, st[2]);
      c.poly([[7, 16], [39, 16], [32, 6], [14, 6]], (x) => at(st, x < 20 ? 6 : x < 28 ? 5 : 4));
      c.line(8, 16, 37, 16, st[1]);
      c.rect(11, 19, 24, 50, st[1]); c.rect(12, 20, 22, 48, on ? P.plum[2] : st[2]); c.line(12, 68, 33, 68, st[5]);
      const col = on
        ? { ring: P.gold[4], line: P.gold[4], rim: P.gold[1], third: P.gold[2] }
        : { ring: st[5], line: st[5], rim: st[0], third: st[4] };
      drawGlyph(c, cx, 31, n, 5, col);
      if (n === 3) {
        c.rect(19, 50, 9, 14, st[5]); c.rect(20, 51, 7, 12, st[4]); c.line(19, 64, 27, 64, st[2]);
        for (let y = 53; y < 62; y += 3) c.line(20, y, 26, y + 1, st[3]);
        c.rect(19, 50, 9, 1, P.lime[2]);
      }
      if (on) { c.line(9, 17, 36, 17, P.gold[3]); c.set(22, 8, P.gold[4]); c.set(23, 8, P.gold[4]); c.set(23, 9, P.gold[3]); }
      mossAlong(c, P, 6, 40, 89, 5, 63 + n); mossAlong(c, P, 8, 16, 78, 9, 64 + n);
      weather(c, P, 65 + n);
      c.outline();
      S[`pillar_a${n}_${on ? 'on' : 'off'}`] = A(c, 23, 88, [26, 12]);
    }

  // ---- cakram segel di dinding (teka-teki B) ----
  for (let k = 1; k <= 3; k++)
    for (const on of [false, true]) {
      const c = new Canvas(40, 40);
      c.ellipse(20, 19, 17, 17, P.bronze[on ? 3 : 2]); c.ellipse(20, 19, 15, 15, P.bronze[1]);
      c.ellipse(20, 19, 13, 13, st[3]); c.ellipse(19, 18, 11, 11, st[4]); c.ellipse(18, 17, 6, 6, st[5]);
      for (let a = 0; a < 8; a++) { const x = 20 + Math.cos((a / 8) * 6.283) * 15.5, y = 19 + Math.sin((a / 8) * 6.283) * 15.5; c.set(Math.round(x), Math.round(y), P.bronze[on ? 4 : 3]); }
      const g = on ? P.gold[4] : st[1];
      const g2 = on ? P.gold[2] : st[5];
      if (k === 1) { ringPx(c, 20, 19, 6, g); ringPx(c, 20, 19, 5, g); c.rect(19, 18, 2, 2, g); }
      if (k === 2) { for (let y = 10; y <= 28; y++) { const dx = Math.round(5 - Math.abs(y - 19) * 0.25); c.set(20 - dx - 2, y, g); c.set(20 + dx + 2, y, g); } }
      if (k === 3) { for (let i = 0; i < 30; i++) { const a = 0.55 + (i / 30) * (Math.PI * 2 - 1.1); c.set(Math.round(20 + Math.cos(a) * 7), Math.round(19 - Math.sin(a) * 7 + 0), g); } c.rect(19, 26, 2, 4, g); }
      if (!on) { for (let i = 0; i < 4; i++) c.set(21 + i, 20 + i, g2); }
      else { ringPx(c, 20, 19, 12, P.gold[3]); }
      c.outline();
      S[`disc_b${k}_${on ? 'on' : 'off'}`] = A(c, 20, 38);
    }

  // ---- alas arah (teka-teki C): dial 0=N 1=E 2=S 3=W ----
  const DIR = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  for (const kind of ['dial', 'dialm'])
    for (let d = 0; d < 4; d++)
      for (const state of ['off', 'on', 'frozen']) {
        const c = new Canvas(44, 54);
        const cx = 22, ty = 24;
        // badan silinder
        for (let y = ty; y <= 44; y++) for (let x = 6; x < 38; x++) {
          const u = (x - 6) / 32, half = 16, e = ((x + 0.5 - 22) / half) ** 2;
          if (e > 1) continue;
          let idx = u < 0.14 ? 5 : u < 0.4 ? 4 : u < 0.7 ? 3 : u < 0.9 ? 2 : 1;
          if (y > 41) idx -= 1;
          if (hash(x >> 1, y >> 1, 71) < 0.1) idx -= 1;
          c.set(x, y, at(st, idx));
        }
        c.ellipse(cx, 44, 16, 5, st[2]);
        for (let y = ty; y <= 44; y++) { c.set(6, y, st[5]); }
        // atas elips
        c.ellipse(cx, ty, 16, 8, st[3]); c.ellipse(cx - 1, ty - 1, 14, 6.6, st[4]); c.ellipse(cx, ty, 11, 5, st[2]); c.ellipse(cx, ty, 9.5, 4, st[3]);
        ringPx(c, cx, ty, 9, st[1], 4);
        const needle = state === 'on' ? P.gold[4] : state === 'off' ? P.bronze[4] : st[1];
        const needle2 = state === 'on' ? P.gold[2] : state === 'off' ? P.bronze[2] : st[4];
        const [dx, dy] = DIR[d];
        const tx = cx + dx * 9, ty2 = ty + dy * 4;
        if (kind === 'dial') {
          const steps = 9;
          for (let i = 0; i <= steps; i++) { const x = Math.round(cx + (dx * 10 * i) / steps), y = Math.round(ty + (dy * 5 * i) / steps); c.set(x, y, needle); c.set(x + (dy !== 0 ? 1 : 0), y + (dx !== 0 ? 1 : 0), needle); c.set(x - (dy !== 0 ? 1 : 0), y - (dx !== 0 ? 1 : 0), needle2); c.set(x, y + 1, needle2); }
          c.ellipse(cx, ty, 1.6, 1, needle);
          c.set(tx, ty2, state === 'frozen' ? st[3] : P.gold[4]);
        } else {
          // alas yang ditutup belakangan: tambalan plester lebih terang tanpa jarum
          c.ellipse(cx, ty, 9.5, 4.2, st[5]); c.ellipse(cx - 1, ty - 1, 8, 3.2, P.stone[6]);
          for (let i = -7; i <= 7; i += 3) c.line(cx + i - 1, ty + 2, cx + i + 2, ty - 2, st[4]);
          c.line(cx - 9, ty + 1, cx + 9, ty + 1, st[4]);
        }
        // takik arah di bibir (terbaca walau atasnya ditutup)
        const nx = Math.round(cx + dx * 15), ny = Math.round(ty + dy * 7);
        c.rect(nx - 1, ny - 1, 3, 2, state === 'on' ? P.gold[4] : state === 'off' ? P.bronze[4] : st[0]);
        if (state === 'frozen') {
          crack(c, [[cx - 8, ty - 3], [cx - 2, ty + 1], [cx + 4, ty - 1], [cx + 9, ty + 3]], st[0], st[5]);
          c.set(cx + 4, ty, P.plum[5]); c.set(cx - 2, ty + 1, P.plum[5]);
        }
        if (state === 'on') { ringPx(c, cx, ty, 13, P.gold[2], 6); }
        mossAlong(c, P, 8, 36, 46, 4, 72 + d);
        c.outline();
        S[`${kind}_${d}_${state}`] = A(c, 22, 50, [30, 14]);
      }

  // ---- gerbang aula ----
  function gate(open) {
    // open: 0 tertutup, 1 setengah, 2 terbuka
    const c = new Canvas(120, 92);
    const L = 8, Rr = 112, top = 24, base = 90;
    // ambang atas (lintel) dan tiang
    faceBox(c, 0, 6, 120, 18, st, 3, 81); topBox(c, 0, 0, 120, 6, st, 5, 82);
    for (let x = 0; x < 120; x += 24) c.line(x + ((x / 24) % 2) * 6, 7, x + ((x / 24) % 2) * 6, 22, st[1]);
    c.line(0, 22, 119, 22, st[1]);
    faceBox(c, 0, 24, 8, 66, st, 3, 83); faceBox(c, 112, 24, 8, 66, st, 2, 84);
    // soket 3 lampu di lintel
    for (const x of [28, 56, 84]) { c.rect(x + 4 - 6, 8, 12, 12, st[0]); c.rect(x + 4 - 5, 9, 10, 10, P.plum[2]); c.line(x - 2, 20, x + 10, 20, st[5]); }
    const seam = 60;
    // daun pintu
    const leaf = (x0, x1, flip) => {
      for (let y = top; y < base; y++) for (let x = x0; x < x1; x++) {
        const u = (x - x0) / (x1 - x0);
        let idx = (flip ? (u > 0.75 ? 4 : u > 0.3 ? 3 : 2) : (u < 0.2 ? 4 : u < 0.7 ? 3 : 2));
        if ((y - top) % 16 === 15) idx = 1;
        if (hash(x >> 1, y >> 1, 85) < 0.1) idx -= 1;
        c.set(x, y, at(st, idx));
      }
      for (let y = top; y < base; y++) { c.set(flip ? x1 - 1 : x0, y, st[1]); }
    };
    const shift = open === 0 ? 0 : open === 1 ? 14 : 30;
    if (open === 2) {
      // celah terbuka: transparan (lorong tampak dari dasar peta); hanya daun yang mengecil ke tiang
      leaf(L, L + 22, false); leaf(Rr - 22, Rr, true);
    } else {
      leaf(L, seam - shift, false); leaf(seam + shift, Rr, true);
      // bukaan berisi relung gelap dengan garis cahaya pucat
      if (open === 1) {
        for (let y = top; y < base; y++) for (let x = seam - shift; x < seam + shift; x++) c.set(x, y, y > base - 6 ? P.lit[4] : y > base - 10 ? P.plum[2] : P.plum[1]);
        c.rect(seam - 1, top, 2, base - top - 10, P.lit[5]);
      }
    }
    // lambang di daun: cincin besar + dua garis, garis tengah ditutup tambalan (lime di tepi tambalan)
    if (open < 2) {
      const cx = seam, cy = 50;
      ringPx(c, cx - (open === 1 ? 0 : 0), cy, 11, P.gold[2]); ringPx(c, cx, cy, 10, P.gold[2]);
      for (let i = 0; i < 18; i++) { c.set(cx - 24 + Math.round(i * 0.9), cy + 30 - i, P.gold[3]); c.set(cx + 24 - Math.round(i * 0.9), cy + 30 - i, P.gold[3]); }
      if (open === 0) {
        c.rect(cx - 3, cy + 14, 7, 20, st[5]); c.rect(cx - 2, cy + 15, 5, 18, st[4]);
        for (let y = cy + 15; y < cy + 33; y += 3) c.line(cx - 2, y, cx + 2, y + 1, st[3]);
        c.rect(cx - 3, cy + 14, 7, 1, P.lime[2]); c.rect(cx - 3, cy + 33, 7, 1, P.lime[1]);
        c.line(cx, 24, cx, base - 1, st[0]);
      }
    } else {
      for (const x of [L + 11, Rr - 11]) { ringPx(c, x, 50, 5, P.gold[2]); ringPx(c, x, 50, 4, P.gold[1]); }
    }
    // retak
    crack(c, [[20, 30], [24, 38], [21, 46], [25, 58]], st[0], st[5]);
    crack(c, [[98, 40], [95, 50], [99, 62]], st[0], st[5]);
    mossAlong(c, P, 0, 119, base, 6, 86);
    // ambang lantai
    c.rect(0, base, 120, 2, st[1]);
    weather(c, P, 87);
    c.outline();
    // jaga celah terbuka transparan setelah garis tepi
    return A(c, 60, 90);
  }
  S.gate_closed = gate(0); S.gate_half = gate(1); S.gate_open = gate(2);

  for (const on of [false, true]) {
    const c = new Canvas(14, 18);
    c.rect(2, 14, 10, 3, P.bronze[2]); c.rect(3, 12, 8, 3, P.bronze[3]); c.rect(2, 16, 10, 1, P.bronze[1]);
    if (on) {
      c.poly([[7, 2], [11, 8], [10, 12], [4, 12], [3, 8]], P.gold[2]);
      c.poly([[7, 4], [9, 8], [8, 12], [6, 12], [5, 8]], P.gold[3]); c.set(7, 9, P.gold[4]); c.set(7, 8, P.gold[4]);
    } else { c.rect(5, 10, 4, 3, P.bronze[0]); c.set(7, 11, P.stone[3]); }
    c.outline();
    S[`gate_lamp_${on ? 'on' : 'off'}`] = A(c, 7, 17);
  }

  // ---- lampu yang berhenti (teka-teki B) ----
  {
    const c = new Canvas(76, 104);
    // tiang besi di kiri, lengan melengkung ke kanan, rantai, lentera
    for (let y = 22; y < 100; y++) { c.set(10, y, P.steel[3]); c.set(11, y, P.steel[2]); c.set(12, y, P.steel[2]); c.set(13, y, P.steel[1]); }
    topBox(c, 4, 96, 16, 3, st, 4, 91); faceBox(c, 4, 99, 16, 4, st, 3, 92);
    for (const [x, y] of [[12, 22], [14, 17], [18, 13], [24, 11], [31, 10], [38, 10], [44, 12], [50, 14]]) { c.rect(x - 1, y - 1, 3, 3, P.steel[2]); c.set(x - 1, y - 1, P.steel[3]); }
    c.line(50, 15, 50, 40, P.steel[2]);
    for (let y = 18; y < 40; y += 3) { c.set(49, y, P.steel[3]); c.set(51, y + 1, P.steel[1]); }
    // lentera perunggu
    c.rect(41, 40, 18, 3, P.bronze[3]);
    c.poly([[43, 43], [57, 43], [58, 62], [42, 62]], (x) => at(P.bronze, x < 47 ? 3 : x < 54 ? 2 : 1));
    c.poly([[46, 46], [54, 46], [55, 60], [45, 60]], P.plum[1]);
    // api yang berhenti (bentuk padat)
    c.poly([[50, 48], [53, 54], [52, 59], [48, 59], [47, 54]], P.gold[3]); c.poly([[50, 51], [51, 55], [50, 58], [49, 55]], P.gold[4]);
    c.rect(40, 62, 20, 3, P.bronze[2]); c.rect(46, 65, 8, 3, P.bronze[1]);
    // percikan beku di bawah lentera
    for (const [x, y] of [[48, 72], [53, 77], [50, 83]]) { c.set(x, y, P.gold[4]); c.set(x + 1, y, P.gold[2]); c.set(x, y + 1, P.gold[2]); }
    c.outline();
    S.lamp_frozen = A(c, 12, 100, [14, 8]);
  }

  // ---- Chronolith (batu penjaga) ----
  function chronolith(mode) {
    const W = 156, H = 154;
    const c = new Canvas(W, H);
    const wake = mode === 'wake', still = mode === 'still';
    const raise = wake ? 6 : 0;
    // alas bertingkat
    topBox(c, 14, 130, 128, 4, st, 4, 101); faceBox(c, 14, 134, 128, 14, st, 3, 102);
    topBox(c, 22, 122, 112, 4, st, 5, 103); faceBox(c, 22, 126, 112, 6, st, 3, 104);
    // dua tiang
    for (const x0 of [26, 100]) {
      for (let y = 52; y < 124; y++) for (let x = x0; x < x0 + 30; x++) {
        const u = (x - x0) / 30;
        let idx = u < 0.14 ? 5 : u < 0.55 ? 4 : u < 0.85 ? 3 : 2;
        if ((y - 52) % 18 === 17) idx = 1;
        if (hash(x >> 1, y >> 1, 105) < 0.1) idx -= 1;
        c.set(x, y, at(st, idx));
      }
      topBox(c, x0 - 3, 46, 36, 6, st, 5, 106);
      // alur rune pada tiang
      for (let y = 62; y < 112; y += 10) { c.rect(x0 + 12, y, 6, 2, wake ? P.gold[3] : P.plum[3]); c.rect(x0 + 14, y + 2, 2, 5, wake ? P.gold[2] : P.plum[2]); }
    }
    // busur penghubung
    c.poly([[24, 50], [132, 50], [128, 22], [108, 8], [48, 8], [28, 22]], (x, y) => at(st, y < 16 ? 5 : y < 30 ? 4 : x < 78 ? 4 : 3));
    for (let x = 40; x < 118; x += 15) c.line(x, 8, x - 4, 30, st[2]);
    c.line(28, 30, 128, 30, st[2]);
    // rongga busur
    c.ellipse(78, 62, 26, 32, P.plum[1]); c.ellipse(78, 66, 23, 29, P.plum[0]);
    for (let y = 50; y < 124; y++) for (let x = 56; x < 100; x++) { if (c.alpha(x, y) < 255 || y > 120) continue; }
    c.rect(56, 90, 44, 32, P.plum[0]);
    c.ellipse(78, 66, 23, 29, P.plum[0]);
    // inti melayang (belah ketupat) dalam rongga
    const cy = 82 - raise, cx = 78;
    c.poly([[cx, cy - 22], [cx + 13, cy], [cx, cy + 22], [cx - 13, cy]], (x) => at(still ? P.stone : P.plum, still ? (x < cx ? 3 : 2) : x < cx ? 4 : 3));
    if (!still) {
      c.poly([[cx, cy - 15], [cx + 7, cy], [cx, cy + 15], [cx - 7, cy]], wake ? P.gold[3] : P.plum[2]);
      c.poly([[cx, cy - 8], [cx + 3, cy], [cx, cy + 8], [cx - 3, cy]], wake ? P.gold[4] : P.plum[4]);
      c.line(cx, cy - 22, cx, cy + 22, wake ? P.gold[2] : P.plum[1]);
    } else {
      crack(c, [[cx, cy - 22], [cx - 3, cy - 8], [cx + 2, cy + 4], [cx - 1, cy + 22]], st[0], st[4]);
    }
    // serpihan melayang (diam, jarak diskret) dan "lengan" batu
    const shards = still
      ? [[34, 120, 9, 5], [112, 119, 11, 5], [60, 124, 7, 4]]
      : [[2 - raise, 70, 16, 28], [138 + raise, 74, 16, 28], [44, 30 - raise, 11, 8], [102, 28 - raise, 12, 8]];
    for (const [x, y, w, h] of shards) {
      faceBox(c, x, y, w, h, st, 3, 110 + x); topBox(c, x, y - 2, w, 3, st, 5, 111 + x);
      if (!still) { c.rect(x + 3, y + h, 3, 1, P.plum[1]); c.rect(x + 2, y + h + 4, 3, 1, P.plum[2]); } // jarak kuantisasi di bawah serpihan
    }
    // retak waktu: potongan bergeser
    crack(c, [[34, 66], [38, 72], [34, 80], [38, 88], [35, 96]], st[0], st[5]);
    crack(c, [[112, 58], [108, 66], [112, 74], [108, 82]], st[0], st[5]);
    if (still) { for (const [x0, w] of [[26, 30], [100, 30]]) mossAlong(c, P, x0, x0 + w, 122, 10, 120 + x0); mossAlong(c, P, 30, 126, 22, 7, 121, true); }
    else { mossAlong(c, P, 20, 136, 130, 5, 122); mossAlong(c, P, 26, 56, 52, 6, 123, true); }
    weather(c, P, 124);
    c.outline();
    return A(c, 78, 148, [112, 22]);
  }
  S.chronolith_dormant = chronolith('dormant'); S.chronolith_wake = chronolith('wake'); S.chronolith_still = chronolith('still');

  // ---- catatan di dinding, pintu keluar, prasasti, lectern, papan ----
  {
    const c = new Canvas(60, 52);
    faceBox(c, 2, 4, 56, 44, st, 3, 131); topBox(c, 0, 0, 60, 4, st, 5, 132);
    c.rect(6, 8, 48, 36, P.bronze[1]); c.rect(7, 9, 46, 34, P.bronze[2]); c.rect(8, 10, 44, 32, P.bronze[3] ); c.rect(9, 11, 42, 30, P.bronze[2]);
    for (let y = 20; y < 40; y += 4) for (let x = 11; x < 49; x += 1) if (hash(x, y, 133) < 0.78 && !(x > 30 && y === 36)) c.set(x, y, P.bronze[0]);
    drawEmblem(c, 30, 15, 3, 0.7, { ring: P.gold[4], line: P.gold[3], shade: P.bronze[1], third: P.gold[1] });
    crack(c, [[44, 10], [41, 20], [45, 30], [42, 41]], st[0], P.bronze[4]);
    for (const [x, y] of [[8, 11], [50, 11], [8, 40], [50, 40]]) c.set(x, y, P.bronze[4]);
    c.outline();
    S.record_plaque = A(c, 30, 49);
  }
  {
    const c = new Canvas(52, 70);
    faceBox(c, 2, 8, 48, 60, st, 3, 141); topBox(c, 0, 2, 52, 6, st, 5, 142);
    for (let y = 8; y < 68; y += 12) c.line(2, y, 49, y, st[1]);
    // ambang lengkung dengan cahaya siang
    for (let y = 14; y < 66; y++) for (let x = 11; x < 41; x++) {
      const dx = (x - 26) / 15, top = 14 + (1 - Math.sqrt(Math.max(0, 1 - dx * dx))) * 14;
      if (y < top) continue;
      const t = (y - 14) / 52;
      c.set(x, y, at(P.sky, t < 0.3 ? 3 : t < 0.65 ? 2 : 1));
    }
    for (const [x, y, r] of [[19, 30, 4], [30, 24, 5], [36, 36, 4], [22, 44, 4]]) { c.ellipse(x, y, r, r - 1, P.leaf[2]); c.ellipse(x - 1, y - 1, r - 2, r - 3, P.leaf[3]); }
    c.line(26, 60, 26, 64, P.sky[3]);
    c.rect(9, 62, 34, 3, st[5]); c.rect(9, 65, 34, 2, st[2]);
    mossAlong(c, P, 2, 49, 67, 5, 143);
    crack(c, [[8, 16], [10, 26], [8, 38]], st[0], st[5]);
    c.outline();
    S.exit_door = A(c, 26, 68);
  }
  {
    const c = new Canvas(34, 44);
    topBox(c, 4, 6, 26, 4, st, 5, 151); faceBox(c, 4, 10, 26, 28, st, 3, 152);
    c.rect(8, 14, 18, 14, st[2]); for (let y = 17; y < 28; y += 3) c.line(10, y, 23, y, st[1]); c.line(10, 25, 17, 25, st[3]);
    // cincin logam retak terpasang belakangan
    c.rect(4, 31, 26, 3, P.steel[2]); c.rect(4, 31, 26, 1, P.steel[3]); c.set(17, 32, [0, 0, 0], 0); c.d[(32 * c.w + 17) * 4 + 3] = 0; c.set(17, 33, st[0]);
    c.outline();
    S.plinth = A(c, 17, 41, [24, 10]);
  }
  {
    const c = new Canvas(34, 44);
    faceBox(c, 8, 20, 18, 20, st, 3, 161); topBox(c, 6, 16, 22, 4, st, 4, 162);
    c.poly([[5, 17], [29, 17], [27, 8], [7, 8]], (x, y) => at(st, y < 11 ? 6 : 5));
    c.poly([[8, 10], [26, 10], [25, 15], [9, 15]], P.cream[2]);
    for (let x = 10; x < 24; x += 2) c.set(x, 12, P.cream[0]);
    c.line(10, 14, 20, 14, P.cream[1]);
    c.set(25, 9, P.gold[3]); c.set(24, 9, P.gold[2]);
    c.outline();
    S.note_lectern = A(c, 17, 41, [22, 10]);
  }
  {
    const c = new Canvas(26, 44);
    c.rect(11, 8, 4, 34, P.wood[2]); c.rect(11, 8, 1, 34, P.wood[3]); c.rect(14, 8, 1, 34, P.wood[1]);
    c.poly([[3, 12], [20, 12], [24, 17], [20, 22], [3, 22]], (x, y) => at(P.wood, y < 15 ? 4 : 3));
    c.line(3, 22, 20, 22, P.wood[1]);
    ringPx(c, 10, 17, 3, P.wood[1]); c.line(14, 17, 21, 17, P.wood[1]);
    mossAlong(c, P, 8, 17, 42, 3, 171);
    c.outline();
    S.sign_back = A(c, 13, 41, [12, 8]);
  }

  // ---- tumbuhan dan puing ----
  function shrub() {
    const c = new Canvas(46, 38);
    const rng = new Rng(181);
    for (const [x, y, rx, ry] of [[12, 24, 11, 9], [30, 22, 12, 10], [21, 15, 11, 9], [38, 28, 7, 6], [7, 30, 6, 5]]) {
      c.ellipse(x, y, rx, ry, P.leaf[1]);
      c.ellipse(x - 1, y - 1, rx - 2, ry - 2, P.leaf[2]);
      c.ellipse(x - 3, y - 3, rx - 5, ry - 5, P.leaf[3]);
      for (let i = 0; i < 4; i++) c.set(Math.round(x - rx / 2 + rng.range(0, rx)), Math.round(y - ry / 2 + rng.range(0, ry / 2)), P.leaf[4]);
    }
    c.rect(18, 30, 3, 4, P.wood[1]);
    c.outline();
    return A(c, 23, 34, [28, 10]);
  }
  S.shrub = shrub();
  for (const [name, seed] of [['fern', 191], ['fern_b', 192]]) {
    const c = new Canvas(32, 24);
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI + (i / 6) * Math.PI, len = 8 + hash(i, seed, 1) * 6;
      for (let t = 0; t <= len; t++) {
        const x = 16 + Math.cos(a) * t * 1.3, y = 21 + Math.sin(a) * t * 0.85 + (t * t) * 0.012;
        c.set(Math.round(x), Math.round(y), P.leaf[t < len / 2 ? 2 : 3]);
        if (t % 3 === 1) { c.set(Math.round(x), Math.round(y) + 1, P.leaf[1]); c.set(Math.round(x), Math.round(y) - 1, P.leaf[3]); }
      }
    }
    c.rect(15, 20, 3, 2, P.leaf[0]);
    S[name] = A(c, 16, 22);
  }
  {
    const c = new Canvas(40, 18);
    for (const [x, y, w, h, i] of [[3, 7, 14, 8, 3], [16, 4, 12, 10, 4], [26, 8, 11, 7, 2]]) { topBox(c, x, y - 2, w, 3, st, i + 2, 201 + x); faceBox(c, x, y + 1, w, h - 2, st, i, 202 + x); }
    c.set(12, 3, st[6]);
    mossAlong(c, P, 3, 36, 15, 3, 203);
    c.outline();
    S.rubble_a = A(c, 20, 16, [30, 10]);
  }
  {
    const c = new Canvas(30, 12);
    for (const [x, y, w, h, i] of [[2, 4, 8, 5, 3], [11, 2, 9, 7, 4], [21, 5, 6, 4, 2]]) { topBox(c, x, y, w, 2, st, i + 2, 211 + x); faceBox(c, x, y + 2, w, h - 2, st, i, 212 + x); }
    c.outline();
    S.rubble_b = A(c, 15, 11);
  }
  for (const [name, seed] of [['vine_a', 221], ['vine_b', 222]]) {
    const c = new Canvas(28, 64);
    const rng = new Rng(seed);
    for (let s = 0; s < 4; s++) {
      const x0 = 5 + s * 6 + Math.floor(rng.range(-1, 2)), len = 24 + Math.floor(rng.range(0, 34));
      for (let y = 0; y < len; y++) {
        const x = x0 + Math.round(Math.sin(y * 0.25 + s) * 1.2);
        c.set(x, 63 - 63 + y, P.leaf[y < len - 6 ? 1 : 2]);
        if (y % 6 === 3) { c.set(x - 1, y, P.leaf[3]); c.set(x + 1, y + 1, P.leaf[3]); c.set(x + 1, y, P.leaf[2]); }
      }
      c.set(x0, len, P.leaf[4]);
    }
    c.outline(P.leaf[0]);
    S[name] = A(c, 14, 63);
  }

  // ---- serpihan batu yang berhenti di udara ----
  for (const [name, seed] of [['chips_a', 231], ['chips_b', 232]]) {
    const c = new Canvas(48, 52);
    // bayangan di tanah (dither papan catur)
    for (let y = 42; y < 48; y++) for (let x = 6; x < 42; x++) { const d = ((x - 24) / 16) ** 2 + ((y - 45) / 2.2) ** 2; if (d < 1 && (x + y) % 2 === 0) c.set(x, y, P.floor[1]); }
    const rng = new Rng(seed);
    for (let i = 0; i < 5; i++) {
      const x = 8 + i * 7 + Math.floor(rng.range(-2, 3)), y = 8 + Math.floor((i * 37 + seed) % 22) * 1 + (i % 2) * 6;
      const w = 4 + Math.floor(rng.range(0, 4)), h = 3 + Math.floor(rng.range(0, 3));
      c.poly([[x, y + 1], [x + w * 0.5, y], [x + w, y + 1], [x + w - 1, y + h], [x + 1, y + h]], (px, py) => at(st, py <= y + 1 || px <= x + 1 ? 5 : px >= x + w - 2 ? 3 : 4));
      c.set(x + w - 1, y + h, st[2]);
    }
    c.outline();
    S[name] = A(c, 24, 46);
  }

  // ---- penjaga bersumpah (patroli) ----
  for (const f of ['a', 'b']) {
    const c = new Canvas(36, 56);
    const bob = f === 'a' ? 0 : 1, sw = f === 'a' ? 0 : 1;
    // jubah merah di belakang
    c.poly([[10, 22 + bob], [26, 22 + bob], [29 + sw, 50], [7 + sw, 50]], (x, y) => at(P.red, y < 30 ? 2 : x < 16 ? 2 : 1));
    c.line(14, 30 + bob, 12 + sw, 49, P.red[3]);
    // kaki dan sabuk
    c.rect(13, 44, 4, 7, P.steel[1]); c.rect(19, 44, 4, 7, P.steel[1]); c.rect(12, 50, 6, 2, P.steel[0]); c.rect(19, 50, 6, 2, P.steel[0]);
    // badan berzirah
    c.rect(11, 24 + bob, 14, 20, P.steel[2]); c.rect(11, 24 + bob, 4, 20, P.steel[3]); c.rect(22, 24 + bob, 3, 20, P.steel[1]);
    c.rect(11, 38 + bob, 14, 2, P.bronze[2]); c.set(18, 39 + bob, P.bronze[4]);
    c.ellipse(9, 26 + bob, 4, 3, P.steel[3]); c.ellipse(27, 26 + bob, 4, 3, P.steel[2]);
    // helm
    c.ellipse(18, 17 + bob, 6, 7, P.steel[2]); c.ellipse(17, 15 + bob, 4, 5, P.steel[3]); c.rect(15, 18 + bob, 7, 2, P.steel[0]);
    c.rect(18, 6 + bob, 2, 5, P.red[3]); c.rect(18, 4 + bob, 2, 3, P.red[2]);
    // perisai dan tombak
    c.poly([[3, 28 + bob], [11, 26 + bob], [11, 42 + bob], [7, 47 + bob], [3, 42 + bob]], (x) => at(P.steel, x < 6 ? 3 : 2));
    ringPx(c, 7, 36 + bob, 2, P.gold[2]);
    c.rect(30, 8 + bob, 2, 42, P.wood[2]); c.poly([[29, 8 + bob], [33, 8 + bob], [31, 1 + bob]], P.steel[4]);
    c.outline();
    S['oathguard_' + f] = A(c, 18, 52);
  }
  // ---- Wisplet: bola arkana ungu berpita perunggu ----
  for (const [f, dy] of [['a', 0], ['b', -2], ['c', -1]]) {
    const c = new Canvas(26, 30);
    for (let y = 25; y < 29; y++) for (let x = 7; x < 19; x++) { const d = ((x - 13) / 6) ** 2 + ((y - 27) / 2) ** 2; if (d < 1 && (x + y) % 2 === 0) c.set(x, y, P.floor[1]); }
    const cy = 14 + dy;
    c.ellipse(13, cy, 7, 7, P.violet[1]); c.ellipse(13, cy, 6, 6, P.violet[2]); c.ellipse(12, cy - 1, 4, 4, P.violet[3]); c.ellipse(11, cy - 2, 2, 2, P.violet[4]);
    for (let x = 6; x <= 20; x++) { const t = (x - 13) / 7, y = Math.round(cy + 1 + Math.sqrt(Math.max(0, 1 - t * t)) * 2); c.set(x, y, P.bronze[3]); c.set(x, y + 1, P.bronze[1]); }
    c.set(13, cy - 8, P.violet[3]); c.set(14, cy - 9, P.violet[2]);
    c.outline(P.violet[0]);
    S['wisplet_' + f] = A(c, 13, 26);
  }
  return S;
}
