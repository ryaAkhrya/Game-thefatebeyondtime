// Baking tanah Aveloria (1280x1408): paving berpola, transisi material, dinding belakang ruang pertemuan, atap istana, bayangan jatuh.
import { Canvas, hash, fbm, vnoise, clamp, mix } from './pixel.mjs';
import { AV } from './ave-palette.mjs';
import { R, ashlar, tilePlane, windowBox, INK, bandShade } from './kit.mjs';
import { drawText, textWidth } from './font.mjs';
import { castShadows } from './shadow.mjs';

export const AVE_W = 1280, AVE_H = 1408;
const P = AV.pave, G = AV.grass, S = AV.stone, E = AV.earth;

/** pola lempeng. o:{ox,oy,sw,rh,base,seed,stag,ramp} */
function flag(x, y, o) {
  const row = Math.floor((y - o.oy) / o.rh), ry = (y - o.oy) - row * o.rh;
  const off = o.stag === false ? 0 : ((row & 1) ? o.sw >> 1 : 0) + Math.floor(hash(row, 1, o.seed) * 5);
  const col = Math.floor((x - o.ox + off) / o.sw), rx = (x - o.ox + off) - col * o.sw;
  const hv = hash(col, row, o.seed);
  let k = o.base + (hv < 0.16 ? -1 : hv > 0.86 ? 1 : 0);
  if (ry === o.rh - 1 || rx === o.sw - 1) k = o.base - 2;
  else if (ry === 0 || rx === 0) k += 1;
  else if (hv > 0.94 && rx > 3 && rx < 8 && ry > 2 && ry < o.rh - 3) k -= 1;
  return R(o.ramp ?? P, Math.round(k));
}
function cobble(x, y, o) { // batu bulat kecil bergeser
  const rh = 6, row = Math.floor(y / rh), ry = y - row * rh, off = (row & 1) * 4, col = Math.floor((x + off) / 8), rx = (x + off) - col * 8;
  const hv = hash(col, row, o.seed);
  let k = o.base + (hv < 0.2 ? -1 : hv > 0.82 ? 1 : 0);
  if (ry === rh - 1 || rx === 7) k = o.base - 2; else if (ry === 0 && rx > 0 && rx < 6) k += 1; else if (rx === 0) k += 0;
  if ((rx === 0 || rx === 6) && (ry === 0 || ry === rh - 2)) k -= 1;
  return R(o.ramp ?? P, Math.round(k));
}
function meadow(x, y) {
  const n = fbm(x * 0.014, y * 0.014, 3, 2);
  let k = 2 + (n < 0.3 ? -1 : n > 0.72 ? 1 : 0);
  const cell = hash(Math.floor(x / 6), Math.floor(y / 6), 9);
  if (cell > 0.93 && (x % 6) >= 2 && (x % 6) <= 3 && (y % 6) < 3) k += 1;    // helai rumput terang, jarang
  else if (cell < 0.04 && (y % 6) > 3 && (x % 6) < 3) k -= 1;
  return R(G, Math.round(k));
}
/** lempeng tak seragam: tinggi baris dan lebar lempeng bervariasi, dengan bevel. o:{base,seed,rh:[a,b],sw:[a,b],ramp} */
function slabs(c, x0, y0, w, h, o) {
  let y = y0, row = 0;
  while (y < y0 + h) {
    const rh = o.rh[0] + Math.floor(hash(row, 3, o.seed) * (o.rh[1] - o.rh[0] + 1)), rowH = Math.min(rh, y0 + h - y);
    let x = x0 - Math.floor(hash(row, 5, o.seed) * o.sw[0]), n = 0;
    while (x < x0 + w) {
      const sw = o.sw[0] + Math.floor(hash(row, n + 9, o.seed) * (o.sw[1] - o.sw[0] + 1)), hv = hash(row + 31, n, o.seed);
      const idx = o.base + (hv < 0.15 ? -1 : hv > 0.85 ? 1 : 0);
      for (let j = 0; j < rowH; j++) for (let i = 0; i < sw; i++) {
        const px = x + i, py = y + j; if (px < x0 || px >= x0 + w) continue;
        let k = idx;
        if (j === rowH - 1 || i === sw - 1) k = o.base - 2; else if (j === 0 || i === 0) k = idx + 1;
        else if (hv > 0.93 && i > 4 && i < 9 && j > 2 && j < 6) k = idx - 1;
        c.set(px, py, R(o.ramp ?? P, k));
      }
      x += sw; n++;
    }
    y += rh; row++;
  }
}
const paintRect = (c, x, y, w, h, fn) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) c.set(i, j, fn(i, j)); };

/** kerb batu 4px di tepi persegi (sisi: 'n','s','e','w') */
function kerb(c, x, y, w, h, sides, tone = 4) {
  const draw = (rx, ry, rw, rh, light) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) { const joint = ((rw > rh ? i : j) % 12) === 11; c.set(rx + i, ry + j, joint ? R(S, 2) : R(S, light(i, j))); } };
  if (sides.includes('n')) draw(x, y, w, 4, (i, j) => (j === 0 ? tone + 1 : j === 3 ? tone - 2 : tone));
  if (sides.includes('s')) draw(x, y + h - 4, w, 4, (i, j) => (j === 0 ? tone + 1 : j === 3 ? tone - 2 : tone - 1));
  if (sides.includes('w')) draw(x, y, 4, h, (i, j) => (i === 0 ? tone + 1 : i === 3 ? tone - 2 : tone));
  if (sides.includes('e')) draw(x + w - 4, y, 4, h, (i, j) => (i === 0 ? tone : i === 3 ? tone - 3 : tone - 1));
}
function fringe(c, x, y, w, h, sides, seed) { // transisi: tepi paving yang pecah ke rumput/tanah
  for (const s of sides) {
    for (let t = 0; t < (s === 'n' || s === 's' ? w : h); t++) {
      const depth = 1 + Math.floor(hash(t >> 1, s.charCodeAt(0), seed) * 3);
      for (let d = 0; d < depth; d++) {
        const px = s === 'w' ? x - 1 - d : s === 'e' ? x + w + d : x + t, py = s === 'n' ? y - 1 - d : s === 's' ? y + h + d : y + t;
        c.set(px, py, d === 0 ? R(E, 1 + (hash(t, d, seed) > 0.6 ? 1 : 0)) : R(G, 1));
      }
    }
  }
}

/** persegi tembok sisi (puncak dinding) untuk batas kota */
function wallTop(c, x, y, w, h, seed) {
  paintRect(c, x, y, w, h, (i, j) => { const k = 4 - ((j - y) % 12 === 11 ? 1 : 0) - ((i - x) % 14 === 0 ? 1 : 0); return R(S, k); });
  if (w > h) { c.hline(x, y, w, R(S, 5)); c.hline(x, y + h - 1, w, R(S, 1)); } else { c.vline(x, y, h, R(S, 5)); c.vline(x + w - 1, y, h, R(S, 1)); }
}

function roofPlane(c, x, y, w, h, vertical, seed) { // atap istana dilihat dari atas, bubungan di tengah
  const mid = vertical ? x + w / 2 : y + h / 2;
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    const d = vertical ? i - mid : j - mid;
    const shift = vertical ? (d < 0 ? 1 : -1) : (d < 0 ? 0.4 : -0.6);
    const along = vertical ? j : i, across = vertical ? i : j;
    const ch = 6, tw = 8, row = Math.floor((vertical ? (across - x) : (across - y)) / ch), within = (vertical ? (across - x) : (across - y)) - row * ch;
    const off = (row % 2) * 4, col = Math.floor((along + off) / tw), cx = (along + off) - col * tw;
    const hv = hash(col, row, seed);
    let k = 2 + shift + (hv < 0.1 ? -1 : hv > 0.9 ? 1 : 0);
    if (within === ch - 1) k -= 2; else if (within === 0) k += 1; if (cx === 0) k -= 1;
    c.set(i, j, R(AV.slate, Math.round(k)));
  }
  // bubungan
  if (vertical) { c.rect(Math.round(mid) - 2, y, 4, h, R(AV.slate, 4)); c.vline(Math.round(mid) - 2, y, h, R(AV.slate, 5)); c.vline(Math.round(mid) + 1, y, h, R(AV.slate, 1)); }
  else { c.rect(x, Math.round(mid) - 2, w, 4, R(AV.slate, 4)); c.hline(x, Math.round(mid) - 2, w, R(AV.slate, 5)); c.hline(x, Math.round(mid) + 1, w, R(AV.slate, 1)); }
}

function wallFace(c, x, y, w, h, seed) { // sisi selatan sayap istana (dibaking, tak bisa dijalani)
  ashlar(c, x, y, w, h, { ramp: S, tone: 3, ch: 7, bw: [14, 22], seed });
  c.rect(x, y, w, 6, R(S, 4)); c.hline(x, y, w, R(S, 5)); c.hline(x, y + 5, w, R(S, 1));
  for (let i = 2; i < w; i += 6) c.rect(x + i, y + 6, 3, 3, R(S, 2));
  c.rect(x, y + h - 7, w, 8, R(S, 2)); c.hline(x, y + h - 7, w, R(S, 4));
  for (let wx = x + 20; wx < x + w - 20; wx += 36) {
    c.rect(wx - 3, y + 14, 20, 35, R(S, 4)); windowBox(c, wx, y + 17, 14, 30, { frame: AV.wood, glass: AV.glass, arch: true, sill: false });
    c.rect(wx - 4, y + 49, 22, 3, R(S, 5));
  }
  bandShade(c, x, y + 8, w, 6, AV.shadow, 90, 'down');
}

export function bakeAveloria(items, frames) {
  const c = new Canvas(AVE_W, AVE_H);
  paintRect(c, 0, 0, AVE_W, AVE_H, meadow);

  // ---------- atap istana (latar belakang ruang pertemuan) ----------
  roofPlane(c, 224, 0, 216, 392, true, 21); roofPlane(c, 840, 0, 216, 392, true, 22); roofPlane(c, 440, 0, 400, 44, false, 23);
  wallFace(c, 224, 384, 216, 64, 31); wallFace(c, 840, 384, 216, 64, 32);
  for (const x of [224, 1040]) { c.rect(x, 0, 16, 392, R(S, 3)); }
  // talang batu di pertemuan atap dan ruang pertemuan
  for (const [x, y, w, h] of [[432, 44, 8, 340], [840, 44, 8, 340]]) paintRect(c, x, y, w, h, (i, j) => R(S, i - x < 2 ? 4 : i - x > 5 ? 2 : 3));

  // ---------- ruang pertemuan (cutaway): lantai, dinding belakang, jendela, berkas cahaya ----------
  const hx = 448, hy = 128, hw = 384, hh = 320;
  paintRect(c, hx, hy, hw, hh, (x, y) => { const gx = Math.floor((x - hx) / 32), gy = Math.floor((y - hy) / 32); return flag(x, y, { ox: hx, oy: hy, sw: 32, rh: 32, base: ((gx + gy) & 1) ? 1.6 : 2.4, seed: 41, ramp: S, stag: false }); });
  // pita tepi lantai
  paintRect(c, hx, hy, hw, 8, (x, y) => R(S, 2 + (y - hy > 5 ? -1 : 0)));
  // dinding belakang y 40..128
  ashlar(c, 440, 40, 400, 88, { ramp: S, tone: 3, ch: 8, bw: [16, 26], seed: 51 });
  // wainscot kayu di bawah
  paintRect(c, 440, 100, 400, 28, (x, y) => R(AV.wood, (y - 100) < 2 ? 3 : (x % 20 < 2 ? 0 : 1 + (hash(Math.floor(x / 20), 2, 6) > 0.7 ? 1 : 0))));
  c.hline(440, 100, 400, R(AV.wood, 4)); c.hline(440, 99, 400, R(AV.wood, 1));
  c.rect(440, 40, 400, 6, R(S, 4)); c.hline(440, 40, 400, R(S, 5)); c.hline(440, 45, 400, R(S, 1));
  // tiga jendela tinggi dan spanduk di antara
  const win = (cx, w, h, y) => {
    c.rect(cx - w / 2 - 4, y - 4, w + 8, h + 6, R(S, 4)); c.vline(cx - w / 2 - 4, y - 4, h + 6, R(S, 5)); c.vline(cx + w / 2 + 3, y - 4, h + 6, R(S, 2));
    windowBox(c, cx - w / 2, y, w, h, { frame: AV.wood, glass: AV.glass, arch: true, sill: false, mullion: true });
    c.rect(cx - w / 2 - 5, y + h + 2, w + 10, 3, R(S, 5)); c.hline(cx - w / 2 - 5, y + h + 4, w + 10, R(S, 2));
  };
  win(520, 20, 40, 52); win(640, 28, 44, 48); win(760, 20, 40, 52);
  for (const bx of [572, 696]) { c.rect(bx, 56, 14, 38, R(AV.plum, 2)); c.vline(bx, 56, 38, R(AV.plum, 3)); c.vline(bx + 13, 56, 38, R(AV.plum, 1)); c.rect(bx - 1, 54, 16, 2, R(AV.wood, 3)); for (let t = 0; t < 6; t++) { c.set(bx + 4, 62 + t * 4, AV.rose); c.set(bx + 9, 64 + t * 4, AV.lime); } for (let k = 0; k < 4; k++) { c.set(bx + 3 + k * 3, 94 + (k % 2), R(AV.plum, 2)); } }
  bandShade(c, 440, 46, 400, 10, AV.shadow, 80, 'down');
  // dinding sisi (puncak + muka dalam)
  for (const x of [432, 832]) { paintRect(c, x, 104, 16, 344, (i, j) => R(S, (i - x < 3 ? 4 : i - x > 12 ? 2 : 3) - (((j - 104) % 14 === 13) ? 1 : 0))); }
  c.hline(440, 128, 8, R(S, 1)); // sambungan
  // berkas cahaya jatuh miring dari tiga jendela (bentuk keras, bukan glow)
  const shaft = (x0, w, len, slope, tone) => {
    for (let j = 0; j < len; j++) for (let i = 0; i < w; i++) {
      const x = Math.round(x0 + i + j * slope), y = 128 + j; if (y >= 384) continue;
      const bar = (i % 10 === 4) || (j % 24 === 12 && false); // kisi jendela membagi berkas
      const col = c.get(x, y); if (!col) continue;
      if (!bar) c.set(x, y, [clamp(col[0] + tone, 0, 255), clamp(col[1] + tone, 0, 255), clamp(col[2] + tone - 4, 0, 255)]);
    }
  };
  shaft(512, 20, 150, 0.55, 30); shaft(626, 28, 190, 0.55, 26); shaft(752, 20, 150, 0.55, 30);
  // karpet panjang plum dari pintu ke meja
  const rug = (x0, x1, y0, y1) => paintRect(c, x0, y0, x1 - x0, y1 - y0, (x, y) => {
    const e = Math.min(x - x0, x1 - 1 - x), f = (y - y0);
    if (e < 2) return R(AV.plum, 3); if (e < 4) return R(AV.plum, 1);
    if (e < 8) return R(AV.plum, (x + y) % 8 < 4 ? 2 : 1);
    const mid = Math.abs(x - (x0 + x1) / 2);
    if (mid < 1 && (y % 8) < 5) return AV.rose; if (mid >= 1 && mid < 3 && ((y + 3) % 8) < 5 && false) return AV.lime;
    return R(AV.plum, 2 + (hash(x >> 2, y >> 2, 3) > 0.9 ? 1 : 0));
  });
  rug(600, 680, 216, 448);
  // dua garis putus pada karpet (mawar dan hijau-muda, hampir bertemu di tengah)
  for (let y = 226; y < 440; y += 8) { c.set(636, y, AV.rose); c.set(636, y + 1, AV.rose); c.set(643, y + 4, AV.lime); c.set(643, y + 5, AV.lime); }
  c.hline(600, 448, 80, R(AV.plum, 0));
  // lorong vestibule di bawah fasad (gelap, berkarpet)
  paintRect(c, 600, 384, 80, 64, (x, y) => { const e = Math.min(x - 600, 679 - x); const col = e < 3 ? R(AV.plum, 1) : R(AV.plum, 0 + (hash(x >> 2, y >> 2, 4) > 0.9 ? 1 : 0)); return col; });
  // bayangan jendela belakang pada lantai tidak dipakai; pita bayangan dinding belakang
  bandShade(c, hx, hy, hw, 10, AV.shadow, 70, 'down');

  // ---------- halaman istana ----------
  paintRect(c, 448, 448, 384, 224, (x, y) => {
    const border = x < 464 || x >= 816 || y >= 656;
    if (border) return flag(x, y, { ox: 448, oy: 448, sw: 32, rh: 8, base: 2, seed: 61, ramp: P });
    const gx = Math.floor((x - 464) / 32), gy = Math.floor((y - 448) / 32);
    return flag(x, y, { ox: 464, oy: 448, sw: 32, rh: 32, base: ((gx + gy) & 1) ? 2 : 3, seed: 62, ramp: P, stag: false });
  });
  // tembok halaman (puncak dinding) kiri-kanan
  wallTop(c, 432, 448, 16, 224, 1); wallTop(c, 832, 448, 16, 224, 2);
  for (const x of [428, 832]) for (let y = 460; y < 660; y += 48) { c.rect(x, y, 20, 12, R(S, 4)); c.hline(x, y, 20, R(S, 5)); c.hline(x, y + 11, 20, R(S, 1)); }
  // taman samping halaman (di balik tembok): tanah olahan dan petak
  for (const [gx0, gx1] of [[128, 432], [848, 1152]]) {
    paintRect(c, gx0, 448, gx1 - gx0, 192, meadow);
  }
  // ---------- tembok batas plaza di sisi utara (muka selatan menghadap plaza) ----------
  for (const [x0, x1] of [[128, 448], [832, 1152]]) {
    ashlar(c, x0, 616, x1 - x0, 24, { ramp: S, tone: 3, ch: 6, bw: [14, 22], seed: 71 + x0 });
    c.rect(x0, 610, x1 - x0, 6, R(S, 4)); c.hline(x0, 610, x1 - x0, R(S, 5)); c.hline(x0, 615, x1 - x0, R(S, 1));
    for (let x = x0 + 24; x < x1 - 8; x += 64) { c.rect(x, 600, 12, 40, R(S, 3)); c.vline(x, 600, 40, R(S, 4)); c.vline(x + 11, 600, 40, R(S, 1)); c.rect(x - 1, 598, 14, 4, R(S, 4)); c.hline(x - 1, 598, 14, R(S, 5)); }
    bandShade(c, x0, 616, x1 - x0, 5, AV.shadow, 80, 'down');
  }
  // tembok sisi barat dan timur kota
  wallTop(c, 108, 640, 20, 536, 3); wallTop(c, 1152, 640, 20, 536, 4);
  for (const x of [104, 1152]) for (let y = 656; y < 1170; y += 64) { c.rect(x, y, 24, 14, R(S, 4)); c.hline(x, y, 24, R(S, 5)); c.hline(x, y + 13, 24, R(S, 1)); }

  // ---------- plaza ----------
  slabs(c, 128, 640, 1024, 544, { base: 2, seed: 81, rh: [14, 20], sw: [20, 34], ramp: P });
  // pasar: batu bulat hangat, jalur tanah yang aus menuju kios
  paintRect(c, 128, 800, 320, 216, (x, y) => cobble(x, y, { base: 1.6, seed: 91, ramp: P }));
  for (let y = 800; y < 1016; y++) for (let x = 128; x < 448; x++) { const w = fbm(x * 0.05, y * 0.05, 14, 2); if (w < 0.27) c.set(x, y, mix(c.get(x, y), R(E, 1), 0.3)); }
  // tepi pasar: batas lempeng ke batu bulat
  for (let x = 128; x < 448; x++) { c.set(x, 800, R(S, 2)); }
  // jalan utama
  const avenue = (x0, x1, y0, y1, seed) => {
    slabs(c, x0, y0, x1 - x0, y1 - y0, { base: 3, seed, rh: [14, 18], sw: [32, 48], ramp: P });
    kerb(c, x0, y0, x1 - x0, y1 - y0, 'we');
  };
  avenue(584, 696, 672, 1176, 101); avenue(600, 680, 448, 672, 102);
  // dua garis putus pada jalan (motif Aveloria): nada plum-abu, hampir bertemu di tengah plaza
  for (const [xl, xr] of [[622, 658]]) for (let y = 690; y < 1170; y += 12) { if (y > 880 && y < 930) continue; c.hline(xl, y, 7, R(AV.plum, 1), 160); c.hline(xr - 7, y + 6, 7, R(AV.plum, 1), 160); }
  // medalion plaza (cincin batu) di perpotongan jalan
  const mcx = 640, mcy = 905;
  for (let y = mcy - 62; y <= mcy + 62; y++) for (let x = mcx - 80; x <= mcx + 80; x++) {
    const d = Math.hypot((x - mcx) / 1.2, (y - mcy)); const ang = Math.atan2(y - mcy, (x - mcx) / 1.2);
    if (d > 58 || d < 0) continue;
    if (d > 52) c.set(x, y, R(S, d > 56 ? 2 : 4 - (Math.floor(ang * 16 / Math.PI) % 2 === 0 ? 0 : 1)));
    else if (d > 46) c.set(x, y, R(P, 1));
    else if (d < 6) c.set(x, y, R(S, 4));
    else if (d > 24 && d < 26) c.set(x, y, R(S, 2));
    else c.set(x, y, R(P, 2 + (((Math.floor(d / 8)) & 1) ? 0 : 0)));
  }
  // jalur ke tiga bangunan: bahan lebih terang di depan arsip (terasnya) tidak perlu; bayangan pintu rumah
  // ---------- gerbang: lorong, jalan selatan, rumput ----------
  paintRect(c, 128, 1176, 1024, 8, (x, y) => R(S, 2 - (y === 1183 ? 1 : 0) + (y === 1176 ? 1 : 0) - ((x % 18) === 0 ? 1 : 0)));
  paintRect(c, 576, 1104, 128, 80, (x, y) => flag(x, y, { ox: 576, oy: 1104, sw: 32, rh: 16, base: 1.5, seed: 111, ramp: P }));
  for (let y = 1104; y < 1180; y++) for (let x = 576; x < 704; x++) { const a = 0.55 * Math.max(0, 1 - Math.abs(y - 1138) / 40); const edge = Math.min(x - 576, 703 - x) < 6 ? 0.15 : 0; const col = c.get(x, y); c.set(x, y, mix(col, AV.shadow, Math.min(0.7, a + edge))); }
  slabs(c, 592, 1184, 96, 52, { base: 2, seed: 121, rh: [10, 14], sw: [18, 28], ramp: P });
  kerb(c, 592, 1184, 96, 52, 'we', 3);
  for (let y = 1236; y < 1376; y++) {
    const jl = Math.floor(vnoise(y * 0.08, 1, 5) * 4), jr = Math.floor(vnoise(y * 0.08, 9, 6) * 4);
    for (let x = 592; x < 688; x++) {
      if (x < 592 + jl || x >= 688 - jr) { c.set(x, y, hash(x, y >> 1, 4) > 0.5 ? R(E, 1) : R(G, 1)); continue; }
      const rut = (x >= 614 && x < 619) || (x >= 661 && x < 666);
      let k = 2 + (rut ? -1 : 0) + (vnoise(x * 0.1, y * 0.06, 8) > 0.72 ? 1 : 0) + (hash(x >> 1, y >> 1, 17) > 0.94 ? 1 : 0);
      c.set(x, y, R(E, Math.round(k)));
    }
  }
  for (let y = 1236; y < 1376; y += 3) for (const x of [590, 689]) if (hash(x, y, 3) > 0.4) { c.set(x + (x < 600 ? 0 : 0), y, R(G, 3)); c.set(x + (x < 600 ? -1 : 1), y + 1, R(G, 3)); }
  // bunga liar di tepi jalan selatan (gugus kecil, bukan taburan)
  const flowers = [[570, 1290], [548, 1330], [734, 1300], [756, 1350], [520, 1250], [770, 1255]];
  for (const [fx, fy] of flowers) for (let k = 0; k < 6; k++) { const ox = Math.floor(hash(fx, fy + k, 1) * 18) - 9, oy = Math.floor(hash(fx + k, fy, 2) * 10) - 5; c.set(fx + ox, fy + oy, k % 3 === 0 ? AV.rose : AV.cream); c.set(fx + ox, fy + oy + 1, R(G, 1)); }

  castShadows(c, items, frames, AV.shadow, { cap: (f) => (f === 'ave_tower' ? 120 : 90) });
  return c;
}
