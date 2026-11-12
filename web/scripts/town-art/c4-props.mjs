// Prop Aveloria SESUDAH menara tua runtuh (Chapter IV, C4-07). DRAFT / NEEDS_REVIEW, code-native, deterministik.
// Bahasa visual sama dengan Aveloria + krisis Bab III: palet tertutup (AV), outline 1 px, cahaya kiri-atas, tanpa blur/gradien halus.
// Alfa hanya untuk bayangan datar. Retakan emas yang dulu terang kini hanya bekas yang tenang (inti emas redup, jarang).
import { Canvas, H, rng, hash, vnoise } from './pixel.mjs';
import { AV } from './ave-palette.mjs';
import { R, INK, ramp, ashlar, tilePlane } from './kit.mjs';
import { drawText, textWidth } from './font.mjs';
import { GOLD } from './crisis-props.mjs';

const SHADOW = AV.shadow;
const CRACK = ramp('#1d1625', '#2a2230', '#3d3447');
const S = AV.stone, W_ = AV.wood;
export const fr = (name, c, baseY, px = 0.5) => ({ name, c, pivot: { x: px, y: (baseY + 1) / c.h } });
export const frC = (name, c) => ({ name, c, pivot: { x: 0.5, y: 0.5 } });

/** Salin piksel `src` yang ada di dalam `mask` (alfa > 0) ke `dst`. */
function blitMasked(dst, src, mask) {
  for (let y = 0; y < dst.h; y++) for (let x = 0; x < dst.w; x++) if (mask.alpha(x, y) > 0) { const p = src.get(x, y); if (p) dst.set(x, y, [p[0], p[1], p[2]]); }
}

/** Batu patahan berpencahayaan kiri-atas dengan garis tepi sendiri; ukuran luar (w+2) x (h+2). */
export function rock(w, h, seed, rampC = S, tone = 2) {
  const c = new Canvas(w + 2, h + 2), rand = rng(seed), cx = (w + 2) / 2, cy = (h + 2) / 2, n = 7, pts = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rand() * 0.5;
    pts.push([cx + Math.cos(a) * (w / 2) * (0.78 + rand() * 0.22), cy + Math.sin(a) * (h / 2) * (0.72 + rand() * 0.28)]);
  }
  c.poly(pts, (x, y) => {
    const lx = (x - cx) / (w / 2), ly = (y - cy) / (h / 2), t = lx + ly;
    let k = tone + (t < -0.55 ? 2 : t < -0.1 ? 1 : t > 0.5 ? -2 : t > 0.15 ? -1 : 0);
    if (((x * 7 + y * 13) % 11) === 0) k -= 1;
    return R(rampC, k);
  });
  c.outline(INK);
  return c;
}

/** Serpihan genteng slate (jajaran genjang bergaris genteng). */
function shard(w, h, seed) {
  const c = new Canvas(w + 2, h + 2);
  tilePlane(c, [[1, h * 0.35 + 1], [w * 0.75, 1], [w, h * 0.6 + 1], [w * 0.25, h + 1]], { ramp: AV.slate, ch: 4, tw: 6, shift: 0, seed, y0: 1 });
  c.outline(INK);
  return c;
}

/** Balok kayu patah: miring `slope` (px naik per px panjang), ujung bergerigi. */
function beam(len, th, slope, seed) {
  const rand = rng(seed), h = Math.ceil(Math.abs(slope) * len) + th + 6, c = new Canvas(len + 6, h);
  const y0 = slope < 0 ? h - th - 3 : 3;
  const pts = [[2, y0 + 2], [len + 2, y0 + len * slope], [len + 2, y0 + len * slope + th]];
  const top = [[2, y0], [len + 2, y0 + len * slope]];
  void pts; void top;
  c.poly([[2, y0], [len + 3, y0 + len * slope], [len + 3, y0 + len * slope + th], [2, y0 + th]], (x, y) => {
    const yl = y - (y0 + (x - 2) * slope), k = yl < th * 0.3 ? 4 : yl > th * 0.72 ? 1 : 3;
    return R(W_, k - ((x * 3 + y) % 9 === 0 ? 1 : 0));
  });
  // ujung patah: gigi kayu
  for (let j = 0; j < th; j += 2) c.set(1, Math.round(y0 + j + (rand() < 0.5 ? 0 : 1)), R(W_, 4));
  c.outline(INK);
  return c;
}

// ---------------------------------------------------------------------------------------------------------------------
// Reruntuhan menara
// ---------------------------------------------------------------------------------------------------------------------

/** Sisa menara + timbunan batu, genteng, balok. 176x128, kaki di y=122 (pivot tengah-bawah). Tunggul menjulang ~85 px (menara asli ~140 px). */
export function ruinMain() {
  const W = 176, Hh = 128, B = 122, c = new Canvas(W, Hh), rand = rng(404);
  // 1. tunggul menara: dinding batu bertingkat, tepi atas patah bergerigi, jendela tersisa separuh
  const tmp = new Canvas(W, Hh);
  ashlar(tmp, 66, 26, 56, 100, { ramp: S, tone: 3, ch: 6, bw: [9, 14], seed: 21 });
  const mask = new Canvas(W, Hh);
  mask.poly([[66, 70], [72, 52], [79, 60], [84, 40], [92, 50], [97, 30], [105, 46], [111, 40], [117, 56], [122, 68], [122, 126], [66, 126]], [255, 255, 255]);
  const stump = new Canvas(W, Hh); blitMasked(stump, tmp, mask);
  // sisi kanan menara berada di bayangan (cahaya kiri-atas)
  for (let y = 0; y < Hh; y++) for (let x = 108; x < 124; x++) { const p = stump.get(x, y); if (p) stump.set(x, y, [Math.max(0, p[0] - 26), Math.max(0, p[1] - 26), Math.max(0, p[2] - 22)]); }
  // jendela lengkung yang tersisa (gelap) + ambang, dan sisa balkon lonceng yang menganga
  stump.rect(82, 78, 11, 18, R(AV.slate, 0)); stump.rect(83, 75, 9, 4, R(AV.slate, 0)); stump.hline(81, 96, 13, R(S, 5)); stump.hline(82, 74, 1, R(S, 4));
  for (const [x, y] of [[85, 80], [86, 81], [87, 82], [88, 83]]) stump.set(x, y, AV.glass[1]);
  for (const [x, y, w, h] of [[72, 56, 7, 12], [90, 42, 7, 8], [108, 48, 8, 10]]) stump.rect(x, y, w, h, R(AV.slate, 1));
  // retakan lama di dinding yang tersisa (gelap, bergerigi)
  for (const [x, y] of [[100, 60], [101, 64], [100, 68], [102, 73], [103, 79], [102, 85], [104, 92]]) { stump.set(x, y, CRACK[0]); stump.set(x + 1, y, CRACK[1]); }
  for (let x = 66; x < 122; x++) for (let y = 24; y < 80; y++) { if (stump.alpha(x, y) && !stump.alpha(x, y - 1)) { stump.set(x, y, R(S, 5)); break; } }
  c.blit(stump, 0, 0);
  c.outline(INK);
  // 2. timbunan batu: dari belakang ke depan di dalam elips gundukan, melebar ke kiri (arah jatuh menara)
  const rocks = [];
  for (let k = 0; k < 74; k++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand());
    const x = 84 + Math.cos(a) * r * 76 + (Math.cos(a) < 0 ? -6 : 0), y = 98 + Math.sin(a) * r * 19;
    if (y < 76 || x < 6 || x > 170) continue;
    const big = r < 0.6 && rand() < 0.5;
    rocks.push({ x, y, w: Math.round((big ? 16 : 8) + rand() * (big ? 10 : 6)), h: Math.round((big ? 10 : 5) + rand() * (big ? 7 : 4)), seed: 100 + k, tone: 1 + Math.floor(rand() * 3) });
  }
  rocks.sort((p, q) => p.y - q.y);
  for (const r of rocks) { const sp = rock(r.w, r.h, r.seed, S, r.tone); c.blit(sp, Math.round(r.x - sp.w / 2), Math.round(r.y - sp.h / 2)); }
  // 3. genteng slate yang jatuh dan balok yang mencuat
  for (const [x, y, w, h, s] of [[16, 92, 17, 10, 3], [46, 106, 15, 9, 5], [120, 98, 18, 10, 7], [140, 108, 14, 8, 9], [34, 108, 12, 8, 11], [84, 112, 14, 8, 13]]) c.blit(shard(w, h, s), x, y);
  for (const [x, y, len, th, sl, s] of [[100, 62, 50, 6, 0.55, 3], [24, 82, 40, 5, -0.45, 5], [128, 84, 32, 5, 0.12, 7], [54, 94, 28, 4, 0.3, 9]]) c.blit(beam(len, th, sl, s), x, y);
  // 4. kerak debu di permukaan atas (kelompok 2 px, bukan piksel liar)
  for (let k = 0; k < 40; k++) {
    const x = 12 + Math.floor(rand() * 150), y = 84 + Math.floor(rand() * 36);
    if (c.alpha(x, y) && c.alpha(x + 1, y) && c.alpha(x, y + 1) && c.alpha(x + 1, y + 1)) { c.rect(x, y, 2, 1, AV.pave[4]); c.set(x, y + 1, AV.pave[3]); }
  }
  return fr('c4_ruin_main', c, B);
}

/** Kerucut atap slate yang jatuh dan miring di tanah. 46x34. */
export function roofFallen() {
  const c = new Canvas(46, 34), B = 31;
  tilePlane(c, [[3, 30], [28, 4], [40, 24], [42, 31], [10, 31]], { ramp: AV.slate, ch: 4, tw: 6, shift: 0, seed: 12, y0: 4 });
  // bagian dalam yang terlihat (gelap) di tepi patah
  c.poly([[42, 31], [40, 24], [32, 26], [34, 31]], R(AV.slate, 0));
  c.line(28, 4, 3, 30, R(AV.slate, 4)); c.line(28, 4, 40, 24, R(AV.slate, 1));
  c.rect(27, 1, 3, 4, R(AV.bronze, 2)); c.set(27, 1, R(AV.bronze, 3)); c.set(28, 0, R(AV.bronze, 2));
  c.outline(INK);
  return fr('c4_roof_fallen', c, B);
}

/** Lonceng perunggu retak, tergeletak miring. 40x34. */
export function bellFallen() {
  const c = new Canvas(40, 34), B = 30;
  const pts = [[34, 12], [28, 8], [18, 5], [9, 3], [4, 7], [4, 26], [9, 30], [18, 27], [28, 24], [34, 20]];
  c.poly(pts, (x, y) => { const k = y < 10 ? 3 : y < 17 ? 2 : y < 24 ? 1 : 0; return R(AV.bronze, k + (x < 12 && y < 18 ? 1 : 0)); });
  for (const bx of [13, 21]) for (let y = 5; y < 28; y++) if (c.alpha(bx, y) > 0) c.set(bx, y, R(AV.bronze, 0));
  // mulut lonceng (gelap) di sisi kiri + bibir terang
  c.ellipse(6, 17, 3, 9, R(AV.slate, 0)); c.vline(3, 10, 14, R(AV.bronze, 3));
  // retak: garis gelap bergerigi dari bibir ke bahu, dengan pecahan bibir
  for (const [x, y] of [[10, 6], [11, 8], [12, 10], [14, 12], [15, 14], [17, 17], [18, 20], [20, 24]]) { c.set(x, y, CRACK[0]); c.set(x + 1, y, CRACK[1]); }
  c.set(9, 5, R(AV.bronze, 0)); c.set(8, 7, R(AV.bronze, 0));
  // sisa gantungan kayu patah
  c.rect(32, 6, 6, 4, R(W_, 2)); c.hline(32, 6, 6, R(W_, 4)); c.rect(35, 10, 2, 3, R(W_, 1));
  c.outline(INK);
  // bayangan datar di tanah
  const sh = new Canvas(40, 34); sh.ellipse(20, 31, 17, 3, SHADOW, 110); sh.blit(c, 0, 0);
  return fr('c4_bell_fallen', sh, B);
}

/** Muka jam retak, henti pada pukul sembilan, tergeletak. 22x22 (pivot tengah-bawah). */
export function clockBroken() {
  const c = new Canvas(24, 20), cx = 12, cy = 9;
  c.ellipse(cx, cy, 11, 8, R(S, 5)); c.ellipse(cx, cy, 9, 6, (x, y) => (x + y < cx + cy - 3 ? AV.linen : AV.cream));
  for (let a = 0; a < 12; a++) { const t = (a / 12) * Math.PI * 2; c.set(Math.round(cx + Math.sin(t) * 8), Math.round(cy - Math.cos(t) * 5), R(AV.slate, 0)); }
  c.line(cx, cy, cx - 6, cy, R(AV.slate, 1)); c.line(cx, cy, cx, cy - 4, R(AV.slate, 0));
  for (const [x, y] of [[5, 5], [7, 7], [9, 8], [12, 10], [15, 12], [18, 14]]) { c.set(x, y, CRACK[0]); c.set(x + 1, y, CRACK[1]); }
  c.set(cx, cy, R(AV.bronze, 2));
  c.outline(INK);
  return fr('c4_clock_broken', c, 17);
}

/** Tumpukan batu kecil/sedang/besar yang berdiri sendiri. */
function rubblePile(name, w, h, n, seed) {
  const c = new Canvas(w, h), rand = rng(seed), rocks = [];
  for (let k = 0; k < n; k++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand());
    rocks.push({ x: w / 2 + Math.cos(a) * r * (w / 2 - 6), y: h - 6 - Math.abs(Math.sin(a)) * r * (h - 12), w: 5 + Math.round(rand() * (h / 2)), h: 4 + Math.round(rand() * (h / 3)), seed: seed * 10 + k, tone: 1 + Math.floor(rand() * 3) });
  }
  rocks.sort((p, q) => p.y - q.y);
  for (const r of rocks) { const sp = rock(r.w, r.h, r.seed, S, r.tone); c.blit(sp, Math.round(r.x - sp.w / 2), Math.round(r.y - sp.h / 2)); }
  return fr(name, c, h - 2);
}
export function rubblePiles() { return [rubblePile('c4_rubble_s', 30, 18, 4, 31), rubblePile('c4_rubble_m', 46, 24, 8, 32), rubblePile('c4_rubble_l', 68, 32, 13, 33)]; }

/** Balok kayu rebah di tanah (dua jenis). */
export function beams() {
  const a = beam(54, 6, 0.06, 41), b = beam(36, 5, -0.4, 42);
  return [fr('c4_beam_a', a, a.h - 3), fr('c4_beam_b', b, b.h - 3)];
}

// ---------------------------------------------------------------------------------------------------------------------
// Pagar darurat dan tanda
// ---------------------------------------------------------------------------------------------------------------------

const ROPE = [R(AV.earth, 1), R(AV.earth, 2), R(AV.earth, 3)];
function post(c, x, topY, h) {
  c.rect(x, topY, 4, h, R(W_, 2)); c.vline(x, topY, h, R(W_, 4)); c.vline(x + 3, topY, h, R(W_, 1)); c.hline(x, topY, 4, R(W_, 4));
  c.set(x, topY + h - 1, R(W_, 1));
}
/** Pagar datar: dua tiang pancang, dua tali melorot, satu papan silang. 36x32, kaki di y=30. */
export function fenceH() {
  const c = new Canvas(36, 32), B = 30;
  post(c, 3, 6, 25); post(c, 29, 6, 25);
  for (const [y0, sag] of [[10, 2], [18, 3]]) for (let x = 7; x < 29; x++) { const t = (x - 7) / 21, y = y0 + Math.round(Math.sin(t * Math.PI) * sag); c.set(x, y, ROPE[2]); c.set(x, y + 1, ROPE[0]); }
  // papan silang miring (dipaku di kedua tiang)
  for (let i = 0; i < 26; i++) { const x = 5 + i, y = 22 - Math.round(i * 0.35); c.rect(x, y, 1, 3, R(W_, 3)); c.set(x, y, R(W_, 4)); c.set(x, y + 2, R(W_, 1)); }
  c.outline(INK);
  return fr('c4_fence_h', c, B);
}
/** Palang darurat silang (untuk garis utara-selatan): dua tiang pendek, papan silang, tali. 28x26, kaki y=24. */
export function barrier() {
  const c = new Canvas(28, 26), B = 24;
  c.ellipse(14, B + 1, 12, 2, SHADOW, 110);
  for (const x of [3, 21]) { post(c, x, 5, 17); c.rect(x - 1, B - 3, 6, 3, R(S, 2)); c.hline(x - 1, B - 3, 6, R(S, 4)); }
  for (let i = 0; i < 20; i++) { const x = 5 + i, y = 7 + Math.round(i * 0.4); c.rect(x, y, 1, 3, R(W_, 3)); c.set(x, y, R(W_, 4)); c.set(x, y + 2, R(W_, 1)); }
  for (let i = 0; i < 20; i++) { const x = 5 + i, y = 15 - Math.round(i * 0.4); c.rect(x, y, 1, 3, R(W_, 2)); c.set(x, y, R(W_, 3)); c.set(x, y + 2, R(W_, 0)); }
  c.hline(5, 4, 20, ROPE[2]); c.hline(5, 5, 20, ROPE[0]);
  c.outline(INK);
  return fr('c4_barrier', c, B);
}
/** Papan peringatan "TUTUP" di tiang. 32x44. */
export function signClosed() {
  const c = new Canvas(32, 44), B = 40;
  post(c, 14, 14, 27); c.rect(10, B - 3, 12, 3, R(S, 3)); c.hline(10, B - 3, 12, R(S, 5));
  const w = textWidth('TUTUP') + 8;
  c.rect(16 - Math.floor(w / 2), 2, w, 13, AV.tomato); c.hline(16 - Math.floor(w / 2), 2, w, [214, 110, 94]); c.hline(16 - Math.floor(w / 2), 14, w, [133, 56, 48]); c.vline(16 - Math.floor(w / 2) + w - 1, 2, 13, [133, 56, 48]);
  drawText(c, 16 - Math.floor(w / 2) + 4, 6, 'TUTUP', AV.cream, [133, 56, 48]);
  c.set(16 - Math.floor(w / 2) + 1, 3, R(AV.iron, 2)); c.set(16 - Math.floor(w / 2) + w - 2, 3, R(AV.iron, 2));
  c.outline(INK);
  return fr('c4_sign_closed', c, B);
}

// ---------------------------------------------------------------------------------------------------------------------
// Debu (animasi 4 frame, kelompok piksel opak yang naik dan menyebar; tidak ada blur)
// ---------------------------------------------------------------------------------------------------------------------
export function dustFrames() {
  const W = 96, Hh = 72, out = [], rand = rng(777), base = [];
  for (let k = 0; k < 110; k++) {
    const row = Math.pow(rand(), 0.8), y = Hh - 4 - row * (Hh - 10), spread = 8 + row * 30;
    base.push({ x: W / 2 + (rand() * 2 - 1) * spread + Math.sin(row * 5) * 6, y, big: rand() < 0.45, tone: rand() < 0.55 ? 4 : 3 });
  }
  for (let f = 0; f < 4; f++) {
    const c = new Canvas(W, Hh);
    for (const d of base) {
      const rise = f * 3 + d.y * 0.05 * f, y = Math.round(d.y - rise), x = Math.round(d.x + Math.sin((d.y + f * 9) * 0.3) * 2 + f);
      if (y < 2) continue;
      const fade = (Hh - y) / Hh; // makin tinggi makin jarang (kelompok dibuang berdasarkan hash, bukan alfa)
      if (hash(Math.round(d.x), Math.round(d.y), f + 3) < fade * 0.45) continue;
      const col = R(AV.pave, d.tone);
      if (d.big) { c.rect(x, y, 3, 2, col); c.rect(x + 1, y - 1, 2, 1, col); c.rect(x, y + 2, 2, 1, R(AV.pave, d.tone - 1)); } else c.rect(x, y, 2, 2, col);
    }
    out.push(fr(`c4_dust_${f}`, c, Hh - 2));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Bekas retakan yang sudah tenang, batu yang kembali ke tanah, serpihan di tanah
// ---------------------------------------------------------------------------------------------------------------------
function jag(pts, seed, amp = 2, step = 4) {
  const rand = rng(seed), out = [];
  for (let k = 0; k + 1 < pts.length; k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / step));
    const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    for (let i = 0; i < n; i++) { const t = i / n, o = (rand() - 0.5) * 2 * amp * (i === 0 ? 0.2 : 1); out.push([Math.round(x0 + (x1 - x0) * t + nx * o), Math.round(y0 + (y1 - y0) * t + ny * o)]); }
  }
  out.push(pts[pts.length - 1].map(Math.round));
  return out;
}
function scar(name, w, h, paths, seed) {
  const c = new Canvas(w, h), rand = rng(seed + 5);
  const lines = paths.map((p, i) => ({ pts: jag(p.pts, seed + i * 7, p.amp ?? 2), thin: !!p.thin }));
  for (const l of lines) for (let i = 0; i + 1 < l.pts.length; i++) {
    const [x0, y0] = l.pts[i], [x1, y1] = l.pts[i + 1], nn = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let s = 0; s <= nn; s++) { const x = Math.round(x0 + ((x1 - x0) * s) / nn), y = Math.round(y0 + ((y1 - y0) * s) / nn); c.set(x, y, CRACK[1]); if (!l.thin) c.set(x + 1, y, CRACK[0]); }
  }
  // bibir terang kiri-atas, dan isian mortar pucat yang menambal celah (retak sudah menutup, bukan membuka)
  const lip = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (!c.alpha(x, y) && c.alpha(x + 1, y) && c.alpha(x, y + 1)) lip.push([x, y]);
  for (const [x, y] of lip) c.set(x, y, AV.pave[4]);
  // sisa cahaya: inti emas sangat redup, jarang dan pendek (bukan neon)
  for (const l of lines) for (let i = 0; i + 1 < l.pts.length; i += 1) { if (rand() > 0.16) continue; const [x, y] = l.pts[i]; c.set(x, y, R(GOLD, 0)); if (rand() < 0.5) c.set(x + 1, y, R(GOLD, 1)); }
  // tiga-empat serpihan paving di dekat celah (2x2)
  for (let k = 0; k < Math.round(w / 50); k++) {
    const l = lines[Math.floor(rand() * lines.length)], p = l.pts[Math.floor(rand() * l.pts.length)], x = p[0] + (rand() < 0.5 ? -3 : 3), y = p[1] + (rand() < 0.5 ? -3 : 2);
    if (x > 2 && y > 2 && x < w - 3 && y < h - 3 && !c.alpha(x, y) && !c.alpha(x + 1, y) && !c.alpha(x, y + 1) && !c.alpha(x + 1, y + 1)) { c.rect(x, y, 2, 2, AV.pave[3]); c.set(x + 1, y + 1, R(AV.pave, 1)); }
  }
  return frC(name, c);
}
export function scars() {
  return [
    scar('c4_scar_long', 220, 36, [{ pts: [[4, 12], [60, 16], [118, 22], [176, 19], [216, 26]] }, { pts: [[118, 22], [134, 32]], thin: true }], 11),
    scar('c4_scar_diag', 120, 84, [{ pts: [[6, 6], [38, 28], [66, 42], [100, 66], [114, 78]] }, { pts: [[66, 42], [90, 34]], thin: true }], 23),
    scar('c4_scar_gate', 110, 40, [{ pts: [[4, 26], [32, 22], [60, 28], [90, 18], [106, 14]] }], 37),
  ];
}

/** Batu yang sudah kembali ke tanah (dulu melayang), dengan bayangan datar tepat di bawahnya. */
function stoneRest(name, w, h, seed) {
  const c = new Canvas(w + 4, h + 8);
  c.ellipse((w + 4) / 2, h + 4, w / 2 + 1, 2.2, SHADOW, 110);
  const r = rock(w, h, seed, S, 2); c.blit(r, 1, 1);
  // retak kecil yang menutup di permukaan
  c.set(3 + (seed % 3), 3, CRACK[1]); c.set(4 + (seed % 3), 4, CRACK[1]); c.set(5 + (seed % 3), 4, CRACK[0]);
  return fr(name, c, h + 4);
}
export function stonesRest() { return [stoneRest('c4_stone_rest_a', 14, 9, 51), stoneRest('c4_stone_rest_b', 10, 7, 52), stoneRest('c4_stone_rest_c', 18, 11, 53)]; }

/** Tanah di sekitar reruntuhan: paving tertutup debu, serpihan, batu kecil, tepi menyatu ke rumput. Opak, pivot tengah. */
export function groundRuin() {
  const W = 184, Hh = 78, c = new Canvas(W, Hh), cx = W / 2, cy = Hh / 2;
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const dx = (x + 0.5 - cx) / (W / 2), dy = (y + 0.5 - cy) / (Hh / 2);
    const d = Math.hypot(dx, dy) + (vnoise(x * 0.11, y * 0.14, 5) - 0.5) * 0.35;
    if (d > 1) continue;
    if (d > 0.82 && hash(x, y, 9) < (d - 0.82) * 5) continue; // tepi menyatu dengan tanah dasar (dither)
    const n = vnoise(x * 0.35, y * 0.35, 3);
    let k = 1.2 + n * 2.2 + (d < 0.5 ? 0.6 : 0);
    if (hash(x >> 1, y >> 1, 4) > 0.9) k += 1;
    c.set(x, y, R(AV.pave, Math.round(k)));
  }
  const rand = rng(88);
  for (let k = 0; k < 46; k++) { // batu kecil (2x2) dan serpihan kayu 3x1
    const x = Math.floor(14 + rand() * (W - 28)), y = Math.floor(10 + rand() * (Hh - 20));
    if (!c.alpha(x, y) || !c.alpha(x + 2, y + 1)) continue;
    if (rand() < 0.7) { c.rect(x, y, 2, 2, R(S, 2 + Math.floor(rand() * 3))); c.set(x + 1, y + 1, R(S, 1)); } else { c.hline(x, y, 3, R(W_, 3)); c.set(x + 2, y + 1, R(W_, 1)); }
  }
  return frC('c4_ground_ruin', c);
}

/** Pecahan batu dan kayu di tanah (decal, opak). */
export function debrisDecals() {
  const mk = (name, w, h, seed) => {
    const c = new Canvas(w, h), rand = rng(seed);
    for (let k = 0; k < 6; k++) { const sp = rock(3 + Math.floor(rand() * 5), 3 + Math.floor(rand() * 3), seed * 7 + k, S, 1 + Math.floor(rand() * 3)); c.blit(sp, Math.floor(rand() * (w - sp.w)), Math.floor(rand() * (h - sp.h))); }
    for (let k = 0; k < 2; k++) { const x = Math.floor(rand() * (w - 8)), y = 3 + Math.floor(rand() * (h - 6)); c.hline(x, y, 6, R(W_, 3)); c.hline(x + 1, y + 1, 5, R(W_, 1)); }
    return frC(name, c);
  };
  return [mk('c4_debris_a', 44, 24, 5), mk('c4_debris_b', 36, 22, 6), mk('c4_debris_c', 50, 26, 7)];
}

export function propFrames() {
  return [ruinMain(), roofFallen(), bellFallen(), clockBroken(), ...rubblePiles(), ...beams(), fenceH(), barrier(), signClosed(), ...dustFrames(), ...scars(), ...stonesRest(), groundRuin(), ...debrisDecals()];
}
void H;
