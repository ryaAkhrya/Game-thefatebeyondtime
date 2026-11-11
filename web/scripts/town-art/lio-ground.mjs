// Baking tanah Liora (960x704): rumput hangat, jalan tanah dengan tepi bergerigi dan bekas roda, halaman, jalan setapak, lantai hutan.
import { Canvas, hash, fbm, vnoise, mix } from './pixel.mjs';
import { LI } from './lio-sprites.mjs';
import { R } from './kit.mjs';
import { castShadows } from './shadow.mjs';

export const LIO_W = 960, LIO_H = 704;
const G = LI.grass, E = LI.earth, S = LI.stone;
const WALK = { x0: 96, y0: 96, x1: 864, y1: 648 };

const rectDist = (x, y, rx, ry, rw, rh) => { const dx = Math.max(rx - x, 0, x - (rx + rw - 1)), dy = Math.max(ry - y, 0, y - (ry + rh - 1)); if (dx === 0 && dy === 0) return -Math.min(x - rx, rx + rw - 1 - x, y - ry, ry + rh - 1 - y) - 1; return Math.hypot(dx, dy); };
const roadDist = (x, y) => Math.min(rectDist(x, y, 448, 96, 64, 552), rectDist(x, y, 96, 288, 768, 72), rectDist(x, y, 420, 280, 232, 88) + 14);
const pathDist = (x, y) => Math.min(
  rectDist(x, y, 216, 512, 20, 22), rectDist(x, y, 216, 526, 240, 14),       // SW rumah -> jalan
  rectDist(x, y, 754, 512, 20, 22), rectDist(x, y, 512, 530, 262, 14),       // SE rumah -> jalan
  rectDist(x, y, 238, 280, 24, 10), rectDist(x, y, 702, 280, 24, 10),        // pintu utara -> jalan
  rectDist(x, y, 310, 400, 110, 74),                                           // halaman jemur kayu (tanah injak)
);

function meadow(x, y, dark = 0) {
  const n = fbm(x * 0.016, y * 0.016, 3, 2);
  let k = 2.2 - dark + (n < 0.29 ? -0.8 : n > 0.74 ? 0.8 : 0);
  const cell = hash(Math.floor(x / 6), Math.floor(y / 6), 9);
  if (cell > 0.92 && (x % 6) >= 2 && (x % 6) <= 3 && (y % 6) < 3) k += 1;
  else if (cell < 0.04 && (y % 6) > 3 && (x % 6) < 3) k -= 1;
  return R(G, Math.round(k));
}
function dirt(x, y, rut) {
  let k = 2.3 + (fbm(x * 0.05, y * 0.05, 5, 2) - 0.5) * 0.9;
  if (rut) k -= 1;
  const pc = hash(Math.floor(x / 9), Math.floor(y / 9), 6);
  if (pc > 0.93 && (x % 9) < 3 && (y % 9) < 2) k += 2; else if (pc < 0.03 && (x % 9) < 2) k -= 1;   // kerikil bergerombol
  return R(E, Math.round(k));
}

export function bakeLiora(items, frames) {
  const c = new Canvas(LIO_W, LIO_H);
  for (let y = 0; y < LIO_H; y++) for (let x = 0; x < LIO_W; x++) {
    const inside = x >= WALK.x0 && x < WALK.x1 && y >= WALK.y0 && y < WALK.y1;
    // lantai hutan di luar desa: lebih gelap + serasah
    let col;
    if (!inside) {
      const dEdge = Math.max(WALK.x0 - x, x - (WALK.x1 - 1), WALK.y0 - y, y - (WALK.y1 - 1));
      col = meadow(x, y, 0.5 + Math.min(1, dEdge / 40));
      if (hash(x >> 1, y >> 1, 3) > 0.96) col = R(E, 1);
    } else col = meadow(x, y);
    // jalan: tepi bergerigi dengan transisi tanah-rumput
    const rd = roadDist(x, y), jit = (vnoise(x * 0.09, y * 0.09, 4) - 0.5) * 7;
    const rutV = (x >= 457 && x < 461) || (x >= 499 && x < 503), rutH = (y >= 302 && y < 306) || (y >= 342 && y < 346);
    if (inside && rd < jit) col = dirt(x, y, (rutV && y !== 0 && rd < -6) || (rutH && rd < -6));
    else if (inside && rd < jit + 3) col = hash(x, y, 8) > 0.45 ? R(E, 1) : R(G, 1);   // tepi aus
    // jalan setapak lebih sempit: lebih terang, rumput menipis
    if (inside && rd >= jit + 3) { const pd = pathDist(x, y), pj = (vnoise(x * 0.11, y * 0.11, 7) - 0.5) * 5; if (pd < pj) col = dirt(x, y, false); else if (pd < pj + 2.5 && hash(x, y, 2) > 0.5) col = R(E, 1); }
    c.set(x, y, col);
  }
  // lantai batu di sekitar sumur (apron) dan anak tangga rumah
  for (let y = 236; y < 290; y++) for (let x = 352; x < 436; x++) {
    const d = Math.hypot((x - 392) / 1.5, (y - 266)); if (d > 27) continue;
    const cell = hash(Math.floor((x + (Math.floor(y / 8) & 1) * 5) / 10), Math.floor(y / 8), 5);
    let k = 2 + (cell > 0.8 ? 1 : cell < 0.2 ? -1 : 0); if (y % 8 === 7 || (x + (Math.floor(y / 8) & 1) * 5) % 10 === 9) k = 0;
    if (d > 24) k -= 1; c.set(x, y, R(S, k));
  }
  for (const [x0, y0, w, h] of [[236, 280, 32, 4], [698, 280, 32, 4], [212, 512, 32, 5], [750, 512, 32, 5]]) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) c.set(x0 + i, y0 + j, R(S, 2 + (hash(i >> 3, j, 4) > 0.6 ? 1 : 0) - (i % 8 === 7 ? 2 : 0)));
  // serutan kayu dan serbuk di halaman jemur dan di bawah meja kerja
  for (const [cx, cy, rx, ry] of [[368, 450, 52, 28], [552, 346, 56, 14], [306, 480, 14, 8]]) for (let y = cy - ry; y < cy + ry; y++) for (let x = cx - rx; x < cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1 && hash(x, y, 33) > 0.9) c.set(x, y, R(LI.thatch, 3 + (hash(x, y, 1) > 0.5 ? 1 : 0)));
  // jerami berserak dekat gerobak
  for (let y = 248; y < 300; y++) for (let x = 800; x < 864; x++) if (hash(x >> 1, y, 17) > 0.93 && ((x - 836) ** 2 / 900 + (y - 276) ** 2 / 420 < 1)) c.set(x, y, R(LI.thatch, 3));
  // petak bunga liar: gugus kecil dengan warna tertentu, di halaman dan dekat pagar
  const patches = [[150, 380, 'pink'], [270, 344, 'pale'], [640, 392, 'lav'], [700, 340, 'pink'], [560, 520, 'pale'], [180, 470, 'lav'], [420, 620, 'pink'], [820, 520, 'pale'], [140, 200, 'pale'], [790, 130, 'lav']];
  for (const [fx, fy, kind] of patches) for (let k = 0; k < 9; k++) { const ox = Math.floor(hash(fx, fy + k, 1) * 28) - 14, oy = Math.floor(hash(fx + k, fy, 2) * 14) - 7; const x = fx + ox, y = fy + oy; if (roadDist(x, y) < 4) continue; c.set(x, y, LI[kind]); c.set(x, y + 1, R(LI.leaf, 1)); }
  // gigi tanah baru yang dibajak di bawah kebun (di bawah sprite petak) — jejak tanah gelap melebar sedikit
  for (const [cx, cy, rx, ry] of [[160, 626, 40, 14], [232, 632, 30, 12], [764, 606, 40, 14], [826, 638, 30, 12]]) for (let y = cy - ry; y < cy + ry; y++) for (let x = cx - rx; x < cx + rx; x++) { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d < 1 && d > 0.6 && hash(x, y, 4) > 0.5) c.set(x, y, R(E, 1)); }
  castShadows(c, items, frames, LI.shadow, { cap: (f) => (f === 'lio_linden' || f === 'lio_fir' ? 100 : 80), sx: 0.55, sy: 0.22 });
  return c;
}
