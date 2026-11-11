// Prop Liora: rak jemur, sumur, gerobak, pagar, jemuran, kebun, pohon, papan petunjuk, perabot desa.
import { Canvas, hash, vnoise } from './pixel.mjs';
import { planks, bandShade, INK, R, tilePlane } from './kit.mjs';
import { drawText, textWidth } from './font.mjs';
import { crown } from './ave-props.mjs';
import { LI, lframe } from './lio-sprites.mjs';

const W = LI.wood, T = LI.thatch;
function trunk(c, cx, base, w, h, ramp = W) { for (let j = 0; j < h; j++) { const fl = j > h - 5 ? Math.floor((j - (h - 5)) / 2) + 1 : 0; for (let i = -Math.floor(w / 2) - fl; i <= Math.floor(w / 2) + fl; i++) c.set(cx + i, base - j, R(ramp, i < -w / 4 ? 3 : i > w / 4 ? 1 : 2 + (hash(i, j >> 2, 3) > 0.8 ? -1 : 0))); } }
const rail = (c, x, y, w, h = 3) => { c.rect(x, y, w, h, R(W, 3)); c.hline(x, y, w, R(W, 4)); c.hline(x, y + h - 1, w, R(W, 1)); };

/** Rak jemur A: dua rangka miring menopang papan yang disandarkan (untuk bingkai Zira). Footprint 48x32. */
export function lioRackA() {
  const c = new Canvas(60, 58), B = 54;
  for (let i = 0; i < 7; i++) { // papan bersandar, lebar dan panjang bervariasi
    const x = 6 + i * 6, h = 30 + Math.floor(hash(i, 1, 4) * 12), tone = 2 + (hash(i, 2, 4) > 0.5 ? 1 : 0);
    for (let j = 0; j < h; j++) for (let k = 0; k < 5; k++) c.set(x + k, B - 6 - j, R(LI.wood, k === 0 ? tone + 1 : k === 4 ? tone - 1 : tone + (vnoise(k * 2 + i * 7, j * 0.12, 4) > 0.65 ? -1 : 0)));
    c.hline(x, B - 6 - h, 5, R(LI.wood, 4));
  }
  for (const x of [3, 53]) { c.line(x, B, x + 2, B - 36, R(W, 1)); c.line(x + 1, B, x + 3, B - 36, R(W, 2)); c.line(x + 2, B, x + 4, B - 36, R(W, 3)); }
  rail(c, 2, B - 36, 56); rail(c, 4, B - 10, 52);
  c.outline(INK); return lframe('lio_rack_a', c, B);
}
/** Rak jemur panjang B: palang horizontal bertumpu pada tiga tiang, papan bertengger. Footprint 64x16. */
export function lioRackB() {
  const c = new Canvas(76, 50), B = 46;
  for (const x of [3, 36, 69]) { c.rect(x, B - 36, 4, 37, R(W, 2)); c.vline(x, B - 36, 37, R(W, 3)); c.vline(x + 3, B - 36, 37, R(W, 1)); }
  rail(c, 1, B - 36, 74, 4); rail(c, 1, B - 18, 74, 4);
  for (let i = 0; i < 9; i++) { const x = 8 + i * 7, tilt = i % 3 - 1; for (let j = 0; j < 26; j++) for (let k = 0; k < 5; k++) c.set(x + k + Math.round(j * tilt * 0.05), B - 8 - j, R(LI.wood, k === 0 ? 4 : k === 4 ? 2 : 3 - (hash(i, j >> 2, 9) > 0.8 ? 1 : 0))); }
  c.outline(INK); return lframe('lio_rack_b', c, B);
}
export function lioWell() {
  const c = new Canvas(64, 80), B = 76, cx = 32;
  c.ellipse(cx, B - 10, 24, 11, R(LI.stone, 1));
  for (let j = 0; j < 12; j++) for (let i = -24; i <= 24; i++) { const e = (i / 24) ** 2 + ((j - 6) / 11) ** 2; if (e <= 1 && j > 5) c.set(cx + i, B - 18 + j, R(LI.stone, hash(i >> 2, j >> 2, 7) > 0.6 ? 2 : (i < -8 ? 3 : 2) - (j > 9 ? 1 : 0))); }
  c.ellipse(cx, B - 17, 24, 9.5, (x, y) => R(LI.stone, x < cx - 10 && y < B - 17 ? 4 : 3)); c.ellipse(cx, B - 16, 18, 6, R(LI.water, 1)); c.ellipse(cx - 3, B - 16, 10, 3, R(LI.water, 2)); c.ellipse(cx - 7, B - 17, 3.5, 1, R(LI.water, 3));
  for (const x of [11, 50]) { c.rect(x, B - 62, 4, 48, R(W, 2)); c.vline(x, B - 62, 48, R(W, 3)); c.vline(x + 3, B - 62, 48, R(W, 1)); }
  c.rect(10, B - 62, 46, 4, R(W, 3)); c.hline(10, B - 62, 46, R(W, 4)); c.rect(cx - 2, B - 58, 5, 5, R(W, 1)); c.vline(cx, B - 53, 24, R(W, 4)); c.rect(cx - 3, B - 29, 7, 6, R(W, 2)); c.hline(cx - 3, B - 29, 7, R(W, 4));
  tilePlane(c, [[4, B - 62], [14, B - 78], [52, B - 78], [62, B - 62]], { ramp: LI.shingle, ch: 4, tw: 6, shift: 0, seed: 11, wood: true, y0: B - 78 }); c.line(4, B - 62, 14, B - 78, R(LI.shingle, 4)); c.hline(14, B - 78, 38, R(LI.shingle, 4)); c.hline(4, B - 62, 58, R(LI.shingle, 0));
  bandShade(c, 12, B - 60, 40, 5, LI.shadow, 80, 'down');
  c.outline(INK); return lframe('lio_well', c, B);
}
export function lioCart() {
  const c = new Canvas(72, 48), B = 44;
  planks(c, 6, B - 26, 50, 18, { ramp: W, vertical: true, bw: 5, tone: 2, seed: 17 }); c.hline(6, B - 26, 50, R(W, 4)); rail(c, 5, B - 9, 52, 2);
  for (let x = 8; x < 54; x += 7) { c.ellipse(x + 3, B - 31, 4, 3, R(T, 3)); c.hline(x, B - 30, 7, R(T, 2)); }  // muatan jerami
  c.rect(56, B - 18, 14, 3, R(W, 3)); c.hline(56, B - 18, 14, R(W, 4)); c.rect(68, B - 22, 3, 7, R(W, 2));
  c.ellipse(24, B - 8, 9, 9, R(W, 1)); c.ellipse(24, B - 8, 7, 7, R(W, 3)); c.ellipse(24, B - 8, 2, 2, R(LI.iron, 2));
  for (let a = 0; a < 4; a++) { const t = a * Math.PI / 4; c.line(Math.round(24 - Math.cos(t) * 6), Math.round(B - 8 - Math.sin(t) * 6), Math.round(24 + Math.cos(t) * 6), Math.round(B - 8 + Math.sin(t) * 6), R(W, 1)); }
  c.outline(INK); return lframe('lio_cart', c, B);
}
export function lioWoodpile() {
  const c = new Canvas(52, 36), B = 33;
  for (let row = 0; row < 4; row++) for (let i = 0; i < 6 - (row > 2 ? 1 : 0); i++) {
    const x = 4 + i * 7 + (row % 2) * 3, y = B - 7 - row * 6;
    c.ellipse(x + 3.5, y + 3, 3.6, 3.4, R(W, 2)); c.ellipse(x + 3.5, y + 3, 2.3, 2.1, R(T, 3 - (hash(i, row, 5) > 0.6 ? 1 : 0))); c.set(x + 3, y + 3, R(T, 1));
  }
  rail(c, 2, B - 1, 48, 2);
  c.outline(INK); return lframe('lio_woodpile', c, B);
}
export function lioBarrel(open) {
  const c = new Canvas(24, 32), B = 29;
  for (let j = 0; j < 24; j++) { const hw = 7 + Math.round(Math.sin((j / 23) * Math.PI) * 2); for (let i = -hw; i <= hw; i++) c.set(12 + i, B - 24 + j, R(W, i < -hw * 0.4 ? 3 : i > hw * 0.45 ? 1 : 2)); }
  for (const y of [4, 12, 20]) c.hline(4, B - 24 + y, 17, R(LI.iron, 2));
  c.ellipse(12, B - 24, 7.5, 2.5, R(W, 4)); c.ellipse(12, B - 24, 5.5, 1.8, open ? R(LI.water, 1) : R(W, 3)); if (open) c.ellipse(11, B - 24, 3, 0.8, R(LI.water, 3));
  c.outline(INK); return lframe(open ? 'lio_barrel_water' : 'lio_barrel', c, B);
}
export function lioHay() { // tumpukan jerami berbentuk kerucut dengan ikatan dan tiang tengah
  const c = new Canvas(44, 48), B = 44;
  for (let j = 0; j < 36; j++) { const t = j / 35, hw = Math.round(3 + 17 * Math.pow(t, 0.8)); for (let i = -hw; i <= hw; i++) { const band = j % 9 >= 7, k = 1.6 + vnoise(i * 0.6 + 40, j * 0.1, 3) * 1.8 + (i < -hw * 0.35 ? 0.9 : i > hw * 0.45 ? -0.9 : 0) - (band ? 1.2 : 0); c.set(22 + i, B - 36 + j, R(T, Math.round(k))); } }
  c.vline(22, B - 42, 8, R(W, 2)); c.set(22, B - 43, R(W, 3));
  for (let i = 0; i < 7; i++) c.set(6 + i * 5, B - 1 - (i % 2), R(T, 4));
  c.outline(INK); return lframe('lio_hay', c, B);
}
export function lioTrough() {
  const c = new Canvas(44, 22), B = 20;
  planks(c, 2, B - 12, 40, 12, { ramp: W, vertical: false, bw: 4, tone: 2, seed: 8 }); c.rect(2, B - 14, 40, 3, R(W, 3)); c.hline(2, B - 14, 40, R(W, 4)); c.rect(4, B - 13, 36, 2, R(LI.water, 1));
  for (const x of [4, 36]) c.rect(x, B - 2, 4, 3, R(W, 1));
  c.outline(INK); return lframe('lio_trough', c, B);
}
export function lioFence() { // pagar tiang-dan-palang 32 lebar
  const c = new Canvas(36, 26), B = 23;
  for (const x of [1, 29]) { c.rect(x, B - 17, 4, 18, R(W, 2)); c.vline(x, B - 17, 18, R(W, 3)); c.vline(x + 3, B - 17, 18, R(W, 1)); c.set(x + 1, B - 18, R(W, 4)); c.set(x + 2, B - 18, R(W, 3)); }
  rail(c, 0, B - 13, 34, 2); rail(c, 0, B - 6, 34, 2);
  c.outline(INK); return lframe('lio_fence', c, B);
}
export function lioWashline() {
  const c = new Canvas(104, 62), B = 58;
  for (const x of [3, 95]) { c.rect(x, B - 50, 4, 51, R(W, 2)); c.vline(x, B - 50, 51, R(W, 3)); c.vline(x + 3, B - 50, 51, R(W, 1)); c.rect(x - 2, B - 52, 8, 2, R(W, 3)); }
  const sag = (x) => Math.round(Math.sin(((x - 6) / 90) * Math.PI) * 6);
  for (let x = 6; x < 96; x++) c.set(x, B - 48 + sag(x), R(LI.linen, 0));
  const cloth = (x, w, h, col) => { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) { const fold = (i % 6 < 2) ? -1 : (i % 6 === 5 ? 1 : 0); c.set(x + i, B - 47 + sag(x + i) + j + (i % 6 === 3 && j === h - 1 ? 1 : 0), R(col, 1 + fold + (j > h - 3 ? -1 : 0))); } c.rect(x + 1, B - 48 + sag(x + 1), 2, 2, R(W, 3)); c.rect(x + w - 3, B - 48 + sag(x + w - 3), 2, 2, R(W, 3)); };
  cloth(12, 18, 24, LI.indigo); cloth(34, 14, 18, LI.linen); cloth(52, 20, 26, LI.madder); cloth(76, 12, 16, LI.linen);
  c.outline(INK); return lframe('lio_washline', c, B);
}
export function lioGardenA() { // bedeng kebun: kubis dan kacang di tiang
  const c = new Canvas(72, 40), B = 36;
  planks(c, 2, B - 12, 68, 12, { ramp: W, vertical: false, bw: 4, tone: 2, seed: 61 }); rail(c, 1, B - 15, 70, 3);
  c.rect(4, B - 28, 64, 14, R(LI.earth, 1)); for (let i = 0; i < 64; i += 4) c.set(5 + i, B - 26 + (i % 8 ? 3 : 0), R(LI.earth, 2));
  for (let i = 0; i < 4; i++) { const x = 8 + i * 12; c.ellipse(x + 4, B - 22, 5, 4.5, R(LI.leaf, 2)); c.ellipse(x + 3, B - 23, 3, 2.5, R(LI.grass, 3)); c.hline(x, B - 20, 9, R(LI.leaf, 1)); }
  for (const x of [58, 63]) { c.vline(x, B - 38, 14, R(W, 3)); for (let j = 0; j < 12; j += 3) c.set(x + (j % 6 ? 1 : -1), B - 36 + j, R(LI.leaf, 2)); }
  c.outline(INK); return lframe('lio_garden_a', c, B);
}
export function lioGardenB() { // bedeng bunga dan herba
  const c = new Canvas(56, 36), B = 32;
  planks(c, 2, B - 10, 52, 10, { ramp: W, vertical: false, bw: 4, tone: 2, seed: 71 }); rail(c, 1, B - 13, 54, 3);
  c.rect(4, B - 24, 48, 12, R(LI.earth, 1));
  for (let i = 0; i < 6; i++) { const x = 7 + i * 8; c.rect(x, B - 22, 5, 6, R(LI.leaf, 1 + (i % 2))); c.set(x + 2, B - 25, [LI.pink, LI.pale, LI.lav][i % 3]); c.set(x + 1, B - 24, [LI.pink, LI.pale, LI.lav][i % 3]); c.set(x + 3, B - 24, [LI.pink, LI.pale, LI.lav][(i + 1) % 3]); c.vline(x + 2, B - 23, 3, R(LI.leaf, 0)); }
  c.outline(INK); return lframe('lio_garden_b', c, B);
}
export function lioLinden() { // pohon besar peneduh (tempat berkumpul)
  const c = new Canvas(124, 132), B = 126;
  trunk(c, 62, B, 12, 40, W);
  for (const [x, y, rx, ry, s] of [[62, 42, 32, 28, 2], [34, 56, 26, 22, 3], [92, 58, 26, 22, 4], [62, 68, 38, 22, 5]]) crown(c, x, y, rx, ry, LI.grass, s, 5);
  c.outline(INK); return lframe('lio_linden', c, B);
}
export function lioApple() {
  const c = new Canvas(76, 84), B = 80;
  trunk(c, 38, B, 7, 24, W); crown(c, 38, 34, 28, 24, LI.grass, 6, 4); crown(c, 20, 44, 14, 12, LI.grass, 8, 4); crown(c, 56, 44, 14, 12, LI.grass, 9, 4);
  for (const [x, y] of [[26, 30], [44, 40], [52, 26], [34, 48], [18, 44], [58, 46]]) { c.rect(x, y, 3, 3, LI.apple); c.set(x, y, [236, 150, 120]); }
  c.outline(INK); return lframe('lio_apple', c, B);
}
export function lioFir() { // pohon cemara sisi hutan
  const c = new Canvas(64, 112), B = 108;
  trunk(c, 32, B, 6, 14, W);
  for (let t = 0; t < 5; t++) { const y0 = B - 14 - t * 17, hw = 26 - t * 4; for (let j = 0; j < 24; j++) { const w = Math.round(hw * (0.15 + 0.85 * j / 24)); for (let i = -w; i <= w; i++) { const k = 2 + (-i / (w + 1)) * 0.9 - (j / 24) * 0.4 + (hash(i >> 1, (y0 - 22 + j) >> 1, t) - 0.5) * 1.0; c.set(32 + i, y0 - 22 + j, R(LI.leaf, Math.round(k * 1.2 - 0.4))); } } }
  c.outline(INK); return lframe('lio_fir', c, B);
}
export function lioBush() { const c = new Canvas(40, 28), B = 25; crown(c, 20, 15, 17, 10, LI.grass, 19, 3); crown(c, 11, 17, 9, 7, LI.grass, 21, 3); c.outline(INK); return lframe('lio_bush', c, B); }
export function lioFern() { const c = new Canvas(30, 22), B = 20; for (let a = -3; a <= 3; a++) for (let j = 0; j < 14; j++) { const x = 15 + Math.round(a * j * 0.35), y = B - j + Math.round(Math.abs(a) * j * 0.04); c.set(x, y, R(LI.leaf, 2 - (j > 9 ? 0 : 1) + (a < 0 ? 0 : -0))); c.set(x + 1, y, R(LI.leaf, 1)); } c.outline(INK); return lframe('lio_fern', c, B); }
/** Gerbang kayu ke hutan di ujung utara jalan: dua tiang dan palang ukir dengan papan HUTAN. */
export function lioGate() {
  const c = new Canvas(104, 76), B = 72;
  for (const x of [6, 92]) { c.rect(x, B - 62, 6, 62, R(W, 2)); c.vline(x, B - 62, 62, R(W, 3)); c.vline(x + 5, B - 62, 62, R(W, 1)); c.rect(x - 1, B - 66, 8, 4, R(W, 3)); c.hline(x - 1, B - 66, 8, R(W, 4)); c.rect(x - 2, B - 3, 10, 3, R(LI.stone, 2)); }
  c.rect(2, B - 62, 100, 7, R(W, 2)); c.hline(2, B - 62, 100, R(W, 4)); c.hline(2, B - 55, 100, R(W, 0));
  for (let x = 12; x < 92; x += 8) { c.set(x, B - 59, R(W, 0)); c.set(x + 1, B - 58, R(W, 1)); c.set(x + 3, B - 60, R(W, 0)); } // ukiran sederhana
  const bw = textWidth('HUTAN') + 12, bx = 52 - bw / 2;
  c.vline(bx + 3, B - 54, 4, R(LI.linen, 0)); c.vline(bx + bw - 4, B - 54, 4, R(LI.linen, 0));
  c.rect(bx, B - 50, bw, 13, R(W, 3)); c.hline(bx, B - 50, bw, R(W, 4)); c.hline(bx, B - 38, bw, R(W, 0)); c.vline(bx + bw - 1, B - 50, 13, R(W, 1));
  drawText(c, bx + 6, B - 46, 'HUTAN', R(T, 4), R(W, 0));
  c.outline(INK); return lframe('lio_gate', c, B);
}
export function lioSignpost() { // penunjuk jalan ke Aveloria (selatan desa); papan menghadap kiri jalan
  const c = new Canvas(76, 64), B = 60;
  c.rect(60, 8, 5, B - 7, R(W, 2)); c.vline(60, 8, B - 7, R(W, 3)); c.vline(64, 8, B - 7, R(W, 1)); c.rect(58, 5, 9, 4, R(W, 3)); c.hline(58, 5, 9, R(W, 4));
  const w = textWidth('AVELORIA') + 10, x = 62 - w;
  c.rect(x, 14, w, 13, R(W, 3)); c.hline(x, 14, w, R(W, 4)); c.hline(x, 26, w, R(W, 0));
  c.poly([[x, 14], [x - 6, 20.5], [x, 27]], R(W, 3)); c.line(x, 14, x - 6, 20, R(W, 4)); c.line(x - 6, 21, x, 26, R(W, 0));
  drawText(c, x + 5, 18, 'AVELORIA', R(T, 4), R(W, 0));
  c.rect(56, B - 2, 14, 3, R(LI.stone, 2));
  c.outline(INK); return lframe('lio_signpost', c, B, 62 / 76);
}
export function lioChair() {
  const c = new Canvas(24, 36), B = 33;
  c.rect(4, B - 24, 3, 24, R(W, 2)); c.rect(17, B - 24, 3, 24, R(W, 2)); c.vline(4, B - 24, 24, R(W, 3)); rail(c, 3, B - 26, 18, 3); rail(c, 4, B - 18, 16, 2);
  c.rect(3, B - 12, 18, 4, R(W, 3)); c.hline(3, B - 12, 18, R(W, 4)); c.rect(5, B - 8, 3, 9, R(W, 1)); c.rect(16, B - 8, 3, 9, R(W, 1));
  c.rect(5, B - 11, 14, 2, R(LI.indigo, 1)); // bantalan kain di kursi
  c.outline(INK); return lframe('lio_chair', c, B);
}
export function lioStoryPost() { // tiang cerita berukir: dua alur yang saling mendekat tetapi terputus
  const c = new Canvas(28, 84), B = 80;
  for (let j = 0; j < 72; j++) for (let i = 0; i < 12; i++) c.set(8 + i, B - 72 + j + 0, R(W, i < 2 ? 4 : i > 9 ? 1 : 2 + (vnoise(i * 0.8, j * 0.1, 3) > 0.7 ? -1 : 0)));
  c.rect(6, B - 76, 16, 5, R(W, 3)); c.hline(6, B - 76, 16, R(W, 4));
  for (let j = 6; j < 60; j += 1) { const t = j / 60; const a = Math.round(2 + 4 * Math.sin(t * 6)), b = Math.round(9 - 4 * Math.sin(t * 6)); if (j % 7 !== 6) { c.set(9 + a - 2, B - 70 + j, R(W, 0)); } if ((j + 3) % 7 !== 6) c.set(9 + b, B - 70 + j, R(W, 0)); }
  c.rect(3, B - 4, 22, 5, R(LI.stone, 2)); c.hline(3, B - 4, 22, R(LI.stone, 4)); c.hline(3, B, 22, R(LI.stone, 0));
  c.outline(INK); return lframe('lio_story_post', c, B);
}
export function lioLantern() {
  const c = new Canvas(20, 66), B = 62;
  c.rect(8, 10, 4, B - 9, R(W, 2)); c.vline(8, 10, B - 9, R(W, 3)); c.vline(11, 10, B - 9, R(W, 1));
  c.rect(4, 14, 4, 2, R(W, 3)); c.rect(3, 15, 3, 10, R(LI.iron, 1)); c.rect(4, 17, 1, 6, R(T, 4));   // lentera tergantung pada lengan
  c.rect(5, 6, 10, 5, R(LI.shingle, 2)); c.hline(5, 6, 10, R(LI.shingle, 4)); c.rect(7, 4, 6, 3, R(LI.shingle, 3));
  c.rect(5, B - 2, 10, 3, R(LI.stone, 2));
  c.outline(INK); return lframe('lio_lantern', c, B);
}
export function lioBench() {
  const c = new Canvas(44, 26), B = 24;
  c.rect(2, B - 12, 40, 4, R(W, 3)); c.hline(2, B - 12, 40, R(W, 4)); c.rect(2, B - 8, 40, 2, R(W, 1));
  for (const x of [5, 36]) { c.rect(x, B - 8, 3, 9, R(W, 1)); c.vline(x, B - 8, 9, R(W, 2)); }
  c.rect(3, B - 20, 38, 3, R(W, 2)); c.hline(3, B - 20, 38, R(W, 4)); c.rect(5, B - 17, 3, 5, R(W, 1)); c.rect(36, B - 17, 3, 5, R(W, 1));
  c.outline(INK); return lframe('lio_bench', c, B);
}
export function lioChop() { // landasan potong dengan kapak
  const c = new Canvas(30, 30), B = 27;
  c.ellipse(13, B - 10, 9, 4, R(W, 4)); for (let j = 0; j < 9; j++) for (let i = -9; i <= 9; i++) if ((i / 9) ** 2 + (j / 8) ** 2 <= 1.0) c.set(13 + i, B - 10 + 2 + j, R(W, i < -3 ? 2 : 1));
  c.ellipse(13, B - 11, 7, 2.6, R(T, 3)); c.set(12, B - 11, R(T, 1)); c.set(15, B - 11, R(T, 4));
  c.line(20, B - 14, 25, B - 24, R(W, 3)); c.line(21, B - 14, 26, B - 24, R(W, 2)); c.rect(23, B - 25, 5, 4, R(LI.iron, 2)); c.hline(23, B - 25, 5, R(LI.iron, 2));
  c.outline(INK); return lframe('lio_chop', c, B);
}
export function lioPlanks() { // tumpukan papan di atas ganjal
  const c = new Canvas(56, 30), B = 27;
  for (const x of [6, 22, 40]) c.rect(x, B - 6, 5, 7, R(W, 1));
  for (let r = 0; r < 4; r++) { const y = B - 8 - r * 4; c.rect(2 + (r % 2) * 2, y, 52 - (r % 2) * 4, 4, R(W, 3 - (r % 2))); c.hline(2 + (r % 2) * 2, y, 52 - (r % 2) * 4, R(W, 4)); c.hline(2, y + 3, 52, R(W, 0)); for (let x = 10 + r * 3; x < 50; x += 17) c.vline(x, y + 1, 2, R(W, 1)); }
  c.outline(INK); return lframe('lio_planks', c, B);
}
