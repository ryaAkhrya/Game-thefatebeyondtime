// Palet dan sprite Warden Fortress (DRAFT, dilukis kode). Benteng penjaga waktu tua: batu basalt biru-abu berblok besar, lantai
// coklat-plum hangat, besi/perunggu berkarat dan kain merah tua, Deep Plum untuk retakan, Bitter Lime HANYA untuk retakan temporal
// dan segel yang menyala. Palet TERTUTUP 24 warna (berbeda dari Kuil Jejak). Cahaya dari kiri-atas, garis tepi 1 px selektif, tanpa
// blur/bloom/gradien halus. Simbol waktu secukupnya: lingkaran dengan satu garis patah (lambang pusaka/Heart), segel matahari.
import { Canvas, clamp, hash, ramp, shade } from './pixelkit.mjs';

export function fortressPalette() {
  return {
    stone: ramp('f.stone', ['#12101a', '#221e2e', '#373749', '#4f5266', '#6d7189', '#9296ac']),
    floor: ramp('f.floor', ['#2d2530', '#463a40', '#64554f', '#8a7867']),
    plum: ramp('f.plum', ['#3c2a44', '#5e4468']),
    metal: ramp('f.metal', ['#3f1d20', '#78322a', '#b0602f', '#d9a85a']),
    flame: ramp('f.flame', ['#e8602a', '#f6c35a', '#fcefb8']),
    lime: ramp('f.lime', ['#3b4a1c', '#8fae3a', '#cfe86a']),
    sky: ramp('f.sky', ['#3a6470', '#a9bcc0']),
  };
}

export const at = (R, i) => R[clamp(Math.round(i), 0, R.length - 1)];
export const A = (c, ax, ay, foot) => ({ c, anchorX: ax, anchorY: ay, foot });
const erase = (c, x, y) => { if (x >= 0 && y >= 0 && x < c.w && y < c.h) c.d[(y * c.w + x) * 4 + 3] = 0; };

// ---------------------------------------------------------------- primitif
/** Muka depan balok: tepi kiri/atas terang, kanan/bawah gelap. */
export function faceBox(c, x, y, w, h, R, base) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let idx = base;
    if (i < 2) idx += 1; else if (i >= w - 2) idx -= 1;
    if (j === 0) idx += 1; else if (j === h - 1) idx -= 1;
    c.set(x + i, y + j, at(R, idx));
  }
}
export function topBox(c, x, y, w, h, R, base) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) c.set(x + i, y + j, at(R, base + (j === 0 ? 1 : 0) + (i < 2 ? 1 : 0)));
}
/** Tiang persegi: muka kiri terang, tengah, kanan gelap; sambungan blok tiap `every` baris. */
export function pillarSq(c, x, y0, y1, w, R, base, every = 14) {
  for (let y = y0; y <= y1; y++) for (let i = 0; i < w; i++) {
    const u = i / (w - 1);
    let idx = u < 0.14 ? base + 2 : u < 0.5 ? base + 1 : u < 0.8 ? base : base - 1;
    if ((y - y0) % every === every - 1) idx -= 1;
    else if ((y - y0) % every === 0 && y > y0) idx += 1;
    c.set(x + i, y, at(R, idx));
  }
}
export function ringPx(c, cx, cy, r, color, ry = r) {
  const n = Math.max(24, Math.round(Math.max(r, ry) * 8));
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; c.set(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * ry), color); }
}
export function lineC(c, pts, col) { for (let i = 0; i + 1 < pts.length; i++) c.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col); }
/** Tiga lapis nyala berbentuk padat (tanpa pendar). */
export function flameShape(c, P, cx, by, h, f) {
  const s = f ? 1 : 0, hw = Math.max(3, Math.round(h * 0.32));
  c.poly([[cx - hw, by], [cx - hw + 1, by - h * 0.5], [cx - 1 + s, by - h * 0.8], [cx + s, by - h], [cx + 2 - s, by - h * 0.7], [cx + hw - 1, by - h * 0.45], [cx + hw, by]], P.flame[0]);
  const hw2 = Math.max(2, hw - 2);
  c.poly([[cx - hw2, by], [cx - hw2 + 1, by - h * 0.45], [cx + s, by - h * 0.72], [cx + hw2 - 1, by - h * 0.4], [cx + hw2, by]], P.flame[1]);
  c.poly([[cx - 1, by], [cx - 1, by - h * 0.3], [cx + s, by - h * 0.46], [cx + 1, by - h * 0.28], [cx + 1, by]], P.flame[2]);
}
/** Lambang matahari (segel jaga). kind: dawn | noon | dusk | night. Kotak sekitar 15x15 di sekitar (cx,cy). */
export function sunGlyph(c, cx, cy, kind, col, dark) {
  const px = (dx, dy, k = col) => c.set(cx + dx, cy + dy, k);
  const disc = (r, up) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 1 && (up === 0 || (up < 0 ? y <= 0 : y >= 0))) px(x, y); };
  const ray = (a, b) => { c.line(cx + a[0], cy + a[1], cx + b[0], cy + b[1], col); };
  if (kind === 'dawn') {
    for (let x = -7; x <= 7; x++) px(x, 2); disc(4, -1);
    ray([0, -6], [0, -8]); ray([-4, -5], [-6, -7]); ray([4, -5], [6, -7]); ray([-6, -2], [-8, -3]); ray([6, -2], [8, -3]);
    if (dark) for (let x = -7; x <= 7; x++) px(x, 3, dark);
  } else if (kind === 'noon') {
    disc(3, 0);
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) ray([dx * 5, dy * 5], [dx * 7, dy * 7]);
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) ray([dx * 4, dy * 4], [dx * 6, dy * 6]);
  } else if (kind === 'dusk') {
    // garis di atas, setengah matahari tenggelam DI BAWAH garis, sinar menunjuk ke bawah
    disc(4, 1);
    for (let x = -7; x <= 7; x++) px(x, -1);
    ray([0, 6], [0, 8]); ray([-4, 5], [-6, 7]); ray([4, 5], [6, 7]); ray([-6, 2], [-8, 3]); ray([6, 2], [8, 3]);
  } else {
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) if (x * x + y * y <= 26 && (x - 2) * (x - 2) + (y + 1) * (y + 1) > 18) px(x, y);
    px(5, -5); px(6, -5); px(5, -6);
  }
}

// ---------------------------------------------------------------- bangun sprite
export function buildFortress(P) {
  const S = {};
  const st = P.stone, fl = P.floor, mt = P.metal, pl = P.plum, lm = P.lime, fi = P.flame, sk = P.sky;
  const emblem = (c, cx, cy, r, ring, line, gap = true) => {
    ringPx(c, cx, cy, r, ring); ringPx(c, cx, cy, r - 1, ring);
    // satu garis patah melintang dari kiri-bawah ke kanan-atas; celah di tengah bila `gap`
    for (let t = -r; t <= r; t++) {
      if (gap && Math.abs(t) <= 1) continue;
      c.set(cx + t, cy + Math.round(t * 0.5) , line);
    }
  };

  // ---- tiang persegi ----
  function column(kind) {
    const c = new Canvas(30, 84);
    faceBox(c, 3, 74, 24, 8, st, 3); topBox(c, 3, 71, 24, 3, st, 4);
    const top = kind === 'broken' ? 44 : 16;
    pillarSq(c, 6, top, 71, 18, st, 3, 14);
    if (kind === 'broken') {
      const prof = [0, 2, 1, 4, 3, 6, 4, 3, 5, 2, 3, 1, 2, 0, 1, 3, 2, 0];
      for (let i = 0; i < 18; i++) { for (let y = top; y < top + prof[i]; y++) erase(c, 6 + i, y); }
      for (let i = 2; i < 12; i++) c.set(6 + i, top + prof[i], st[5]);
      for (const [dx, dy, w] of [[-1, 76, 5], [24, 77, 6], [20, 79, 4]]) { topBox(c, dx + 3, dy - 2, w, 2, st, 4); faceBox(c, dx + 3, dy, w, 3, st, 2); }
      lineC(c, [[12, top + 8], [14, top + 16], [13, top + 24]], st[0]);
    } else {
      topBox(c, 3, 8, 24, 3, st, 5); faceBox(c, 3, 11, 24, 6, st, 3); c.line(5, 14, 24, 14, st[1]);
      lineC(c, [[19, 30], [17, 36], [19, 44]], st[1]);
    }
    c.outline();
    return A(c, 15, 82);
  }
  S.column = column('whole');
  S.column_broken = column('broken');

  // ---- patung penjaga ----
  function warden(broken) {
    const c = new Canvas(40, 94);
    faceBox(c, 5, 82, 30, 10, st, 3); topBox(c, 5, 79, 30, 3, st, 4);
    c.poly([[13, 56], [27, 56], [31, 79], [9, 79]], (x) => at(st, x < 17 ? 4 : x < 24 ? 3 : 2));
    for (let y = 60; y < 78; y += 6) c.line(11, y, 29, y, st[2]);
    c.rect(11, 32, 18, 24, st[3]); c.rect(11, 32, 3, 24, st[4]); c.rect(26, 32, 3, 24, st[2]);
    c.rect(11, 44, 18, 2, st[2]); c.rect(11, 43, 18, 1, st[5]);
    c.ellipse(10, 35, 5, 4, st[4]); c.ellipse(9, 34, 3, 2, st[5]);
    if (!broken) {
      c.ellipse(30, 35, 5, 4, st[3]);
      c.rect(25, 40, 2, 38, st[5]); c.rect(27, 40, 1, 38, st[2]); c.rect(22, 48, 8, 2, st[4]); c.rect(25, 38, 2, 2, st[4]);
    } else {
      c.rect(27, 34, 4, 8, st[2]); lineC(c, [[27, 42], [30, 44], [28, 46]], st[0]);
    }
    c.poly([[3, 40], [13, 40], [13, 60], [8, 68], [3, 60]], (x) => at(st, x < 7 ? 5 : x < 11 ? 4 : 3));
    emblem(c, 8, 52, 3, st[1], st[1]);
    if (!broken) {
      c.ellipse(20, 23, 7, 9, st[4]); c.ellipse(19, 22, 5, 7, st[5]); c.ellipse(23, 26, 4, 5, st[3]);
      c.rect(15, 24, 10, 2, st[0]); c.rect(19, 12, 2, 6, st[3]); c.rect(19, 10, 2, 2, st[5]);
    } else {
      c.rect(16, 28, 8, 5, st[3]); c.rect(16, 28, 3, 5, st[4]);
      c.ellipse(32, 78, 5, 4, st[3]); c.ellipse(31, 77, 3, 2, st[4]); c.rect(30, 78, 4, 1, st[0]);
    }
    lineC(c, [[22, 36], [21, 44], [23, 52]], st[1]);
    c.outline();
    return A(c, 20, 90);
  }
  S.statue_warden = warden(false);
  S.statue_broken = warden(true);

  // ---- tiang gerbang besar berpita besi ----
  {
    const c = new Canvas(38, 110);
    topBox(c, 1, 6, 36, 4, st, 5); faceBox(c, 2, 10, 34, 94, st, 3);
    for (let y = 22; y < 100; y += 22) { c.line(3, y, 33, y, st[2]); c.line(3, y + 1, 33, y + 1, st[1]); }
    for (const y of [30, 58, 86]) {
      c.rect(2, y, 34, 6, mt[1]); c.rect(2, y, 34, 1, mt[3]); c.rect(2, y + 5, 34, 1, mt[0]);
      for (const x of [6, 18, 30]) { c.set(x, y + 2, mt[3]); c.set(x, y + 3, mt[0]); }
    }
    c.rect(0, 100, 38, 8, st[3]); c.rect(0, 100, 38, 1, st[5]); c.rect(0, 107, 38, 1, st[1]);
    lineC(c, [[9, 44], [11, 52], [9, 58]], st[0]);
    c.outline();
    S.gate_post = A(c, 19, 106);
  }

  // ---- perapian besi (dingin / 2 frame nyala) ----
  for (const kind of ['cold', 'a', 'b']) {
    const c = new Canvas(30, 48);
    lineC(c, [[6, 26], [4, 44]], mt[1]); lineC(c, [[22, 26], [24, 44]], mt[0]); lineC(c, [[14, 28], [14, 45]], mt[1]);
    c.ellipse(14, 45, 9, 2, st[2]);
    c.ellipse(14, 24, 12, 6, mt[1]); c.ellipse(14, 22, 12, 6, mt[2]); c.ellipse(14, 21, 10, 4.5, st[0]);
    c.rect(2, 22, 26, 2, mt[1]); c.rect(3, 21, 8, 1, mt[3]);
    if (kind === 'cold') { for (const [x, y] of [[9, 21], [13, 22], [18, 21]]) { c.set(x, y, st[2]); c.set(x + 1, y, st[3]); } }
    else flameShape(c, P, 14, 21, 17, kind === 'b');
    c.outline(mt[0]);
    S[kind === 'cold' ? 'brazier_cold' : 'brazier_' + kind] = A(c, 14, 46);
  }

  // ---- obor dinding (2 frame) ----
  for (const f of [false, true]) {
    const c = new Canvas(16, 36);
    c.rect(7, 20, 2, 12, mt[1]); c.rect(7, 20, 1, 12, mt[2]);
    c.rect(4, 18, 8, 3, mt[2]); c.rect(4, 18, 8, 1, mt[3]); c.rect(5, 31, 6, 2, mt[1]);
    flameShape(c, P, 8, 18, 14, f);
    c.outline(mt[0]);
    S[f ? 'torch_b' : 'torch_a'] = A(c, 8, 34);
  }

  // ---- panji ----
  for (const torn of [false, true]) {
    const c = new Canvas(32, 60);
    c.rect(2, 2, 28, 3, mt[2]); c.rect(2, 2, 28, 1, mt[3]); c.rect(0, 1, 3, 5, mt[3]); c.rect(29, 1, 3, 5, mt[3]);
    const bot = torn ? 44 : 52;
    const pts = torn ? [[5, 5], [27, 5], [27, 38], [24, 42], [20, 36], [17, bot], [12, 40], [8, 46], [5, 38]] : [[5, 5], [27, 5], [27, 48], [16, bot + 4], [5, 48]];
    c.poly(pts, (x) => at(mt, x < 9 ? 2 : x < 20 ? 1 : 0));
    if (!torn) for (let y = 8; y < 46; y += 7) c.line(7, y, 25, y, mt[0]);
    emblem(c, 16, 22, 5, mt[3], mt[3]);
    c.outline(mt[0]);
    S[torn ? 'banner_b' : 'banner_a'] = A(c, 16, torn ? 49 : 58);
  }

  // ---- lonceng raksasa berhenti di tengah ayunan (rangka batu dan balok besi) ----
  {
    const c = new Canvas(164, 172);
    // dua tiang
    for (const x of [8, 130]) { topBox(c, x - 2, 36, 30, 4, st, 5); pillarSq(c, x, 40, 154, 26, st, 3, 18); }
    // dais batu menerus di bawah lonceng (rangka berdiri di atasnya)
    topBox(c, 4, 150, 156, 4, st, 4); faceBox(c, 4, 154, 156, 12, st, 3); for (let x = 44; x < 160; x += 40) c.line(x, 155, x, 165, st[1]);
    // balok besi
    c.rect(6, 42, 150, 9, mt[1]); c.rect(6, 42, 150, 2, mt[3]); c.rect(6, 49, 150, 2, mt[0]);
    for (let x = 16; x < 150; x += 20) { c.set(x, 46, mt[3]); c.set(x, 47, mt[0]); }
    // lonceng miring (diputar sekitar titik gantung)
    const ox = 82, oy = 51, th = 0.26, cs = Math.cos(th), sn = Math.sin(th);
    const rot = ([x, y]) => [ox + x * cs - y * sn, oy + x * sn + y * cs];
    const half = [[0, 6], [10, 8], [15, 20], [18, 36], [22, 52], [30, 66], [32, 72]];
    const outline = [...half.map(([x, y]) => rot([-x, y])), ...[...half].reverse().map(([x, y]) => rot([x, y]))];
    c.poly(outline, (x, y) => { const u = (x - 52) / 60; return at(mt, u < 0.2 ? 3 : u < 0.48 ? 2 : u < 0.75 ? 1 : 0); });
    // bibir dan lubang
    const lip = [-32, 32].map((x) => rot([x, 72]));
    c.ellipse((lip[0][0] + lip[1][0]) / 2, (lip[0][1] + lip[1][1]) / 2 + 1, 31, 5.5, mt[0]);
    c.ellipse((lip[0][0] + lip[1][0]) / 2, (lip[0][1] + lip[1][1]) / 2, 28, 4, st[0]);
    c.line(Math.round(rot([-22, 52])[0]), Math.round(rot([-22, 52])[1]), Math.round(rot([-30, 66])[0]), Math.round(rot([-30, 66])[1]), mt[3]);
    // lidah lonceng membeku di jarak sejengkal dari dinding perunggu
    const cl = rot([-6, 74]);
    c.rect(Math.round(cl[0]) - 2, Math.round(cl[1]), 5, 7, st[2]); c.rect(Math.round(cl[0]) - 2, Math.round(cl[1]), 2, 7, st[4]);
    // mahkota dan rantai
    c.rect(ox - 5, oy - 4, 10, 9, mt[2]); c.rect(ox - 5, oy - 4, 10, 1, mt[3]);
    // retak dari bibir ke mahkota (lime redup: retakan temporal)
    const cr = [rot([10, 70]), rot([7, 58]), rot([11, 46]), rot([6, 34]), rot([9, 22])].map(([x, y]) => [Math.round(x), Math.round(y)]);
    lineC(c, cr, mt[0]);
    for (let i = 1; i < cr.length - 1; i += 2) c.set(cr[i][0] - 1, cr[i][1], lm[0]);
    // serpihan yang berhenti di udara
    for (const [x, y, w] of [[66, 126, 3], [110, 134, 2], [124, 110, 2], [34, 118, 2]]) { c.rect(x, y, w, 2, st[4]); c.rect(x, y + 2, w, 1, st[1]); }
    c.outline();
    S.bell_frame = A(c, 82, 166);
  }

  // ---- pilar segel jaga (4 lambang x mati/menyala) ----
  for (const kind of ['dawn', 'noon', 'dusk', 'night'])
    for (const on of [false, true]) {
      const c = new Canvas(30, 80);
      faceBox(c, 2, 68, 26, 10, st, 3); topBox(c, 2, 65, 26, 3, st, 4);
      pillarSq(c, 5, 26, 65, 20, st, 3, 20);
      c.rect(7, 30, 16, 30, st[1]); c.rect(8, 31, 14, 28, on ? pl[0] : st[2]);
      c.line(8, 59, 21, 59, st[4]);
      sunGlyph(c, 15, 45, kind, on ? lm[2] : st[4], on ? lm[0] : st[1]);
      // atas: rumah lampu
      topBox(c, 4, 12, 22, 3, st, 5); faceBox(c, 5, 15, 20, 11, mt, 1);
      c.rect(9, 17, 12, 7, st[0]);
      if (on) { c.rect(10, 18, 10, 5, lm[1]); c.rect(11, 18, 6, 2, lm[2]); c.set(24, 12, lm[2]); c.set(5, 12, lm[2]); }
      else { c.rect(10, 18, 10, 5, st[1]); c.rect(10, 18, 4, 1, st[3]); }
      c.outline();
      S[`seal_${kind}_${on ? 'on' : 'off'}`] = A(c, 15, 76);
    }

  // ---- pintu besi di dinding utara (tertutup / terbuka) ----
  for (const open of [false, true]) {
    const c = new Canvas(100, 84);
    // bingkai lengkung batu
    c.poly([[2, 82], [2, 22], [12, 8], [88, 8], [98, 22], [98, 82]], (x, y) => at(st, x < 14 ? 4 : x > 86 ? 2 : y < 14 ? 4 : 3));
    // celah pintu
    const inner = [[14, 82], [14, 28], [22, 16], [78, 16], [86, 28], [86, 82]];
    if (!open) {
      c.poly(inner, (x) => at(fl, x < 28 ? 2 : x < 70 ? 1 : 0));
      for (let x = 16; x < 85; x += 14) c.line(x, 18, x, 82, fl[0]);
      for (const y of [30, 52, 72]) { c.rect(14, y, 72, 4, mt[1]); c.rect(14, y, 72, 1, mt[3]); c.rect(14, y + 3, 72, 1, mt[0]); for (const x of [20, 34, 66, 80]) c.set(x, y + 1, mt[3]); }
      c.line(50, 18, 50, 82, st[0]);
      c.ellipse(44, 52, 3, 3, mt[3]); c.ellipse(56, 52, 3, 3, mt[3]); c.ellipse(44, 52, 1.5, 1.5, st[0]); c.ellipse(56, 52, 1.5, 1.5, st[0]);
      emblem(c, 50, 38, 4, mt[3], mt[3]);
    } else {
      c.poly(inner, st[0]);
      for (let i = 0; i < 5; i++) c.rect(22 + i * 2, 70 + i * 3, 56 - i * 4, 3, at(st, 1 + (i % 2)));
      c.poly([[14, 82], [14, 28], [22, 16], [24, 16], [24, 82]], (x) => at(fl, x < 18 ? 2 : 1));
      c.poly([[86, 82], [86, 28], [78, 16], [76, 16], [76, 82]], (x) => at(fl, 0));
      c.rect(14, 40, 10, 3, mt[1]); c.rect(14, 64, 10, 3, mt[1]); c.rect(76, 40, 10, 3, mt[0]); c.rect(76, 64, 10, 3, mt[0]);
    }
    c.rect(2, 8, 96, 2, st[5]); c.rect(2, 80, 96, 2, st[1]);
    c.outline();
    S[open ? 'door_iron_open' : 'door_iron_closed'] = A(c, 50, 82);
  }

  // ---- pintu Heart (tertutup/setengah/terbuka) ----
  for (const state of ['closed', 'half', 'open']) {
    const c = new Canvas(116, 100);
    c.poly([[2, 98], [2, 26], [16, 8], [100, 8], [114, 26], [114, 98]], (x, y) => at(st, x < 16 ? 4 : x > 100 ? 2 : y < 16 ? 4 : 3));
    const inner = [[16, 98], [16, 32], [26, 18], [90, 18], [100, 32], [100, 98]];
    c.poly(inner, state === 'closed' ? fl[1] : st[0]);
    if (state === 'closed') {
      c.rect(16, 18, 42, 80, fl[1]); c.rect(58, 18, 42, 80, fl[0]);
      c.poly([[16, 98], [16, 32], [26, 18], [58, 18], [58, 98]], (x) => at(fl, x < 24 ? 2 : 1));
      c.poly([[100, 98], [100, 32], [90, 18], [58, 18], [58, 98]], (x) => at(fl, x > 92 ? 0 : 1));
      c.line(58, 18, 58, 98, st[0]);
      for (const y of [34, 60, 84]) { c.rect(16, y, 84, 4, mt[1]); c.rect(16, y, 84, 1, mt[3]); }
      emblem(c, 58, 52, 11, mt[3], mt[3]);
      // rantai segel bersilang dengan gembok lime
      lineC(c, [[18, 30], [98, 82]], mt[2]); lineC(c, [[98, 30], [18, 82]], mt[2]);
      for (let t = 0; t < 12; t++) { c.set(22 + t * 6, 32 + Math.round(t * 4.3), mt[3]); c.set(94 - t * 6, 32 + Math.round(t * 4.3), mt[3]); }
      c.rect(54, 54, 8, 8, lm[0]); c.rect(55, 55, 6, 6, lm[1]); c.rect(57, 57, 2, 3, st[0]);
    } else if (state === 'half') {
      c.rect(16, 18, 10, 80, fl[2]); c.rect(90, 18, 10, 80, fl[0]);
      for (let i = 0; i < 6; i++) c.rect(32 + i * 3, 82 + i * 3 - 3, 52 - i * 6, 3, at(st, 1 + (i % 2)));
      c.rect(26, 40, 6, 3, mt[1]);
    } else {
      for (let i = 0; i < 6; i++) c.rect(26 + i * 2, 82 + i * 2, 64 - i * 4, 3, at(st, 1 + (i % 2)));
      c.rect(16, 18, 8, 80, fl[2]); c.rect(92, 18, 8, 80, fl[0]);
      for (let x = 40; x < 78; x += 6) c.set(x, 30 + ((x / 6) % 3) * 4, pl[1]);
    }
    c.rect(2, 8, 112, 2, st[5]);
    c.outline();
    S['door_heart_' + state] = A(c, 58, 96);
  }

  // ---- gerbang besi samping (dilihat dari sisi: tiang tipis berjeruji) ----
  for (const open of [false, true]) {
    const c = new Canvas(26, 100);
    if (!open) {
      pillarSq(c, 8, 8, 94, 10, st, 3, 20);
      for (let y = 20; y < 92; y += 10) { c.rect(2, y, 22, 3, mt[1]); c.rect(2, y, 22, 1, mt[3]); c.rect(2, y + 2, 22, 1, mt[0]); }
      c.rect(6, 4, 14, 6, st[4]); c.rect(6, 4, 14, 1, st[5]);
      c.rect(11, 52, 4, 4, mt[3]);
    } else {
      pillarSq(c, 8, 8, 94, 10, st, 3, 20); c.rect(6, 4, 14, 6, st[4]); c.rect(6, 4, 14, 1, st[5]);
      c.rect(2, 8, 4, 3, mt[1]); c.rect(20, 8, 4, 3, mt[0]);
    }
    c.rect(4, 94, 18, 4, st[3]); c.rect(4, 94, 18, 1, st[5]);
    c.outline();
    S[open ? 'gate_side_open' : 'gate_side_closed'] = A(c, 13, 98);
  }

  // ---- penutup retakan Ruang Gema (batu menyatu dengan celah plum) ----
  for (const open of [false, true]) {
    const c = new Canvas(26, 100);
    if (!open) {
      pillarSq(c, 3, 10, 94, 20, st, 2, 16);
      lineC(c, [[12, 12], [16, 30], [10, 48], [17, 66], [11, 92]], pl[0]);
      lineC(c, [[13, 12], [17, 30], [11, 48], [18, 66], [12, 92]], lm[0]);
      for (const [x, y] of [[15, 34], [10, 56], [16, 74]]) c.set(x, y, lm[1]);
    } else {
      for (const [x, y, w, h] of [[2, 84, 8, 10], [14, 88, 8, 6], [8, 90, 6, 4], [3, 70, 6, 6], [18, 76, 5, 5]]) { topBox(c, x, y, w, 2, st, 4); faceBox(c, x, y + 2, w, h - 2, st, 2); }
      lineC(c, [[12, 94], [16, 90]], lm[0]);
    }
    c.outline();
    S[open ? 'echo_seal_open' : 'echo_seal_closed'] = A(c, 13, 98);
  }

  // ---- jeruji gerbang luar yang tersangkut + lintel berjam logam ----
  {
    const c = new Canvas(132, 68);
    topBox(c, 0, 0, 132, 4, st, 5); faceBox(c, 0, 4, 132, 18, st, 3);
    for (let x = 22; x < 132; x += 44) c.line(x, 4, x, 21, st[1]);
    // jam logam di tengah: cakram perunggu dengan satu jarum (tanpa roda gigi)
    c.ellipse(66, 12, 11, 10, mt[1]); c.ellipse(66, 11, 10, 9, mt[3]); c.ellipse(66, 12, 8, 7, st[1]); c.ellipse(65, 11, 7, 6, st[4]);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; c.set(Math.round(66 + Math.cos(a) * 6.5), Math.round(12 + Math.sin(a) * 5.8), st[1]); }
    c.line(66, 12, 66, 6, st[0]); c.line(66, 12, 70, 14, st[0]);
    // jeruji yang tergantung setengah
    c.rect(6, 22, 120, 4, mt[1]); c.rect(6, 22, 120, 1, mt[3]);
    for (let x = 10; x < 124; x += 11) {
      const len = 22 + ((x / 11) % 3) * 4;
      c.rect(x, 26, 3, len, mt[1]); c.rect(x, 26, 1, len, mt[2]); c.set(x + 1, 26 + len, mt[0]); c.set(x + 1, 27 + len, mt[0]);
    }
    c.rect(2, 4, 4, 30, mt[1]); c.rect(126, 4, 4, 30, mt[0]);
    c.outline();
    S.portcullis = A(c, 66, 66);
  }

  // ---- potongan lorong retakan: sejajar (rata) / bergeser (menutup jalan) ----
  {
    const c = new Canvas(192, 56);
    // sejajar: lantai rata dengan garis sambungan menyala redup (bukan penghalang)
    const f = new Canvas(192, 56);
    for (let y = 30; y < 54; y++) for (let x = 0; x < 192; x++) {
      const row = Math.floor((y - 30) / 12), sx = Math.floor((x + row * 24) / 48), lx = (x + row * 24) % 48, ly = (y - 30) % 12;
      let idx = 2 + (hash(sx, row, 61) < 0.25 ? -1 : 0);
      if (lx === 47 || ly === 11) idx = 0; else if (lx === 0 || ly === 0) idx = 3;
      f.set(x, y, at(fl, idx));
    }
    for (let x = 0; x < 192; x++) { f.set(x, 36 + ((x >> 4) % 2), lm[0]); }
    for (let x = 6; x < 192; x += 22) { f.set(x, 36, lm[1]); f.set(x + 1, 36, lm[1]); }
    S.slab_aligned = A(f, 96, 54);
    // bergeser: balok batu terangkat dan terseret ke kanan, celah gelap di kiri
    c.rect(0, 28, 192, 26, st[0]);
    topBox(c, 18, 10, 168, 6, st, 5); faceBox(c, 18, 16, 168, 26, st, 3);
    for (let x = 40; x < 186; x += 44) c.line(x, 16, x, 41, st[1]);
    c.line(20, 28, 184, 28, st[2]);
    for (let x = 0; x < 192; x += 8) { c.rect(x, 44, 6, 2, st[1]); }
    lineC(c, [[2, 46], [20, 50], [10, 54]], pl[1]);
    for (let x = 4; x < 16; x += 4) { c.set(x, 44, lm[1]); }
    for (const [x, y, w] of [[2, 34, 14], [172, 44, 18]]) { topBox(c, x, y, w, 2, st, 4); faceBox(c, x, y + 2, w, 6, st, 2); }
    c.rect(18, 42, 168, 2, st[0]);
    c.outline();
    S.slab_shifted = A(c, 96, 54);
  }

  // ---- jangkar waktu (2 jangkar x 2 keadaan); bintik = potongan yang digerakkan ----
  for (const [kind, hits] of [['a', [1, 1, 0]], ['b', [0, 1, 1]]])
    for (const on of [false, true]) {
      const c = new Canvas(36, 60);
      faceBox(c, 3, 50, 30, 8, st, 3); topBox(c, 3, 47, 30, 3, st, 4);
      pillarSq(c, 8, 20, 47, 20, st, 3, 14);
      topBox(c, 5, 12, 26, 4, st, 5); faceBox(c, 5, 16, 26, 4, st, 3);
      // cincin penjangkar di atas
      c.ellipse(18, 9, 9, 5, st[2]); c.ellipse(18, 8, 9, 4, on ? lm[1] : st[4]); c.ellipse(18, 8, 6, 2.5, on ? lm[0] : st[1]);
      // tiga takik (S1..S3 dari bawah ke atas): terang bila dipengaruhi jangkar ini
      for (let i = 0; i < 3; i++) {
        const y = 40 - i * 8;
        c.rect(14, y, 8, 4, st[1]);
        if (hits[i]) { c.rect(15, y + 1, 6, 2, on ? lm[2] : lm[1]); }
        else c.rect(15, y + 1, 6, 2, st[2]);
      }
      c.outline();
      S[`anchor_${kind}_${on ? 1 : 0}`] = A(c, 18, 58);
    }

  // ---- tuas ----
  for (const on of [false, true]) {
    const c = new Canvas(28, 48);
    faceBox(c, 3, 36, 22, 8, st, 3); topBox(c, 3, 33, 22, 3, st, 4);
    c.rect(9, 30, 10, 4, mt[1]); c.rect(9, 30, 10, 1, mt[3]);
    c.line(14, 31, on ? 24 : 4, 8, mt[2]); c.line(15, 31, on ? 25 : 5, 8, mt[1]);
    c.ellipse(on ? 25 : 4, 7, 3, 3, mt[3]); c.ellipse(on ? 25 : 4, 7, 1, 1, mt[0]);
    c.outline();
    S[on ? 'lever_on' : 'lever_off'] = A(c, 14, 44);
  }

  // ---- lentera jaga (titik simpan) ----
  for (const on of [false, true]) {
    const c = new Canvas(34, 76);
    faceBox(c, 5, 66, 24, 8, st, 3); topBox(c, 5, 63, 24, 3, st, 4);
    c.rect(15, 24, 4, 40, mt[1]); c.rect(15, 24, 1, 40, mt[2]);
    c.rect(8, 22, 18, 3, mt[2]); c.rect(8, 22, 18, 1, mt[3]);
    // kandang lentera
    c.rect(8, 6, 18, 18, st[0]); c.rect(9, 7, 16, 16, on ? fi[0] : st[1]);
    if (on) { flameShape(c, P, 17, 22, 12, true); c.rect(9, 7, 16, 2, fi[1]); }
    else { c.rect(9, 7, 6, 3, st[3]); c.rect(12, 14, 6, 6, st[2]); }
    for (const x of [8, 16, 25]) c.rect(x, 6, 2, 18, mt[1]);
    c.rect(7, 4, 20, 3, mt[2]); c.rect(7, 4, 20, 1, mt[3]); c.rect(15, 0, 4, 4, mt[1]);
    c.outline(mt[0]);
    S[on ? 'lantern_on' : 'lantern_off'] = A(c, 17, 72);
  }

  // ---- pos kurir (tiang dengan papan dan kantong) ----
  {
    const c = new Canvas(44, 68);
    c.rect(20, 18, 5, 46, fl[2]); c.rect(20, 18, 2, 46, fl[3]); c.rect(24, 18, 1, 46, fl[1]);
    faceBox(c, 4, 12, 34, 22, fl, 2);
    for (let y = 14; y < 32; y += 6) c.line(6, y + 4, 36, y + 4, fl[0]);
    // surat tersemat
    c.rect(8, 15, 11, 12, st[5]); c.rect(8, 15, 11, 1, sk[1]); for (let y = 18; y < 26; y += 3) c.line(10, y, 17, y, st[3]);
    c.rect(24, 17, 10, 10, st[4]); c.rect(24, 17, 10, 1, st[5]); for (let y = 20; y < 26; y += 3) c.line(26, y, 32, y, st[2]);
    c.rect(18, 14, 3, 3, mt[3]);
    // kantong kurir menggantung
    c.rect(26, 36, 12, 14, mt[1]); c.rect(26, 36, 12, 2, mt[2]); c.rect(26, 36, 2, 14, mt[2]); c.rect(30, 42, 4, 3, mt[3]);
    c.line(28, 34, 28, 36, mt[0]);
    faceBox(c, 14, 58, 16, 6, st, 3);
    c.outline();
    S.courier_post = A(c, 22, 66);
  }

  // ---- mimbar buku jaga ----
  {
    const c = new Canvas(34, 50);
    c.rect(14, 26, 6, 20, fl[2]); c.rect(14, 26, 2, 20, fl[3]);
    faceBox(c, 8, 42, 18, 6, st, 3);
    c.poly([[3, 14], [31, 14], [29, 28], [5, 28]], (x) => at(fl, x < 12 ? 3 : x < 24 ? 2 : 1));
    // buku terbuka
    c.poly([[6, 12], [17, 14], [17, 24], [7, 22]], st[5]); c.poly([[17, 14], [28, 12], [27, 22], [17, 24]], st[4]);
    c.line(17, 14, 17, 24, st[1]);
    for (let y = 15; y < 22; y += 2) { c.line(8, y, 15, y + 1, st[3]); c.line(19, y + 1, 26, y, st[2]); }
    c.outline();
    S.lectern_log = A(c, 17, 48);
  }

  // ---- rak buku ----
  {
    const c = new Canvas(68, 80);
    faceBox(c, 2, 6, 64, 72, fl, 1);
    for (let r = 0; r < 4; r++) {
      const y = 10 + r * 17;
      c.rect(4, y + 14, 60, 3, fl[2]); c.rect(4, y + 14, 60, 1, fl[3]);
      let x = 6;
      for (let k = 0; x < 62; k++) {
        const w = 3 + Math.floor(hash(r, k, 71) * 4), h = 10 + Math.floor(hash(r, k, 72) * 4);
        const col = [mt[1], pl[0], st[2], mt[0], pl[1], fl[2], lm[0]][Math.floor(hash(r, k, 73) * 7)];
        if (hash(r, k, 74) > 0.12) { c.rect(x, y + 14 - h, w, h, col); c.rect(x, y + 14 - h, 1, h, shade(col, 1)); c.rect(x, y + 14 - h, w, 1, st[1]); }
        x += w + (hash(r, k, 75) > 0.8 ? 3 : 0);
      }
    }
    c.rect(0, 2, 68, 5, fl[3]); c.rect(0, 2, 68, 1, st[5]);
    c.outline();
    S.shelf = A(c, 34, 78);
  }

  // ---- ranjang barak ----
  {
    const c = new Canvas(68, 60);
    c.rect(2, 20, 64, 34, fl[1]); c.rect(2, 20, 64, 2, fl[3]); c.rect(2, 52, 64, 3, fl[0]);
    c.rect(4, 22, 60, 28, pl[0]); c.rect(4, 22, 60, 3, pl[1]); c.rect(4, 22, 3, 28, pl[1]);
    for (let x = 14; x < 62; x += 12) c.line(x, 25, x, 49, st[1]);
    c.rect(5, 23, 14, 12, st[5]); c.rect(5, 23, 14, 1, sk[1]); c.rect(5, 34, 14, 1, st[3]);
    c.rect(2, 12, 4, 44, fl[2]); c.rect(62, 12, 4, 44, fl[0]);
    c.rect(2, 12, 4, 2, fl[3]);
    c.outline();
    S.bunk = A(c, 34, 56);
  }

  // ---- meja panjang ----
  {
    const c = new Canvas(100, 48);
    c.rect(6, 38, 6, 6, fl[1]); c.rect(88, 38, 6, 6, fl[0]); c.rect(6, 38, 2, 6, fl[2]);
    topBox(c, 2, 10, 96, 6, fl, 3); faceBox(c, 2, 16, 96, 24, fl, 2);
    for (let x = 14; x < 96; x += 22) c.line(x, 17, x, 38, fl[0]);
    // dua mangkuk dan sendok
    for (const x of [26, 64]) { c.ellipse(x, 11, 7, 3, st[1]); c.ellipse(x, 10, 6, 2.5, st[4]); c.ellipse(x, 10, 4, 1.5, st[2]); c.set(x - 1, 9, st[5]); }
    c.line(40, 12, 48, 9, st[5]);
    c.outline();
    S.table = A(c, 50, 44);
  }

  // ---- rak senjata ----
  {
    const c = new Canvas(56, 64);
    c.rect(2, 36, 52, 4, fl[2]); c.rect(2, 36, 52, 1, fl[3]); c.rect(2, 52, 52, 4, fl[1]);
    c.rect(2, 8, 4, 54, fl[2]); c.rect(50, 8, 4, 54, fl[0]);
    for (const x of [12, 20, 28]) { c.rect(x, 6, 2, 50, st[5]); c.rect(x + 2, 6, 1, 50, st[2]); c.poly([[x - 1, 6], [x + 3, 6], [x + 1, 0]], st[5]); }
    // perisai bundar
    c.ellipse(42, 46, 8, 8, st[3]); c.ellipse(41, 45, 6, 6, st[4]); c.ellipse(42, 46, 2, 2, mt[3]); ringPx(c, 42, 46, 8, mt[1]);
    c.outline();
    S.weapon_rack = A(c, 28, 60);
  }

  // ---- peti kayu, tong, karung ----
  {
    const c = new Canvas(36, 36);
    faceBox(c, 3, 12, 30, 20, fl, 2); topBox(c, 3, 6, 30, 6, fl, 3);
    c.rect(3, 12, 30, 2, mt[1]); c.rect(3, 12, 30, 1, mt[3]);
    c.line(18, 12, 18, 31, fl[0]);
    c.outline();
    S.crate = A(c, 18, 33);
  }
  {
    const c = new Canvas(28, 38);
    for (let y = 8; y < 34; y++) for (let x = 3; x < 25; x++) {
      const u = (x - 3) / 21, bulge = 1 - Math.abs((y - 21) / 14) * 0.22;
      if (Math.abs((x + 0.5 - 14) / 11) > bulge) continue;
      c.set(x, y, at(fl, u < 0.2 ? 3 : u < 0.55 ? 2 : u < 0.85 ? 1 : 0));
    }
    c.ellipse(14, 9, 11, 3.5, fl[3]); c.ellipse(14, 9, 8.5, 2.5, fl[0]);
    for (const y of [14, 28]) { c.rect(3, y, 22, 2, mt[1]); c.rect(3, y, 22, 1, mt[3]); }
    c.outline();
    S.barrel = A(c, 14, 35);
  }
  {
    const c = new Canvas(30, 24);
    c.ellipse(10, 14, 9, 8, fl[2]); c.ellipse(9, 12, 6, 5, fl[3]); c.rect(4, 19, 12, 3, fl[1]);
    c.ellipse(21, 15, 7, 6, fl[2]); c.ellipse(20, 13, 5, 4, fl[3]);
    c.line(6, 7, 13, 7, mt[1]); c.line(19, 11, 24, 11, mt[1]);
    c.outline();
    S.sacks = A(c, 15, 22);
  }
  for (const open of [false, true]) {
    const c = new Canvas(34, 32);
    faceBox(c, 3, 14, 28, 15, fl, 2);
    c.rect(3, 14, 28, 2, mt[1]); c.rect(3, 14, 28, 1, mt[3]); c.rect(3, 27, 28, 2, mt[0]);
    c.rect(15, 18, 4, 5, mt[3]); c.rect(16, 20, 2, 2, st[0]);
    if (!open) { topBox(c, 3, 6, 28, 8, fl, 3); c.rect(3, 6, 28, 1, mt[3]); c.rect(3, 12, 28, 2, mt[1]); }
    else { c.rect(4, 6, 26, 8, st[0]); c.rect(6, 8, 22, 4, pl[0]); c.poly([[3, 3], [31, 3], [29, 0], [5, 0]], fl[3]); c.rect(3, 0, 28, 3, fl[2]); c.rect(12, 9, 3, 2, lm[1]); }
    c.outline();
    S[open ? 'chest_open' : 'chest_closed'] = A(c, 17, 29);
  }

  // ---- pusaka bergema (Arsip) dan alas uji ----
  for (const on of [false, true]) {
    const c = new Canvas(34, 56);
    faceBox(c, 4, 44, 26, 10, st, 3); topBox(c, 4, 41, 26, 3, st, 4);
    pillarSq(c, 12, 22, 41, 10, st, 3, 20);
    c.ellipse(17, 20, 10, 4, st[4]); c.ellipse(17, 19, 10, 3.5, st[5]); c.ellipse(17, 19, 7, 2.5, st[1]);
    emblem(c, 17, 11, 7, on ? lm[2] : mt[3], on ? lm[2] : mt[3], !on);
    if (on) { ringPx(c, 17, 11, 9, lm[0]); for (const [x, y] of [[17, 1], [8, 4], [26, 4], [5, 11], [29, 11]]) c.set(x, y, lm[1]); }
    c.outline();
    S[on ? 'relic_glow' : 'relic_dim'] = A(c, 17, 52);
  }
  for (const on of [false, true]) {
    const c = new Canvas(40, 60);
    faceBox(c, 4, 48, 32, 10, st, 3); topBox(c, 4, 44, 32, 4, st, 4);
    pillarSq(c, 10, 24, 44, 20, st, 3, 20);
    // lempeng perisai di atas
    c.poly([[6, 6], [34, 6], [34, 22], [20, 32], [6, 22]], (x, y) => at(st, x < 12 ? 5 : x < 24 ? 4 : 3));
    c.poly([[10, 10], [30, 10], [30, 20], [20, 27], [10, 20]], on ? pl[0] : st[1]);
    emblem(c, 20, 17, 5, on ? lm[2] : st[4], on ? lm[2] : st[4], false);
    if (on) { for (const [x, y] of [[8, 8], [32, 8], [20, 2]]) c.set(x, y, lm[1]); ringPx(c, 20, 17, 8, lm[1]); }
    c.outline();
    S[on ? 'trial_pedestal_on' : 'trial_pedestal_off'] = A(c, 20, 56);
  }

  // ---- ceruk peringatan, jubah, papan nama, cakram jaga, celah jendela ----
  {
    const c = new Canvas(52, 66);
    c.poly([[2, 64], [2, 24], [12, 6], [40, 6], [50, 24], [50, 64]], (x, y) => at(st, x < 10 ? 4 : x > 42 ? 2 : 3));
    c.poly([[9, 64], [9, 28], [16, 14], [36, 14], [43, 28], [43, 64]], st[0]);
    c.rect(9, 52, 34, 12, st[2]); c.rect(9, 52, 34, 1, st[4]);
    // lilin-lilin habis (batang pendek dengan lelehan), lonceng tangan retak di tengah
    for (const [x, h] of [[12, 5], [16, 8], [21, 4], [32, 6], [37, 9], [41, 4]]) { c.rect(x, 52 - h, 3, h, fl[3]); c.rect(x, 52 - h, 3, 1, st[5]); c.set(x + 1, 51 - h, fl[0]); }
    c.poly([[20, 51], [32, 51], [30, 40], [22, 40]], (x) => at(mt, x < 24 ? 3 : x < 29 ? 2 : 1)); c.rect(24, 36, 4, 4, mt[2]);
    lineC(c, [[27, 51], [26, 46], [28, 41]], mt[0]);
    c.outline();
    S.memorial_niche = A(c, 26, 64);
  }
  {
    const c = new Canvas(32, 70);
    c.rect(14, 4, 4, 62, fl[2]); c.rect(14, 4, 1, 62, fl[3]); c.rect(4, 4, 24, 4, fl[2]); c.rect(4, 4, 24, 1, fl[3]);
    faceBox(c, 8, 62, 16, 6, st, 3);
    c.poly([[5, 8], [27, 8], [28, 30], [24, 46], [20, 38], [16, 50], [12, 40], [8, 44], [4, 30]], (x) => at(pl, x < 12 ? 1 : 0));
    c.line(6, 10, 26, 10, mt[2]);
    lineC(c, [[8, 12], [8, 38]], pl[0]); lineC(c, [[22, 12], [22, 38]], st[1]);
    // jahitan terakhir belum selesai: jarum masih tertancap
    c.line(16, 44, 22, 41, st[5]); c.set(23, 40, st[5]); c.set(15, 45, mt[3]);
    c.outline();
    S.cloak_stand = A(c, 16, 68);
  }
  {
    const c = new Canvas(84, 46);
    faceBox(c, 2, 2, 80, 40, st, 3);
    c.rect(2, 2, 80, 2, st[5]);
    for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) {
      const w = 12 + Math.floor(hash(r, k, 81) * 10), x = 8 + k * 18;
      c.rect(x, 8 + r * 6, w > 16 ? 15 : w, 2, st[1]); c.rect(x, 9 + r * 6, w > 16 ? 15 : w, 1, st[4]);
    }
    // nama terakhir digosok lalu dipahat ulang
    c.rect(8, 36, 40, 3, st[2]); lineC(c, [[10, 37], [20, 37], [24, 38], [34, 37], [44, 38]], st[5]);
    c.outline();
    S.name_wall = A(c, 42, 44);
  }
  {
    const c = new Canvas(56, 56);
    c.ellipse(28, 28, 25, 25, st[5]); c.ellipse(28, 28, 23, 23, st[1]); c.ellipse(28, 28, 21, 21, st[3]); c.ellipse(27, 27, 17, 17, st[4]);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; c.line(Math.round(28 + Math.cos(a) * 17), Math.round(28 + Math.sin(a) * 17), Math.round(28 + Math.cos(a) * 20), Math.round(28 + Math.sin(a) * 20), st[1]); }
    c.line(28, 28, 38, 18, st[0]); c.line(29, 28, 39, 18, st[0]); c.ellipse(28, 28, 3, 3, mt[2]); c.set(28, 27, mt[3]);
    c.outline();
    S.dial_wall = A(c, 28, 54);
  }
  {
    const c = new Canvas(44, 60);
    c.poly([[4, 58], [4, 20], [12, 6], [32, 6], [40, 20], [40, 58]], (x, y) => at(st, x < 9 ? 4 : x > 34 ? 2 : 3));
    c.poly([[16, 58], [16, 22], [19, 14], [25, 14], [28, 22], [28, 58]], st[0]);
    c.poly([[18, 58], [18, 24], [20, 17], [24, 17], [26, 24], [26, 58]], sk[1]);
    c.rect(20, 17, 2, 41, st[5]);
    c.outline();
    S.slit_window = A(c, 22, 58);
  }

  // ---- pengunci Heart (pilar batu dengan cap telapak tangan) ----
  for (const on of [false, true]) {
    const c = new Canvas(44, 90);
    faceBox(c, 4, 80, 36, 8, st, 3); topBox(c, 4, 77, 36, 3, st, 4);
    pillarSq(c, 9, 20, 77, 26, st, 3, 19);
    topBox(c, 6, 10, 32, 4, st, 5); faceBox(c, 6, 14, 32, 6, st, 3);
    // alur penghubung dan cetakan telapak tangan
    c.rect(15, 34, 14, 22, st[1]); c.rect(16, 35, 12, 20, on ? pl[0] : st[2]);
    c.ellipse(22, 48, 4, 4, on ? lm[1] : st[3]); c.rect(18, 40, 2, 5, on ? lm[1] : st[3]); c.rect(21, 38, 2, 6, on ? lm[1] : st[3]); c.rect(24, 40, 2, 5, on ? lm[1] : st[3]);
    c.line(22, 56, 22, 70, on ? lm[2] : st[1]); c.line(22, 20, 22, 34, on ? lm[2] : st[1]);
    if (on) { ringPx(c, 22, 48, 7, lm[0]); c.set(22, 8, lm[2]); c.set(21, 9, lm[1]); c.set(23, 9, lm[1]); }
    c.outline();
    S[on ? 'heart_pylon_on' : 'heart_pylon_off'] = A(c, 22, 86);
  }

  // ---- lambang Heart di dinding utara: lingkaran dengan satu garis patah ----
  for (const open of [false, true]) {
    const c = new Canvas(100, 66);
    c.ellipse(50, 33, 31, 31, st[2]); c.ellipse(49, 32, 29, 29, st[3]); c.ellipse(50, 33, 24, 24, st[1]); c.ellipse(50, 33, 21, 21, open ? pl[0] : st[0]);
    ringPx(c, 50, 33, 22, open ? lm[2] : mt[3]); ringPx(c, 50, 33, 21, open ? lm[1] : mt[2]);
    // satu garis: patah (terbelah di tengah) bila tersegel; menyatu dan menyala bila terbuka
    for (let t = -19; t <= 19; t++) {
      const y = 33 + Math.round(t * 0.45);
      if (!open && Math.abs(t) <= 3) continue;
      c.set(50 + t, y, open ? lm[2] : mt[3]); c.set(50 + t, y + 1, open ? lm[1] : mt[2]);
    }
    if (!open) {
      // rantai berkarat melilit dan menahan lambang
      lineC(c, [[8, 8], [34, 28], [50, 33]], mt[1]); lineC(c, [[92, 8], [66, 28], [50, 33]], mt[1]);
      for (let t = 0; t < 8; t++) { c.set(10 + t * 5, 10 + t * 3, mt[2]); c.set(90 - t * 5, 10 + t * 3, mt[2]); }
      c.rect(47, 30, 6, 6, mt[0]); c.rect(48, 31, 4, 4, lm[0]);
    } else {
      for (const [x, y] of [[10, 56], [86, 54], [24, 60], [76, 61]]) { c.rect(x, y, 4, 2, mt[1]); c.set(x, y, mt[3]); }
      for (const [x, y] of [[50, 6], [20, 20], [80, 20]]) c.set(x, y, lm[1]);
    }
    c.outline();
    S[open ? 'heart_emblem_open' : 'heart_emblem_sealed'] = A(c, 50, 64);
  }

  // ---- jendela busur Aveloria (0 tertutup, 1 terbuka + menara berdiri, 2 runtuh + debu, 3 debu reda + tonggak) ----
  for (let f = 0; f < 4; f++) {
    const c = new Canvas(92, 70);
    c.poly([[2, 68], [2, 26], [12, 6], [80, 6], [90, 26], [90, 68]], (x, y) => at(st, x < 10 ? 4 : x > 82 ? 2 : y < 12 ? 4 : 3));
    const inner = [[10, 68], [10, 28], [18, 14], [74, 14], [82, 28], [82, 68]];
    if (f === 0) {
      c.poly(inner, st[2]);
      for (let x = 12; x < 82; x += 14) c.line(x, 16, x, 66, st[1]);
      c.line(10, 40, 82, 40, st[1]); c.line(10, 54, 82, 54, st[1]);
      emblem(c, 46, 36, 9, st[4], st[4]);
      c.rect(11, 66, 70, 2, sk[1]);
    } else {
      c.poly(inner, (x, y) => (y < 38 ? sk[0] : y < 54 ? sk[0] : sk[0]));
      // langit pucat berlapis (dua nada, tepi papan catur 1 px)
      for (let y = 16; y < 68; y++) for (let x = 11; x < 82; x++) { if (c.alpha(x, y) && ((y > 44 && y < 50) ? (x + y) % 2 === 0 : y >= 50)) c.set(x, y, sk[1]); }
      // garis atap kota (siluet datar) dan beberapa cerobong
      c.rect(11, 56, 71, 12, st[1]);
      for (const [x, w, h] of [[14, 10, 4], [28, 12, 7], [44, 8, 5], [58, 10, 8], [70, 11, 4]]) c.rect(x, 56 - h, w, h, st[2]);
      for (const x of [31, 61]) c.rect(x, 46, 2, 4, st[1]);
      if (f === 1) {
        // menara tua: batang ramping dengan atap kerucut
        c.rect(40, 24, 8, 34, st[3]); c.rect(40, 24, 3, 34, st[4]); c.rect(47, 24, 1, 34, st[2]);
        c.poly([[38, 24], [50, 24], [44, 10]], st[1]); c.set(44, 10, st[5]);
        c.rect(42, 36, 2, 4, st[0]);
      } else if (f === 2) {
        // runtuh: menara patah dan condong, kolom debu naik
        c.poly([[40, 58], [48, 58], [47, 40], [41, 38]], st[3]);
        c.poly([[44, 38], [54, 30], [58, 38], [48, 44]], st[2]); c.poly([[56, 28], [64, 24], [62, 30]], st[1]);
        for (const [cx, cy, r] of [[44, 34, 9], [38, 24, 8], [50, 20, 8], [43, 12, 6], [56, 30, 7]]) { c.ellipse(cx, cy, r, r * 0.8, sk[1]); c.ellipse(cx - 2, cy - 1, r * 0.55, r * 0.45, st[5]); }
        for (let x = 12; x < 80; x += 6) c.set(x, 54 + ((x >> 1) % 2), st[4]);
      } else {
        // debu mereda: tonggak pendek, kabut tipis tersisa (papan catur)
        c.rect(40, 46, 8, 12, st[3]); c.rect(40, 46, 3, 12, st[4]); c.rect(42, 44, 4, 2, st[2]);
        for (let y = 20; y < 50; y++) for (let x = 20; x < 76; x++) { if ((x + y) % 2 === 0 && (x * 3 + y * 5) % 11 < 4 && c.alpha(x, y) && c.col(x, y) === sk[0]) c.set(x, y, sk[1]); }
        for (const [cx, cy, r] of [[44, 38, 7], [52, 32, 5]]) c.ellipse(cx, cy, r, r * 0.6, st[4]);
      }
    }
    c.rect(2, 6, 88, 2, st[5]); c.rect(2, 66, 88, 2, st[1]);
    c.outline();
    S['window_arch_' + f] = A(c, 46, 68);
  }

  // ---- benda gema (peta kulit / dua keping) dengan alas ----
  for (const kind of ['a', 'b'])
    for (const on of [false, true]) {
      const c = new Canvas(44, 62);
      faceBox(c, 5, 50, 34, 10, st, 2); topBox(c, 5, 47, 34, 3, st, 3);
      pillarSq(c, 12, 28, 47, 20, st, 2, 20);
      c.ellipse(22, 27, 16, 6, st[3]); c.ellipse(22, 26, 16, 5.5, st[4]); c.ellipse(22, 26, 13, 4, st[2]);
      if (kind === 'a') {
        c.poly([[10, 25], [34, 22], [36, 29], [12, 32]], on ? st[5] : fl[3]);
        lineC(c, [[13, 27], [20, 25], [27, 28], [32, 25]], on ? pl[1] : fl[1]); lineC(c, [[13, 29], [22, 30], [30, 27]], on ? lm[1] : fl[2]);
      } else {
        for (const dx of [-5, 6]) { c.ellipse(22 + dx, 24, 5, 4, on ? st[5] : st[4]); c.rect(22 + dx - (dx < 0 ? 0 : 5), 20, 5, 9, st[3]); }
        c.rect(22, 21, 1, 7, pl[0]);
      }
      if (on) { ringPx(c, 22, 18, 11, pl[1], 6); ringPx(c, 22, 14, 14, pl[0], 8); c.set(22, 6, lm[1]); c.set(12, 10, lm[1]); c.set(32, 9, lm[1]); }
      c.outline();
      S[`echo_${kind}_${on ? 'on' : 'off'}`] = A(c, 22, 58);
    }

  // ---- puing, balok jatuh, gerobak patah, retakan lantai (aktif lime / mati) ----
  {
    const c = new Canvas(40, 26);
    for (const [x, y, w, h] of [[3, 10, 14, 11], [18, 6, 15, 14], [10, 14, 12, 8]]) { topBox(c, x, y, w, 3, st, 4); faceBox(c, x, y + 3, w, h - 3, st, 2); }
    c.outline(); S.rubble_a = A(c, 20, 24);
  }
  {
    const c = new Canvas(48, 26);
    for (const [x, y, w, h] of [[3, 12, 10, 8], [16, 14, 8, 6], [28, 10, 12, 10], [22, 5, 7, 5], [8, 6, 6, 5]]) { topBox(c, x, y, w, 2, st, 4); faceBox(c, x, y + 2, w, h - 2, st, 2); }
    for (const [x, y] of [[2, 22], [14, 23], [26, 22], [40, 21]]) c.rect(x, y, 3, 1, st[2]);
    c.outline(); S.rubble_b = A(c, 24, 24);
  }
  {
    const c = new Canvas(32, 18);
    for (const [x, y, w, h] of [[3, 8, 7, 6], [13, 5, 8, 8], [23, 9, 6, 5]]) { topBox(c, x, y, w, 2, st, 4); faceBox(c, x, y + 2, w, h - 2, st, 2); }
    c.outline(); S.rubble_c = A(c, 16, 16);
  }
  {
    const c = new Canvas(68, 34);
    topBox(c, 2, 4, 64, 8, st, 4); faceBox(c, 2, 12, 64, 16, st, 2);
    lineC(c, [[24, 4], [27, 14], [24, 22], [27, 28]], st[0]);
    c.line(44, 12, 44, 27, st[1]);
    c.rect(2, 28, 8, 3, st[1]);
    c.outline(); S.block_fallen = A(c, 34, 32);
  }
  {
    const c = new Canvas(76, 48);
    // gerobak pasokan dengan as patah: bak miring, satu roda terlepas
    c.poly([[6, 14], [60, 14], [64, 32], [10, 36]], (x) => at(fl, x < 20 ? 3 : x < 46 ? 2 : 1));
    for (const x of [18, 32, 46]) c.line(x, 14, x + 1, 34, fl[0]);
    c.rect(6, 12, 56, 3, fl[3]);
    // roti dan karung di dalam bak
    c.ellipse(22, 11, 6, 3, mt[3]); c.ellipse(21, 10, 4, 2, mt[2]); c.ellipse(40, 10, 7, 3, fl[3]);
    c.ellipse(52, 36, 9, 9, fl[1]); c.ellipse(52, 36, 7, 7, fl[2]); c.ellipse(52, 36, 2, 2, mt[1]);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; c.line(52, 36, Math.round(52 + Math.cos(a) * 7), Math.round(36 + Math.sin(a) * 7), fl[0]); }
    c.line(6, 38, 34, 44, mt[1]); c.rect(8, 36, 3, 8, fl[1]);
    c.ellipse(70, 42, 5, 4, fl[1]); c.ellipse(70, 42, 3, 2.5, fl[2]);
    c.outline();
    S.cart_broken = A(c, 38, 44);
  }
  const crack = (name, pts, dead) => {
    let maxX = 0, maxY = 0; for (const [x, y] of pts) { maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    const c = new Canvas(maxX + 6, maxY + 6);
    const core = dead ? st[1] : pl[0], edge = dead ? st[3] : lm[1], glow = dead ? fl[1] : lm[0];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
      for (let k = 0; k <= n; k++) {
        const x = Math.round(x0 + ((x1 - x0) * k) / n) + 2, y = Math.round(y0 + ((y1 - y0) * k) / n) + 2;
        c.set(x, y - 1, edge); c.set(x - 1, y, glow); c.set(x, y, core); c.set(x + 1, y, core); c.set(x + 2, y + 1, dead ? st[0] : lm[0]);
      }
    }
    S[name] = A(c, c.w / 2, c.h - 2);
  };
  const A1 = [[0, 14], [10, 10], [16, 18], [28, 12], [36, 20], [48, 14], [60, 22]];
  const B1 = [[0, 6], [8, 12], [14, 8], [26, 16], [30, 24], [44, 20], [52, 26]];
  const C1 = [[0, 12], [9, 8], [18, 14], [30, 10]];
  crack('crack_a', A1, false); crack('crack_b', B1, false); crack('crack_c', C1, false);
  crack('crack_a_dead', A1, true); crack('crack_b_dead', B1, true); crack('crack_c_dead', C1, true);

  // ---- bayangan lantai Heart (cincin segel di lantai, sebagai decal) ----
  for (const open of [false, true]) {
    const W = 236, H = 118, c = new Canvas(W, H), cx = W / 2, cy = H / 2;
    const ell = (rx, ry, col, thick = 1) => { for (let t = 0; t < thick; t++) ringPx(c, cx, cy, rx - t, col, ry - t * 0.5); };
    ell(112, 56, st[0], 2); ell(110, 54, open ? lm[1] : st[1]); ell(108, 53, st[3]);
    for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.283; const x = Math.round(cx + Math.cos(a) * 100), y = Math.round(cy + Math.sin(a) * 49); c.rect(x - 1, y - 1, 3, 3, open && i % 2 === 0 ? lm[1] : st[2]); }
    ell(88, 43, st[1]); ell(87, 42.5, st[4]);
    // cincin dalam: lingkaran dengan garis patah
    ell(52, 26, open ? lm[2] : mt[3]); ell(51, 25.5, open ? lm[1] : mt[2]);
    for (let t = -46; t <= 46; t++) { if (!open && Math.abs(t) <= 4) continue; c.set(Math.round(cx + t), Math.round(cy + t * 0.28), open ? lm[2] : mt[3]); }
    if (!open) {
      // pecahan segel baru yang tajam (tidak berlumut) dan rantai berkarat yang terputus
      for (const [dx, dy, w] of [[-70, 12, 8], [60, 20, 7], [-30, -34, 6], [84, -10, 6], [-96, -6, 5]]) { c.rect(cx + dx, cy + dy, w, 3, st[4]); c.rect(cx + dx, cy + dy + 3, w, 2, st[1]); c.set(cx + dx, cy + dy, st[5]); }
      for (let t = 0; t < 7; t++) { c.set(Math.round(cx - 40 + t * 4), Math.round(cy + 22 + t), mt[1]); c.set(Math.round(cx + 18 + t * 4), Math.round(cy - 24 + t), mt[1]); }
    } else {
      for (const [dx, dy] of [[-70, 12], [60, 20], [-30, -34], [84, -10]]) { c.rect(cx + dx, cy + dy, 6, 2, st[2]); c.set(cx + dx, cy + dy, st[4]); }
      for (const [dx, dy] of [[0, -6], [-14, 4], [14, 4], [0, 14]]) c.set(cx + dx, cy + dy, lm[1]);
    }
    S[open ? 'heart_seal_open' : 'heart_seal_sealed'] = A(c, cx, cy);
  }

  // ---- debu (partikel) ----
  { const c = new Canvas(2, 2); c.rect(0, 0, 2, 2, st[5]); S.mote = A(c, 1, 2); }

  // ---- patroli dunia (DRAFT; bukan atlas battle) ----
  for (const f of [false, true]) {
    // penjaga berzirah (Oathguard)
    const c = new Canvas(36, 54), b = f ? 1 : 0;
    c.rect(11, 46, 6, 7, st[1]); c.rect(19, 46, 6, 7, st[1]); c.rect(10, 51, 8, 2, st[0]); c.rect(18, 51, 8, 2, st[0]);
    c.poly([[10, 28], [26, 28], [28, 48 - b], [8, 48 - b]], (x) => at(mt, x < 15 ? 2 : x < 22 ? 1 : 0));
    c.rect(9, 30, 18, 4, st[3]); c.rect(9, 30, 18, 1, st[5]); c.rect(16, 32, 4, 14, mt[3]);
    c.ellipse(8, 32, 5, 4, st[4]); c.ellipse(28, 32, 5, 4, st[3]);
    c.ellipse(18, 20, 7, 8, st[4]); c.ellipse(17, 19, 5, 6, st[5]); c.rect(13, 21, 10, 2, st[0]);
    c.rect(17, 8, 3, 6, mt[1]); c.rect(17, 8, 3, 1, mt[3]);
    // perisai
    c.poly([[1, 32 + b], [11, 32 + b], [11, 46 + b], [6, 52 + b], [1, 46 + b]], (x) => at(st, x < 5 ? 4 : 3)); ringPx(c, 6, 41 + b, 2, mt[3]);
    // tombak
    c.rect(30, 4 + b, 2, 46, st[5]); c.rect(32, 4 + b, 1, 46, st[2]); c.poly([[29, 4 + b], [33, 4 + b], [31, -1 + b]], st[5]);
    c.outline();
    S[f ? 'oathguard_b' : 'oathguard_a'] = A(c, 18, 52);
  }
  for (const f of [false, true]) {
    // Riftborn: bayangan orang yang sedang jatuh, sangat lambat; celah lime di dadanya
    const c = new Canvas(34, 56), b = f ? 1 : 0;
    c.poly([[10, 54], [8, 34], [12, 20 + b], [22, 20 + b], [27, 36], [24, 54]], (x) => at(pl, x < 16 ? 1 : 0));
    c.ellipse(17, 14 + b, 6, 7, pl[1]); c.ellipse(16, 13 + b, 4, 5, st[3]);
    c.rect(13, 14 + b, 3, 2, st[0]); c.rect(18, 14 + b, 3, 2, st[0]); c.set(14, 14 + b, lm[2]); c.set(19, 14 + b, lm[2]);
    c.poly([[6, 26], [10, 24], [8, 44 + b], [3, 46 + b]], pl[0]); c.poly([[26, 26], [30, 30], [32, 46 - b], [27, 44 - b]], pl[1]);
    lineC(c, [[17, 22], [15, 30], [18, 38], [15, 46], [17, 53]], lm[1]); lineC(c, [[18, 24], [20, 32]], lm[0]);
    for (let y = 48; y < 54; y += 2) c.rect(8 + (y % 3), y, 4, 1, pl[1]);
    c.outline();
    S[f ? 'riftborn_b' : 'riftborn_a'] = A(c, 17, 54);
  }
  for (const f of [false, true]) {
    // Gravorn: raksasa batu pekat, retak plum
    const c = new Canvas(60, 76), b = f ? 1 : 0;
    c.rect(14, 62, 14, 12, st[2]); c.rect(32, 62, 14, 12, st[1]); c.rect(12, 72, 18, 3, st[0]); c.rect(30, 72, 18, 3, st[0]);
    c.poly([[12, 30], [48, 30], [52, 64 - b], [8, 64 - b]], (x) => at(st, x < 22 ? 4 : x < 36 ? 3 : 2));
    for (let y = 36; y < 62; y += 9) c.line(11, y, 49, y, st[1]);
    c.ellipse(9, 38, 8, 7, st[4]); c.ellipse(8, 37, 5, 4, st[5]); c.ellipse(51, 38, 8, 7, st[3]);
    c.rect(1, 42, 10, 22 - b, st[3]); c.rect(1, 42, 3, 22 - b, st[4]); c.rect(49, 42, 10, 22 - b, st[2]);
    c.rect(0, 62 - b, 13, 9, st[2]); c.rect(47, 62 - b, 13, 9, st[1]); c.rect(0, 62 - b, 13, 2, st[4]);
    c.ellipse(30, 22 + b, 11, 9, st[4]); c.ellipse(28, 21 + b, 8, 7, st[5]); c.rect(22, 23 + b, 16, 3, st[0]); c.set(25, 24 + b, lm[1]); c.set(34, 24 + b, lm[1]);
    lineC(c, [[24, 32], [28, 42], [24, 52], [30, 62]], pl[0]); lineC(c, [[25, 32], [29, 42], [25, 52], [31, 62]], lm[0]);
    lineC(c, [[44, 36], [41, 46], [45, 56]], st[0]);
    c.outline();
    S[f ? 'gravorn_b' : 'gravorn_a'] = A(c, 30, 74);
  }
  return S;
}
